import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { createIngestionService } from "./server/lib/ingestion/index";
import prisma from "./server/lib/prisma";
import express from "express";
import { createApp } from "./server/app";

dotenv.config();

async function startServer() {
  const app = createApp(prisma as any);
  const PORT = 3000;

  const ingestionService = createIngestionService();

  app.post("/api/ingest/run", async (_req, res) => {
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

  app.get("/api/ingest/dlq", async (_req, res) => {
    const rows = await (prisma as any).deadLetterItem.findMany({ where: { replayedAt: null }, orderBy: { createdAt: "asc" } });
    res.json(rows);
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
