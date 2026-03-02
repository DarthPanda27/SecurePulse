import test, { afterEach, beforeEach } from "node:test";
import assert from "node:assert/strict";
import db from "../src/lib/db";
import { createApp, resetRateLimits } from "../src/backend/app";
import type { AddressInfo } from "node:net";

let baseUrl = "";
let closeServer: (() => Promise<void>) | null = null;

beforeEach(async () => {
  process.env.RATE_LIMIT_WINDOW_MS = "60000";
  process.env.RATE_LIMIT_MAX_REQUESTS = "2";
  process.env.OPS_TOKEN = "ops-secret";

  db.exec("DELETE FROM audit_logs;");
  db.exec("DELETE FROM intel_items;");
  resetRateLimits();

  const app = createApp();
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", () => resolve()));
  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
  closeServer = async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  };
});

afterEach(async () => {
  if (closeServer) {
    await closeServer();
  }
});

test("invalid payload returns standardized validation envelope", async () => {
  const response = await fetch(`${baseUrl}/api/intel`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ source: "rss" }),
  });

  assert.equal(response.status, 400);
  const body = (await response.json()) as { error: { code: string; details: { errors: string[] } } };
  assert.equal(body.error.code, "VALIDATION_ERROR");
  assert.ok(body.error.details.errors.length > 0);
});

test("rate limit triggers on key write endpoints", async () => {
  const payload = {
    source: "rss",
    externalId: "ext-1",
    title: "Alert",
    content: "content",
    publishedAt: new Date().toISOString(),
  };

  const first = await fetch(`${baseUrl}/api/intel`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  assert.equal(first.status, 201);

  const second = await fetch(`${baseUrl}/api/intel`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...payload, externalId: "ext-2" }),
  });
  assert.equal(second.status, 201);

  const third = await fetch(`${baseUrl}/api/intel`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...payload, externalId: "ext-3" }),
  });

  assert.equal(third.status, 429);
  const body = (await third.json()) as { error: { code: string } };
  assert.equal(body.error.code, "RATE_LIMITED");
});
