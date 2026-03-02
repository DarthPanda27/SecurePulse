import express from "express";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { buildDailyBrief, intelDataset, scoreIntelItem, type UserContext } from "./src/lib/intel.ts";

dotenv.config();

function getUserContext(): UserContext {
  return {
    subscribedVendors: ["Ivanti", "Okta", "Fortinet"],
    subscribedProducts: ["Connect Secure", "Okta Workforce Identity", "FortiGate"],
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", app: "SecurePulse MVP" });
  });

  app.get("/api/intel-items", (req, res) => {
    const user = getUserContext();
    const items = intelDataset
      .map((item) => ({ ...item, score: scoreIntelItem(item, user) }))
      .sort((a, b) => b.score.totalScore - a.score.totalScore);

    res.json({ items });
  });

  app.get("/api/daily-briefs/latest", (req, res) => {
    const brief = buildDailyBrief(getUserContext());
    res.json(brief);
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
