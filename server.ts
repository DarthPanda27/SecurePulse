import express from "express";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { MissingGeminiKeyError, generateBriefCard } from "./server/lib/ai.ts";

dotenv.config();

type BriefRequest = {
  intelItems?: unknown[];
};

const defaultIntel = [
  {
    source: "CISA KEV",
    severity: "CRITICAL",
    detail: "Ivanti Connect Secure CVE-2024-21893 observed under active exploitation.",
  },
  {
    source: "Threat Intel Feed",
    severity: "HIGH",
    detail: "Identity-provider social engineering is increasing against cloud admin accounts.",
  },
];

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      app: "SecurePulse MVP",
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    });
  });

  app.post("/api/brief", async (req, res) => {
    try {
      const body = (req.body || {}) as BriefRequest;
      const intelItems = Array.isArray(body.intelItems) && body.intelItems.length > 0
        ? body.intelItems
        : defaultIntel;
      const brief = await generateBriefCard(intelItems);
      res.json({ brief });
    } catch (error) {
      if (error instanceof MissingGeminiKeyError) {
        res.status(503).json({
          error: "Gemini is not configured on the server",
          code: "GEMINI_NOT_CONFIGURED",
          details: "Set GEMINI_API_KEY in server environment and restart the app.",
        });
        return;
      }

      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({
        error: "Failed to generate brief",
        code: "BRIEF_GENERATION_FAILED",
        details: message,
      });
    }
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
