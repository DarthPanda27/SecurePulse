import express from "express";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { generateBriefCard } from "./src/lib/ai";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes go here
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", app: "SecurePulse MVP" });
  });

  app.post("/api/generate-brief", async (req, res) => {
    try {
      const { intelItems } = req.body;
      if (!Array.isArray(intelItems)) {
        return res.status(400).json({ error: "intelItems must be an array" });
      }
      const card = await generateBriefCard(intelItems);
      res.json(card);
    } catch (err) {
      console.error("Failed to generate brief card:", err);
      res.status(500).json({ error: "Failed to generate brief card" });
    }
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
    // Catch-all: return index.html for SPA client-side routing
    app.get("*", (_req, res) => {
      res.sendFile("dist/index.html", { root: "." });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
