import test from "node:test";
import assert from "node:assert/strict";
import { parseBriefCard, parseGenerateBriefRequest, safeJsonParse, ParseFailureError } from "../parse.ts";

test("safeJsonParse returns object for valid JSON", () => {
  const parsed = safeJsonParse('{"ok":true}', "unit-test") as { ok: boolean };
  assert.equal(parsed.ok, true);
});

test("safeJsonParse throws actionable error for invalid JSON", () => {
  assert.throws(
    () => safeJsonParse('{"ok":', "unit-test"),
    (error: unknown) => {
      assert.ok(error instanceof ParseFailureError);
      assert.match(error.message, /Failed to parse JSON/);
      assert.match(error.message, /unit-test/);
      return true;
    },
  );
});

test("parseGenerateBriefRequest validates intel items", () => {
  const parsed = parseGenerateBriefRequest({
    intelItems: [{ source: "CISA", severity: "HIGH", detail: "Patch now" }],
  });
  assert.equal(parsed.intelItems.length, 1);
});

test("parseBriefCard rejects invalid bullets type", () => {
  assert.throws(
    () =>
      parseBriefCard({
        title: "Title",
        bullets: "not-an-array",
        whyItMatters: "Why",
        suggestedAction: "Do x",
        confidence: "HIGH",
        sources: ["CISA"],
      }),
    ParseFailureError,
  );
});
