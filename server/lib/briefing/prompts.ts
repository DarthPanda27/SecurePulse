import type { BriefInputItem } from "./types";

export function buildSystemPrompt(): string {
  return [
    "You are SecurePulse, a cybersecurity daily-brief analyst.",
    "Return JSON only.",
    "Use only facts from provided intel items.",
    "Every generated card must include at least one citation object in `citations`.",
    "Citations must map directly to intel items using fields: sourceId, title, sourceUrl (optional), publishedAt (optional ISO-8601).",
  ].join(" ");
}

export function buildUserPrompt(intelItems: BriefInputItem[]): string {
  return `Create a high-signal daily brief from these items.\n\nOutput JSON shape:\n{\n  "headline": string,\n  "executiveSummary": string,\n  "cards": [{\n    "title": string,\n    "summaryBullets": string[2-4],\n    "whyItMatters": string,\n    "suggestedAction": string (optional),\n    "confidence": "LOW"|"MEDIUM"|"HIGH",\n    "citations": [{\n      "sourceId": string,\n      "title": string,\n      "sourceUrl": string (optional),\n      "publishedAt": string (optional ISO-8601)\n    }]\n  }]\n}\n\nIntel items:\n${JSON.stringify(intelItems, null, 2)}`;
}
