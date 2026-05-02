import "dotenv/config";
import express, { type Express } from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerStripeWebhook } from "./stripeWebhook";
import { registerLobWebhook } from "./lobWebhook";
import { registerAuthRoutes } from "./supabaseAuth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic } from "./vite";
import {
  getActivityLogsBySubmission,
  getDb,
  findStuckAnalysisSubmissions,
  updatePropertySubmission,
  countPendingFilingJobs,
  getLastFilingJobCompletedAt,
  getPropertySubmissionById,
} from "../db";
import { cleanupOldQueues } from "./sseBroadcaster";
import { globalLimiter, authLimiter, apiLimiter } from "./rateLimiter";
import { checkRateLimit } from "./rateLimit";
import { scopedLogger } from "./logger";

const log = scopedLogger("Server");

// In-memory SSE clients for real-time analysis streaming
const sseClients = new Map<number, express.Response[]>();

// Periodic cleanup of old SSE queues — only meaningful in a long-running
// process (local dev / self-host). Skip in Vercel serverless functions.
if (process.env.VERCEL !== "1") {
  setInterval(() => cleanupOldQueues(), 5 * 60 * 1000);
}

/**
 * Fail-fast validation of critical env vars. In production we refuse to
 * boot when any required secret is missing — better a crash-loop caught by
 * the platform than a subtly broken service that silently 500s every
 * request. In dev we warn but allow startup so local iteration isn't
 * blocked by, e.g., not having a Stripe key.
 */
function validateEnvOrExit() {
  const required = ["DATABASE_URL", "JWT_SECRET", "SUPABASE_URL", "SUPABASE_ANON_KEY", "ANTHROPIC_API_KEY"];
  const productionOnly = ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"];
  const missing = required.filter((k) => !process.env[k]);
  const missingProd =
    process.env.NODE_ENV === "production"
      ? productionOnly.filter((k) => !process.env[k])
      : [];
  const all = [...missing, ...missingProd];
  if (all.length === 0) return;
  const msg = `[Startup] Missing required environment variables: ${all.join(", ")}`;
  if (process.env.NODE_ENV === "production") {
    console.error(msg);
    process.exit(1);
  }
  console.warn(`${msg} (non-production: continuing, but requests will fail)`);
}

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

/**
 * Build the Express application with all routes registered.
 * Reusable from both the local long-running server and a Vercel serverless
 * function entrypoint. Does NOT call `listen()` or start background timers.
 */
export async function createApp(): Promise<Express> {
  const app = express();
  app.set('trust proxy', 1);

  // Stripe + Lob webhooks must be registered before the JSON body parser so
  // signature verification receives the original raw payload bytes.
  registerStripeWebhook(app);
  registerLobWebhook(app);

  // Supabase Auth (replaces Manus OAuth)
  try {
    registerAuthRoutes(app);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[Auth] Auth routes not registered: ${msg}`);
    // Register stub routes so callers get a clear 503 instead of a 404
    app.get("/api/auth/login", (_req, res) => res.status(503).json({ error: "Auth not configured" }));
    app.get("/api/auth/callback", (_req, res) => res.status(503).json({ error: "Auth not configured" }));
    app.post("/api/auth/logout", (_req, res) => res.json({ ok: true }));
  }

  // Liveness: cheap check that the Node process is responsive. Use this for
  // "is the pod alive" probes — no DB round-trip.
  app.get("/healthz", (_req, res) => {
    res.json({ ok: true, uptime: process.uptime() });
  });

  // Readiness: does the app have what it needs to serve traffic? Includes a
  // DB ping with a 2s timeout. Load balancers should use /readyz so a pod
  // whose DB connection has died gets pulled out of rotation instead of
  // returning 500s to users.
  app.get("/readyz", async (_req, res) => {
    try {
      const db = await Promise.race([
        getDb(),
        new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error("db timeout")), 2000)
        ),
      ]);
      if (!db) {
        return res.status(503).json({ ok: false, reason: "db_unavailable" });
      }

      // Pipeline staleness: if there are pending filing jobs but nothing
      // has completed in the last 15 minutes, the queue worker is wedged
      // (Playwright crashed, Lob outage, etc.). Fail readiness so the
      // platform pulls us out of rotation and restarts.
      const pendingFiling = await countPendingFilingJobs();
      if (pendingFiling > 0) {
        const lastCompleted = await getLastFilingJobCompletedAt();
        const stalledMs = Date.now() - (lastCompleted?.getTime() ?? 0);
        if (stalledMs > 15 * 60 * 1000) {
          return res.status(503).json({
            ok: false,
            reason: "filing_queue_stalled",
            pendingFilingJobs: pendingFiling,
            lastCompletedAt: lastCompleted?.toISOString() ?? null,
            stalledMs,
          });
        }
      }

      res.json({ ok: true, pendingFilingJobs: pendingFiling });
    } catch (err) {
      res.status(503).json({
        ok: false,
        reason: err instanceof Error ? err.message : "unknown",
      });
    }
  });

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // ── Rate limiting ────────────────────────────────────────────────────────
  // Global: 100 req / 15 min per IP (all routes)
  app.use(globalLimiter);
  // Auth: 5 req / 15 min per IP (brute-force protection)
  app.use("/api/auth", authLimiter);
  // API: 50 req / min per user or IP (tRPC)
  app.use("/api/trpc", apiLimiter);

  // ── SSE: Real-time analysis status streaming ─────────────────────────────
  app.get("/api/stream/analysis/:submissionId", async (req, res) => {
    const submissionId = parseInt(req.params.submissionId);
    if (isNaN(submissionId)) {
      res.status(400).json({ error: "Invalid submission ID" });
      return;
    }

    // Authenticate the request — SSE carries the same session cookie as tRPC.
    // Unauthenticated callers and callers who don't own the submission are
    // rejected before any data is streamed.
    let user: import("../../drizzle/schema.pg").User | null = null;
    try {
      const { getUserFromRequest } = await import("./context");
      user = await getUserFromRequest(req);
    } catch {
      user = null;
    }
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    // Ownership: admin users can stream any submission; regular users only
    // their own (matched by email on the submission row).
    if (user.role !== "admin") {
      const submission = await getPropertySubmissionById(submissionId);
      if (!submission || submission.email !== user.email) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
    }

    // Rate-limit authenticated SSE connections: 10 new connections per user per
    // minute prevents runaway polling loops from overwhelming the server.
    const rateLimitExceeded = checkRateLimit(
      { headers: req.headers as Record<string, string | string[] | undefined>, ip: req.ip, socket: req.socket, userId: user.id },
      { scope: "sse.analysis", max: 10, windowMs: 60_000 }
    );
    if (rateLimitExceeded) {
      res.status(429).json({ error: "Too many connections. Please wait before reconnecting." });
      return;
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Send initial connection ack
    res.write(`event: connected\ndata: ${JSON.stringify({ submissionId, status: "connected" })}\n\n`);

    // Register client
    if (!sseClients.has(submissionId)) {
      sseClients.set(submissionId, []);
    }
    sseClients.get(submissionId)!.push(res);

    // Send current logs immediately
    const logs = await getActivityLogsBySubmission(submissionId);
    res.write(`event: logs\ndata: ${JSON.stringify({ logs })}\n\n`);

    // Heartbeat to keep connection alive
    const heartbeat = setInterval(() => {
      res.write(`event: heartbeat\ndata: {}\n\n`);
    }, 15000);

    req.on("close", () => {
      clearInterval(heartbeat);
      const clients = sseClients.get(submissionId);
      if (clients) {
        const idx = clients.indexOf(res);
        if (idx > -1) clients.splice(idx, 1);
        if (clients.length === 0) sseClients.delete(submissionId);
      }
    });
  });

  // Places autocomplete endpoint — public, so rate-limit per IP to prevent
  // the Forge/Google quota from being scraped.
  const autocompleteBuckets = new Map<string, { count: number; windowStart: number }>();
  const AUTOCOMPLETE_MAX = 60;
  const AUTOCOMPLETE_WINDOW_MS = 60_000;
  app.post("/api/places-autocomplete", async (req, res) => {
    try {
      const forwarded = req.headers["x-forwarded-for"];
      const ip =
        (typeof forwarded === "string" && forwarded.split(",")[0].trim()) ||
        (Array.isArray(forwarded) && forwarded[0]) ||
        req.ip ||
        req.socket.remoteAddress ||
        "unknown";
      const now = Date.now();
      const bucket = autocompleteBuckets.get(ip);
      if (!bucket || now - bucket.windowStart >= AUTOCOMPLETE_WINDOW_MS) {
        autocompleteBuckets.set(ip, { count: 1, windowStart: now });
      } else if (bucket.count >= AUTOCOMPLETE_MAX) {
        return res.status(429).json({ predictions: [] });
      } else {
        bucket.count += 1;
      }

      const input = typeof req.body?.input === "string" ? req.body.input : "";
      const sessionToken =
        typeof req.body?.sessionToken === "string"
          ? req.body.sessionToken
          : undefined;
      if (input.length < 3) {
        return res.json({ predictions: [] });
      }
      const { getPlacePredictions } = await import("./placesAutocomplete");
      const predictions = await getPlacePredictions(input, { sessionToken });
      res.json({ predictions });
    } catch (error) {
      console.error("[Places Autocomplete Error]", error);
      res.json({ predictions: [] });
    }
  });

  // Street View capture endpoint — async, non-blocking
  app.post("/api/capture-street-view", async (req: any, res: any) => {
    try {
      const address = typeof req.body?.address === "string" ? req.body.address : "";
      if (!address) {
        return res.status(400).json({ error: "Address required" });
      }
      // Fire and forget — don't block the response
      const { captureStreetView } = await import("./streetViewCapture");
      captureStreetView({ address }).catch((err: any) => {
        console.error("[StreetViewCapture] Background capture failed:", err);
      });
      res.json({ status: "queued" });
    } catch (error) {
      console.error("[Street View Capture Error]", error);
      res.json({ status: "queued" });
    }
  });

  // Geocode address → structured components (city, county, state, zip)
  // Used by the frontend to auto-fill form fields after autocomplete selection
  app.post("/api/geocode-address", async (req: any, res: any) => {
    try {
      const address = typeof req.body?.address === "string" ? req.body.address : "";
      if (!address) {
        return res.status(400).json({ error: "Address required" });
      }
      const { geocodeAddress } = await import("./streetViewCapture");
      const result = await geocodeAddress(address);
      res.json({ result });
    } catch (error) {
      console.error("[Geocode Address Error]", error);
      res.json({ result: null });
    }
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  return app;
}

async function startServer() {
  validateEnvOrExit();

  const app = await createApp();
  const server = createServer(app);

  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    // String concat hides this from esbuild's static analyzer so the
    // dev-only vite middleware (and its plugin tree: lightningcss,
    // tailwind, etc.) never gets pulled into the production bundle.
    const devVitePath = "./devVite";
    const { setupVite } = await import(devVitePath);
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });

  // Track intervals so we can clear them on shutdown.
  const intervals: NodeJS.Timeout[] = [];

  // Start Lob reconciliation (catches missed webhooks)
  try {
    const { buildReconciliationInterval } = await import(
      "../services/lobReconciliation"
    );
    buildReconciliationInterval({ intervalMs: 30 * 60 * 1000, batchSize: 25 })();
  } catch (err) {
    console.warn("[LobReconcile] Failed to initialize", err);
  }

  // Recovery sweep: any submission stuck in "analyzing" for >10 min is the
  // residue of a crash mid-pipeline. Reset it to "pending" and re-queue so
  // the analysis pipeline picks it back up. The activeJobs in-memory Set
  // is also lost on crash, so we don't need to worry about double-running.
  try {
    const stuck = await findStuckAnalysisSubmissions(10 * 60 * 1000);
    if (stuck.length > 0) {
      console.log(`[Startup] Recovering ${stuck.length} stuck analysis submission(s)`);
      const { queueAnalysisJob } = await import("../services/analysisJob");
      for (const s of stuck) {
        await updatePropertySubmission(s.id, { status: "pending" });
        queueAnalysisJob(s.id);
      }
    }
  } catch (err) {
    console.warn("[Startup] Stuck-job recovery sweep failed:", err);
  }

  // Start filing job processor (Playwright / mail dispatcher)
  try {
    const { processPendingFilingJobs } = await import(
      "../services/filingJobQueue"
    );
    intervals.push(setInterval(async () => {
      try {
        await processPendingFilingJobs(2);
      } catch (err) {
        log.error("FilingQueue processing error", { err: (err as Error).message });
      }
    }, 30 * 1000));
  } catch (err) {
    log.warn("FilingQueue failed to initialize", { err: (err as Error).message });
  }

  // Start filing artifact retention cleanup (daily)
  try {
    const { buildCleanupInterval } = await import(
      "../services/filingCleanup"
    );
    buildCleanupInterval()();
  } catch (err) {
    log.warn("FilingCleanup failed to initialize", { err: (err as Error).message });
  }

  // Start filing deadline reminder cron (daily)
  try {
    const { buildDeadlineReminderInterval } = await import(
      "../services/deadlineReminders"
    );
    buildDeadlineReminderInterval()();
  } catch (err) {
    log.warn("DeadlineReminders failed to initialize", { err: (err as Error).message });
  }

  // Start report job processor
  try {
    const { processPendingReportJobs } = await import("../services/reportJobQueue");
    const { cleanupExpiredReportJobs } = await import("../db");

    // Process pending jobs immediately on startup
    processPendingReportJobs(5).then((count) => {
      if (count > 0) log.info(`ReportQueue: processing ${count} pending job(s) on startup`, { count });
    }).catch((err) => log.error("ReportQueue startup error", { err: (err as Error).message }));

    // Cleanup expired jobs every 5 minutes
    intervals.push(setInterval(async () => {
      try {
        const cleaned = await cleanupExpiredReportJobs();
        if (cleaned > 0) log.info("ReportQueue: cleaned up expired jobs", { count: cleaned });
      } catch (err) {
        log.error("ReportQueue cleanup error", { err: (err as Error).message });
      }
    }, 5 * 60 * 1000));

    // Process pending jobs every 30 seconds
    intervals.push(setInterval(async () => {
      try {
        await processPendingReportJobs(3);
      } catch (err) {
        log.error("ReportQueue processing error", { err: (err as Error).message });
      }
    }, 30 * 1000));
  } catch (err) {
    log.warn("ReportQueue failed to initialize report job processor", { err: (err as Error).message });
  }

  // Graceful shutdown. On SIGTERM (normal deploy) and SIGINT (Ctrl+C),
  // stop the cron intervals, refuse new connections, let in-flight requests
  // finish, and exit cleanly. The hard-kill timer is a last resort so we
  // never hang a pod past the platform's grace window.
  let shuttingDown = false;
  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[Shutdown] ${signal} received; draining...`);
    intervals.forEach((i) => clearInterval(i));
    const hardKill = setTimeout(() => {
      console.error("[Shutdown] Drain timeout — forcing exit.");
      process.exit(1);
    }, 25_000);
    hardKill.unref();
    server.close((err) => {
      if (err) {
        console.error("[Shutdown] server.close error:", err);
        process.exit(1);
      }
      console.log("[Shutdown] Clean exit.");
      process.exit(0);
    });
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
  // Surface unhandled errors so they show up in prod logs instead of vanishing.
  process.on("unhandledRejection", (reason) => {
    console.error("[unhandledRejection]", reason);
  });
  process.on("uncaughtException", (err) => {
    console.error("[uncaughtException]", err);
  });
}

// Only auto-start when this file is the entrypoint (e.g. local dev / Node host).
// When imported by a Vercel serverless function, the importer calls createApp()
// directly and we must NOT call listen() or schedule cron intervals.
if (process.env.VERCEL !== "1") {
  startServer().catch(console.error);
}

// Export for use by analysisJob to broadcast updates
export function broadcastAnalysisUpdate(submissionId: number, event: string, data: unknown): void {
  const clients = sseClients.get(submissionId);
  if (!clients || clients.length === 0) return;

  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  clients.forEach((res) => {
    try {
      res.write(message);
    } catch {
      // Client disconnected
    }
  });
}
