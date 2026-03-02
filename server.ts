import express from "express";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { z } from "zod";
import { MissingGeminiKeyError, generateBriefCard } from "./server/lib/ai.ts";

dotenv.config();

const generateBriefRequestSchema = z.object({
  intelItems: z.array(z.unknown()).min(1, "intelItems must contain at least one item"),
});

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

function respondServerError(
  res: express.Response,
  options: { code: string; details: string; status?: number; message?: string },
) {
  const { code, details, status = 500, message = "Internal server error" } = options;
  return res.status(status).json({
    error: {
      code,
      message,
      details,
    },
  });
}

function formatLegacyBriefResponse(brief: Record<string, unknown>) {
  return {
    ...brief,
    summaryBullets: Array.isArray(brief.bullets) ? brief.bullets : [],
  };
}

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

  app.post("/api/generate-brief", async (req, res) => {
    const parsedBody = generateBriefRequestSchema.safeParse(req.body);
    if (parsedBody.success === false) {
      return res.status(400).json({
        error: {
          code: "INVALID_REQUEST",
          message: "Invalid request payload",
          details: parsedBody.error.issues,
        },
      });
    }

    try {
      const brief = await generateBriefCard(parsedBody.data.intelItems);
      return res.json(brief);
    } catch (error) {
      if (error instanceof MissingGeminiKeyError) {
        return respondServerError(res, {
          status: 503,
          code: "GEMINI_NOT_CONFIGURED",
          message: "Service unavailable",
          details: "Set GEMINI_API_KEY in server environment and restart the app.",
        });
      }

      const details = error instanceof Error ? error.message : "Unknown error";
      return respondServerError(res, {
        code: "BRIEF_GENERATION_FAILED",
        details,
      });
    }
  });

  // Backward-compatibility endpoint for existing frontend behavior.
  app.post("/api/brief", async (req, res) => {
    try {
      const intelItems = Array.isArray(req.body?.intelItems) && req.body.intelItems.length > 0
        ? req.body.intelItems
        : defaultIntel;
      const brief = await generateBriefCard(intelItems);
      return res.json({ brief: formatLegacyBriefResponse(brief as Record<string, unknown>) });
    } catch (error) {
      if (error instanceof MissingGeminiKeyError) {
        return respondServerError(res, {
          status: 503,
          code: "GEMINI_NOT_CONFIGURED",
          message: "Service unavailable",
          details: "Set GEMINI_API_KEY in server environment and restart the app.",
        });
      }

      const details = error instanceof Error ? error.message : "Unknown error";
      return respondServerError(res, {
        code: "BRIEF_GENERATION_FAILED",
        details,
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
