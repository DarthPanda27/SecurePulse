import test from "node:test";
import assert from "node:assert/strict";
import { GeminiDailyBriefService } from "../briefing";

const sampleItems = [
  {
    id: "intel-1",
    title: "Critical auth bypass in perimeter appliance",
    summary: "Unauthenticated remote access condition observed in active exploitation.",
    severity: "CRITICAL" as const,
    sourceUrl: "https://example.com/advisory",
    publishedAt: new Date("2026-03-01T00:00:00.000Z"),
  },
];

test("uses validated Gemini JSON response for daily brief", async () => {
  const mockClient = {
    models: {
      generateContent: async () => ({
        text: JSON.stringify({
          headline: "Critical auth bypass requires immediate action",
          executiveSummary: "A critical perimeter issue is being actively exploited.",
          cards: [
            {
              title: "Perimeter exposure risk",
              summaryBullets: ["Active exploitation confirmed.", "Internet-facing systems likely impacted."],
              whyItMatters: "Compromise of edge infrastructure can enable lateral movement.",
              suggestedAction: "Patch affected appliances immediately.",
              confidence: "HIGH",
              citations: [
                {
                  sourceId: "intel-1",
                  title: "Critical auth bypass in perimeter appliance",
                  sourceUrl: "https://example.com/advisory",
                  publishedAt: "2026-03-01T00:00:00.000Z",
                },
              ],
            },
          ],
        }),
      }),
    },
  };

  const service = new GeminiDailyBriefService({ client: mockClient as any });
  const result = await service.generateDailyBrief(sampleItems);

  assert.equal(result.cards[0]?.citations.length, 1);
  assert.equal(result.cards[0]?.citations[0]?.sourceId, "intel-1");
  assert.equal(result.headline, "Critical auth bypass requires immediate action");
});

test("falls back to deterministic summary when Gemini output fails validation", async () => {
  const mockClient = {
    models: {
      generateContent: async () => ({
        text: JSON.stringify({
          headline: "Missing citations should fail",
          executiveSummary: "This payload is intentionally invalid.",
          cards: [
            {
              title: "Invalid card",
              summaryBullets: ["Only one bullet"],
              whyItMatters: "Schema should reject this response.",
              confidence: "HIGH",
            },
          ],
        }),
      }),
    },
  };

  const service = new GeminiDailyBriefService({ client: mockClient as any });
  const result = await service.generateDailyBrief(sampleItems);

  assert.equal(result.headline, sampleItems[0].title);
  assert.equal(result.cards[0]?.citations[0]?.sourceId, sampleItems[0].id);
  assert.equal(result.cards[0]?.summaryBullets.length, 2);
});
