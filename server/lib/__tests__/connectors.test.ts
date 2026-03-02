import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { CisaKevConnector } from "../ingestion/connectors/cisa-kev";
import { EpssConnector } from "../ingestion/connectors/epss";
import { NvdConnector } from "../ingestion/connectors/nvd";

const fixture = (name: string) =>
  JSON.parse(readFileSync(resolve("server/lib/ingestion/__tests__/fixtures", name), "utf8"));

test("NVD connector parse/normalize", () => {
  const connector = new NvdConnector("http://example.com");
  const parsed = connector.parse(fixture("nvd.json"));
  assert.equal(parsed.items.length, 1);
  const normalized = connector.normalize(parsed.items[0]);
  assert.equal(normalized.externalId, "CVE-2024-1111");
  assert.equal(normalized.severity, "CRITICAL");
  assert.equal(normalized.confidence, "HIGH");
});

test("CISA KEV connector parse/normalize", () => {
  const connector = new CisaKevConnector("http://example.com");
  const parsed = connector.parse(fixture("cisa-kev.json"));
  assert.equal(parsed.items.length, 1);
  const normalized = connector.normalize(parsed.items[0]);
  assert.equal(normalized.cveId, "CVE-2024-2222");
  assert.equal(normalized.exploited, true);
  assert.equal(normalized.confidence, "HIGH");
});

test("EPSS connector parse/normalize", () => {
  const connector = new EpssConnector("http://example.com");
  const parsed = connector.parse(fixture("epss.json"));
  assert.equal(parsed.items.length, 1);
  const normalized = connector.normalize(parsed.items[0]);
  assert.equal(normalized.cveId, "CVE-2024-3333");
  assert.equal(normalized.severity, "HIGH");
  assert.equal(normalized.confidence, "HIGH");
});
