import { GoogleGenAI, Type } from "@google/genai";
import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

let ai: GoogleGenAI | null = null;

export function resetGenAI() {
  ai = null;
}

export function getGenAI(): GoogleGenAI {
  if (!ai) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    ai = new GoogleGenAI({ apiKey: key });
  }
  return ai;
}

// 1. Zod Schemas for Validation
export const SourceCitationZodSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string().optional(),
});

export const BriefCardZodSchema = z.object({
  title: z.string(),
  summaryBullets: z.array(z.string()).max(4),
  whyItMatters: z.string(),
  suggestedAction: z.string().optional(),
  confidence: z.enum(["HIGH", "MEDIUM", "LOW"]),
  citations: z.array(SourceCitationZodSchema).min(1),
});

export type BriefCard = z.infer<typeof BriefCardZodSchema>;

// 2. Gemini API Schema (matches Zod schema)
export const BriefCardGenAISchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "A concise, punchy title for the card." },
    summaryBullets: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "2-4 bullet points summarizing the key facts.",
    },
    whyItMatters: { type: Type.STRING, description: "A short paragraph explaining the risk or impact." },
    suggestedAction: { type: Type.STRING, description: "One recommended action to take." },
    confidence: { type: Type.STRING, description: "HIGH, MEDIUM, or LOW based on source reliability." },
    citations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING, description: "The external_id or id of the source item." },
          title: { type: Type.STRING, description: "The title of the source item." },
          url: { type: Type.STRING, description: "The URL of the source item." },
        },
        required: ["id", "title"],
      },
      description: "List of source citations used to generate this brief.",
    },
  },
  required: ["title", "summaryBullets", "whyItMatters", "confidence", "citations"],
};

// 3. Prompt Template
export function buildBriefPrompt(intelItems: any[]): string {
  return `
    You are a senior cybersecurity intelligence analyst.
    Review the following raw intelligence items and generate a single, high-signal daily brief card.
    
    Rules:
    1. Do NOT hallucinate CVEs, threat actors, or facts not present in the input.
    2. Write in a concise, professional tone.
    3. If there are multiple items, synthesize them into a coherent narrative.
    4. You MUST include at least one citation in the 'citations' array, referencing the 'external_id' or 'id' of the provided items.
    
    Raw Intelligence:
    ${JSON.stringify(intelItems, null, 2)}
  `;
}

// 4. Deterministic Fallback
export function deterministicFallback(intelItems: any[]): BriefCard {
  if (!intelItems || intelItems.length === 0) {
    return {
      title: "No Intelligence Updates",
      summaryBullets: ["No new intelligence items were found for this period."],
      whyItMatters: "Your monitored feeds have not reported any new activity.",
      confidence: "LOW",
      citations: [{ id: "none", title: "System Generated" }],
    };
  }

  const primary = intelItems[0];
  const title = primary.title || "Intelligence Update";
  const content = primary.content || "No content available.";
  const summary = content.length > 150 ? content.substring(0, 147) + "..." : content;

  return {
    title: `[Fallback] ${title}`,
    summaryBullets: [summary],
    whyItMatters: "This item was flagged by your subscriptions. (Generated via deterministic fallback due to AI service unavailability or validation failure).",
    confidence: "LOW",
    citations: intelItems.map((item) => ({
      id: item.external_id || item.id || "unknown",
      title: item.title || "Unknown Source",
      url: item.url,
    })),
  };
}

// 5. Generation Function with Validation and Fallback
export async function generateBriefCard(intelItems: any[]): Promise<BriefCard> {
  try {
    const genAI = getGenAI();
    const prompt = buildBriefPrompt(intelItems);

    const response = await genAI.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        temperature: 0.1, // Low temperature for factual grounding
        responseMimeType: "application/json",
        responseSchema: BriefCardGenAISchema,
      },
    });

    const rawJson = JSON.parse(response.text || "{}");
    
    // Validate with Zod
    const validatedCard = BriefCardZodSchema.parse(rawJson);
    return validatedCard;
  } catch (error) {
    console.error("Failed to generate or validate brief card. Using deterministic fallback.", error);
    return deterministicFallback(intelItems);
  }
}
