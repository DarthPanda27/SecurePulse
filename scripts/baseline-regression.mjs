import { spawn } from "node:child_process";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";

const BASE_URL = "http://127.0.0.1:3000";

function fail(message, details) {
  const detailBlock = details ? `\nDetails: ${details}` : "";
  throw new Error(`[baseline] ${message}${detailBlock}`);
}

function assert(condition, message, details) {
  if (!condition) {
    fail(message, details);
  }
}

async function waitForHealth(timeoutMs = 15000) {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(`${BASE_URL}/api/health`);
      if (response.ok) {
        return;
      }
    } catch {
      // Server not ready yet.
    }

    await delay(300);
  }

  fail("Server did not become healthy in time", `Waited ${timeoutMs}ms for ${BASE_URL}/api/health`);
}

async function assertHealthContract() {
  const response = await fetch(`${BASE_URL}/api/health`);
  const payload = await response.json();

  assert(response.status === 200, "Expected /api/health to return HTTP 200", `Received ${response.status}`);
  assert(payload && typeof payload === "object", "Expected /api/health response body to be an object");
  assert(payload.status === "ok", "Expected /api/health status to equal 'ok'", `Received ${JSON.stringify(payload)}`);
  assert(payload.app === "SecurePulse MVP", "Expected /api/health app identifier to match", `Received ${JSON.stringify(payload)}`);
  assert(typeof payload.geminiConfigured === "boolean", "Expected /api/health geminiConfigured to be boolean", `Received ${JSON.stringify(payload)}`);
}

async function assertGenerateBriefSuccess() {
  const requestBody = {
    intelItems: [
      {
        source: "CISA KEV",
        severity: "HIGH",
        detail: "Multiple VPN appliances are seeing active exploitation attempts.",
      },
    ],
  };

  const response = await fetch(`${BASE_URL}/api/generate-brief`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(requestBody),
  });

  const payload = await response.json();

  assert(response.status === 200, "Expected /api/generate-brief success path to return HTTP 200", `Received ${response.status}: ${JSON.stringify(payload)}`);
  assert(typeof payload.title === "string" && payload.title.length > 0, "Expected generated brief to include non-empty string title");
  assert(Array.isArray(payload.bullets) && payload.bullets.length > 0, "Expected generated brief to include non-empty bullets array");
  assert(typeof payload.whyItMatters === "string" && payload.whyItMatters.length > 0, "Expected generated brief to include whyItMatters");
  assert(typeof payload.suggestedAction === "string" && payload.suggestedAction.length > 0, "Expected generated brief to include suggestedAction");
  assert(["HIGH", "MEDIUM", "LOW"].includes(payload.confidence), "Expected generated brief confidence to be one of HIGH|MEDIUM|LOW", `Received ${JSON.stringify(payload)}`);
  assert(Array.isArray(payload.sources) && payload.sources.length > 0, "Expected generated brief to include sources array");
}

async function assertGenerateBriefInvalidBody() {
  const response = await fetch(`${BASE_URL}/api/generate-brief`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ intelItems: "invalid" }),
  });

  const payload = await response.json();

  assert(response.status === 400, "Expected /api/generate-brief invalid body path to return HTTP 400", `Received ${response.status}: ${JSON.stringify(payload)}`);
  assert(payload?.error?.code === "INVALID_REQUEST", "Expected invalid body response to include error.code=INVALID_REQUEST", `Received ${JSON.stringify(payload)}`);
  assert(typeof payload?.error?.details === "string" && payload.error.details.length > 0, "Expected invalid body response to include actionable error.details", `Received ${JSON.stringify(payload)}`);
}

async function run() {
  const mockBrief = {
    title: "Active exploitation trend requires accelerated patching",
    bullets: [
      "Multiple critical edge devices are under active exploit pressure.",
      "Observed activity aligns with increased credential-access campaigns.",
    ],
    whyItMatters: "Delayed remediation increases exposure to privileged compromise.",
    suggestedAction: "Prioritize emergency patching and MFA hardening on internet-facing assets today.",
    confidence: "HIGH",
    sources: ["CISA KEV"],
  };

  const server = spawn("node", ["--import", "tsx", "server.ts"], {
    env: {
      ...process.env,
      NODE_ENV: "production",
      SECUREPULSE_MOCK_BRIEF_CARD: JSON.stringify(mockBrief),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stderr = "";
  server.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
    process.stderr.write(chunk);
  });

  server.stdout.on("data", (chunk) => {
    process.stdout.write(chunk);
  });

  try {
    await waitForHealth();
    await assertHealthContract();
    await assertGenerateBriefSuccess();
    await assertGenerateBriefInvalidBody();
    console.log("[baseline] API regression checks passed.");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    fail("Baseline API regression checks failed", `${message}\nServer stderr:\n${stderr || "<empty>"}`);
  } finally {
    server.kill("SIGTERM");
    await delay(300);
    if (!server.killed) {
      server.kill("SIGKILL");
    }
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
