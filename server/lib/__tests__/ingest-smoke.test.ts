import test from "node:test";
import assert from "node:assert/strict";
import type { IngestionConnector } from "../ingestion/connectors/base";
import { InMemoryDeadLetterQueue } from "../ingestion/dlq";
import { InMemoryIngestionStore } from "../ingestion/memory-store";
import { IngestionService } from "../ingestion/service";
import type { Confidence, NormalizedRecord, ParsedEnvelope } from "../ingestion/types";

type Raw = { records: Array<{ id: string; cve: string; summary: string }> };

class FlakyConnector implements IngestionConnector<Raw, Raw["records"][number]> {
  slug = "nvd" as const;
  sourceName = "NVD";
  private attempts = 0;

  async fetch(): Promise<Raw> {
    this.attempts += 1;
    if (this.attempts === 1) throw new Error("transient fetch error");
    return { records: [{ id: "1", cve: "CVE-1", summary: "hello" }] };
  }
  parse(raw: Raw): ParsedEnvelope<Raw["records"][number]> {
    return { items: raw.records, fetchedAt: new Date() };
  }
  normalize(parsed: Raw["records"][number]): NormalizedRecord {
    return {
      sourceSlug: "nvd",
      externalId: parsed.id,
      cveId: parsed.cve,
      title: parsed.cve,
      summary: parsed.summary,
      severity: "HIGH",
      confidence: "MEDIUM",
      publishedAt: new Date(),
      exploited: false,
      patched: false,
      raw: parsed,
    };
  }
  confidence(): Confidence {
    return "HIGH";
  }
}

test("smoke: end-to-end ingestion with retry, idempotency, source health and DLQ", async () => {
  const store = new InMemoryIngestionStore();
  const dlq = new InMemoryDeadLetterQueue();
  const connector = new FlakyConnector();
  const service = new IngestionService({
    store,
    dlq,
    connectors: [connector],
    retry: { maxAttempts: 3, baseDelayMs: 1, maxDelayMs: 5 },
  });

  await service.ingestConnector("nvd");
  await service.ingestConnector("nvd");

  assert.equal(store.records.size, 1, "idempotent persist should avoid duplicates");
  const health = store.health.get("nvd");
  assert.equal(health?.errorStreak, 0);
  assert.ok(health?.lastSuccessAt instanceof Date);
  assert.equal((await dlq.listPending()).length, 0);
});
