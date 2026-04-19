import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStripeWebhook } from "./stripeWebhook";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

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
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // Stripe webhook (must be before express.json middleware)
  registerStripeWebhook(app);
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // Places autocomplete endpoint
  app.post("/api/places-autocomplete", async (req, res) => {
    try {
      const { input } = req.body;
      if (!input || input.length < 3) {
        return res.json({ predictions: [] });
      }
      const { getPlacePredictions } = await import("./placesAutocomplete");
      const predictions = await getPlacePredictions(input);
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

  // Start report job processor
  try {
    const { processPendingReportJobs } = await import("../services/reportJobQueue");
    const { cleanupExpiredReportJobs } = await import("../db");

    // Process pending jobs immediately on startup
    processPendingReportJobs(5).then((count) => {
      if (count > 0) console.log(`[ReportQueue] Processing ${count} pending jobs on startup`);
    }).catch((err) => console.error("[ReportQueue] Startup error:", err));

    // Cleanup expired jobs every 5 minutes
    setInterval(async () => {
      try {
        const cleaned = await cleanupExpiredReportJobs();
        if (cleaned > 0) console.log(`[ReportQueue] Cleaned up ${cleaned} expired jobs`);
      } catch (err) {
        console.error("[ReportQueue] Cleanup error:", err);
      }
    }, 5 * 60 * 1000);

    // Process pending jobs every 30 seconds
    setInterval(async () => {
      try {
        await processPendingReportJobs(3);
      } catch (err) {
        console.error("[ReportQueue] Processing error:", err);
      }
    }, 30 * 1000);
  } catch (err) {
    console.warn("[ReportQueue] Failed to initialize report job processor:", err);
  }
}

startServer().catch(console.error);
