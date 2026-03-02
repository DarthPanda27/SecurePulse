import express from "express";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { createIngestionService } from "./server/lib/ingestion/index";
import prisma from "./server/lib/prisma";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes go here
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", app: "SecurePulse MVP" });
  });

  const ingestionService = createIngestionService();

  app.post("/api/ingest/run", async (req, res) => {
    try {
      await ingestionService.ingestAll();
      res.json({ status: "ok" });
    } catch (error) {
      res.status(500).json({ status: "error", message: error instanceof Error ? error.message : "ingestion failed" });
    }
  });

  app.post("/api/ingest/replay/:id", async (req, res) => {
    const replayed = await ingestionService.replayDeadLetter(req.params.id);
    res.json({ replayed });
  });

  app.get("/api/ingest/dlq", async (req, res) => {
    const rows = await (prisma as any).deadLetterItem.findMany({ where: { replayedAt: null }, orderBy: { createdAt: "asc" } });
    res.json(rows);
  });


  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve the built static files
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
