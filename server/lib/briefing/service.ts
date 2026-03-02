import { GoogleGenAI } from "@google/genai";
import { buildSystemPrompt, buildUserPrompt } from "./prompts";
import { parseDailyBrief, type BriefInputItem, type DailyBrief } from "./types";

type GeminiClient = Pick<GoogleGenAI, "models">;

const severityWeight: Record<BriefInputItem["severity"], number> = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
  CRITICAL: 3,
};

function normalizeItems(items: BriefInputItem[]): BriefInputItem[] {
  return [...items].sort(
    (a, b) =>
      severityWeight[b.severity] - severityWeight[a.severity] || b.publishedAt.getTime() - a.publishedAt.getTime(),
  );
}

export function createDeterministicBrief(items: BriefInputItem[]): DailyBrief {
  const ranked = normalizeItems(items).slice(0, 3);
  const headline = ranked[0]?.title ?? "No significant intel for today";

  return {
    headline,
    executiveSummary:
      ranked.length > 0
        ? `SecurePulse identified ${ranked.length} priority item(s) requiring review in today's cycle.`
        : "No actionable intelligence items were available for this period.",
    cards:
      ranked.length > 0
        ? ranked.map((item) => ({
            title: item.title,
            summaryBullets: [item.summary, `Severity classified as ${item.severity}.`],
            whyItMatters: "This issue may impact exposed systems and should be triaged against your asset inventory.",
            suggestedAction: "Validate exposure and assign remediation ownership.",
            confidence: "MEDIUM" as const,
            citations: [
              {
                sourceId: item.id,
                title: item.title,
                sourceUrl: item.sourceUrl ?? undefined,
                publishedAt: item.publishedAt.toISOString(),
              },
            ],
          }))
        : [
            {
              title: "No urgent intelligence",
              summaryBullets: ["No records met summarization criteria.", "Continue routine monitoring."],
              whyItMatters: "Consistent monitoring confirms no high-priority shift in threat posture.",
              confidence: "HIGH",
              citations: [
                {
                  sourceId: "system",
                  title: "SecurePulse deterministic fallback",
                },
              ],
            },
          ],
  };
}

export class GeminiDailyBriefService {
  private readonly client: GeminiClient | null;
  private readonly model: string;

  constructor(options?: { client?: GeminiClient; model?: string }) {
    this.model = options?.model ?? "gemini-2.5-flash";
    if (options?.client) {
      this.client = options.client;
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    this.client = apiKey ? new GoogleGenAI({ apiKey }) : null;
  }

  async generateDailyBrief(items: BriefInputItem[]): Promise<DailyBrief> {
    const fallback = createDeterministicBrief(items);

    if (!this.client) {
      return fallback;
    }

    try {
      const response = await this.client.models.generateContent({
        model: this.model,
        contents: [{ role: "user", parts: [{ text: `${buildSystemPrompt()}\n\n${buildUserPrompt(items)}` }] }],
        config: {
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      });

      const parsedJson = JSON.parse(response.text ?? "{}");
      const parsed = parseDailyBrief(parsedJson);

      if (!parsed) {
        return fallback;
      }

      return parsed;
    } catch {
      return fallback;
    }
  }
}
