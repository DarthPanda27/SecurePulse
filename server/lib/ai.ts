import { GoogleGenAI, Type } from "@google/genai";

export class MissingGeminiKeyError extends Error {
  constructor() {
    super("GEMINI_API_KEY environment variable is required");
    this.name = "MissingGeminiKeyError";
  }
}

let ai: GoogleGenAI | null = null;

export function getGenAI(): GoogleGenAI {
  if (!ai) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new MissingGeminiKeyError();
    }
    ai = new GoogleGenAI({ apiKey: key });
  }
  return ai;
}

export const BriefCardSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "A concise, punchy title for the card." },
    bullets: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "2-4 bullet points summarizing the key facts.",
    },
    whyItMatters: { type: Type.STRING, description: "A short paragraph explaining the risk or impact." },
    suggestedAction: { type: Type.STRING, description: "One recommended action to take." },
    confidence: { type: Type.STRING, description: "HIGH, MEDIUM, or LOW based on source reliability." },
    sources: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of cited source names or references from the provided intel items.",
    },
  },
  required: ["title", "bullets", "whyItMatters", "suggestedAction", "confidence", "sources"],
};

export async function generateBriefCard(intelItems: unknown[]) {
  const genAI = getGenAI();

  const prompt = `
    You are a senior cybersecurity intelligence analyst.
    Review the following raw intelligence items and generate a single, high-signal daily brief card.

    Rules:
    1. Do NOT hallucinate CVEs, threat actors, or facts not present in the input.
    2. Write in a concise, professional tone.
    3. If there are multiple items, synthesize them into a coherent narrative.
    4. Return strict JSON matching the provided schema keys exactly.
    5. Ensure sources includes only source names or references present in the provided intel items.

    Raw Intelligence:
    ${JSON.stringify(intelItems, null, 2)}
  `;

  const response = await genAI.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      temperature: 0.1,
      responseMimeType: "application/json",
      responseSchema: BriefCardSchema,
    },
  });

  return JSON.parse(response.text || "{}");
}
