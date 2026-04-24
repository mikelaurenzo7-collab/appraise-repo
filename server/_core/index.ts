import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStripeWebhook } from "./stripeWebhook";
import { registerLobWebhook } from "./lobWebhook";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { getDb } from "../db";

/**
 * Fail-fast validation of critical env vars. In production we refuse to
 * boot when any required secret is missing — better a crash-loop caught by
 * the platform than a subtly broken service that silently 500s every
 * request. In dev we warn but allow startup so local iteration isn't
 * blocked by, e.g., not having a Stripe key.
 */
function validateEnvOrExit() {
  const required = ["DATABASE_URL", "JWT_SECRET"];
  const productionOnly = ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"];
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

async function startServer() {
  validateEnvOrExit();

  const app = express();
  const server = createServer(app);

  // Stripe + Lob webhooks must be registered before the JSON body parser so
  // signature verification receives the original raw payload bytes.
  registerStripeWebhook(app);
  registerLobWebhook(app);

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
      res.json({ ok: true });
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
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
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
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
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

  // Start filing job processor (Playwright / mail dispatcher)
  try {
    const { processPendingFilingJobs } = await import(
      "../services/filingJobQueue"
    );
    intervals.push(setInterval(async () => {
      try {
        await processPendingFilingJobs(2);
      } catch (err) {
        console.error("[FilingQueue] Processing error:", err);
      }
    }, 30 * 1000));
  } catch (err) {
    console.warn("[FilingQueue] Failed to initialize", err);
  }

  // Start filing artifact retention cleanup (daily)
  try {
    const { buildCleanupInterval } = await import(
      "../services/filingCleanup"
    );
    buildCleanupInterval()();
  } catch (err) {
    console.warn("[FilingCleanup] Failed to initialize", err);
  }

  // Start filing deadline reminder cron (daily)
  try {
    const { buildDeadlineReminderInterval } = await import(
      "../services/deadlineReminders"
    );
    buildDeadlineReminderInterval()();
  } catch (err) {
    console.warn("[DeadlineReminders] Failed to initialize", err);
  }

  // Start report job processor
  try {
    const { processPendingReportJobs } = await import("../services/reportJobQueue");
    const { cleanupExpiredReportJobs } = await import("../db");

    // Process pending jobs immediately on startup
    processPendingReportJobs(5).then((count) => {
      if (count > 0) console.log(`[ReportQueue] Processing ${count} pending jobs on startup`);
    }).catch((err) => console.error("[ReportQueue] Startup error:", err));

    // Cleanup expired jobs every 5 minutes
    intervals.push(setInterval(async () => {
      try {
        const cleaned = await cleanupExpiredReportJobs();
        if (cleaned > 0) console.log(`[ReportQueue] Cleaned up ${cleaned} expired jobs`);
      } catch (err) {
        console.error("[ReportQueue] Cleanup error:", err);
      }
    }, 5 * 60 * 1000));

    // Process pending jobs every 30 seconds
    intervals.push(setInterval(async () => {
      try {
        await processPendingReportJobs(3);
      } catch (err) {
        console.error("[ReportQueue] Processing error:", err);
      }
    }, 30 * 1000));
  } catch (err) {
    console.warn("[ReportQueue] Failed to initialize report job processor:", err);
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

startServer().catch(console.error);
