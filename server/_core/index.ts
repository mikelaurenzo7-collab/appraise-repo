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
import { getActivityLogsBySubmission } from "../db";
import { flushMessages, cleanupOldQueues, type SSEMessage } from "./sseBroadcaster";

// In-memory SSE clients for real-time analysis streaming
const sseClients = new Map<number, express.Response[]>();

// Periodic cleanup of old SSE queues
setInterval(() => cleanupOldQueues(), 5 * 60 * 1000);

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

  // ── SSE: Real-time analysis status streaming ─────────────────────────────
  app.get("/api/stream/analysis/:submissionId", async (req, res) => {
    const submissionId = parseInt(req.params.submissionId);
    if (isNaN(submissionId)) {
      res.status(400).json({ error: "Invalid submission ID" });
      return;
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Access-Control-Allow-Origin", "*");

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
    console.log(`SSE endpoint: http://localhost:${port}/api/stream/analysis/:submissionId`);
  });
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

startServer().catch(console.error);
