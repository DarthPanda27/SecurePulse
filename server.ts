import express from "express";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { createApp } from "./src/backend/app";

dotenv.config();

export async function startServer() {
  const app = createApp();
  const PORT = 3000;

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
