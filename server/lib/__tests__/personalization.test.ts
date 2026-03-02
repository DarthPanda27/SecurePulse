import test from "node:test";
import assert from "node:assert/strict";
import { type IntelSeverity } from "../severity";
import { scoreIntelForUser } from "../personalization";

test("scores differ across user profiles", () => {
  const intel = {
    id: "intel-1",
    title: "Critical Ivanti bug",
    severity: "CRITICAL" as const,
    feedSourceSlug: "vendor-advisories",
    vulnerabilities: [{ exploited: true, patched: false, vendor: "Ivanti", product: "Connect Secure" }],
  };

  const secopsScore = scoreIntelForUser(intel, {
    subscribedSourceSlugs: ["vendor-advisories"],
    minimumSeverity: "HIGH",
    includeRecommendations: true,
  });

  const lowPriorityScore = scoreIntelForUser(intel, {
    subscribedSourceSlugs: [],
    minimumSeverity: "CRITICAL",
    includeRecommendations: false,
  });

  assert.ok(secopsScore > lowPriorityScore);
});
