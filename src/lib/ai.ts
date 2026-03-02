import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

let ai: GoogleGenAI | null = null;

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

export const BriefCardSchema = {
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
  },
  required: ["title", "summaryBullets", "whyItMatters", "confidence"],
};

export interface IntelItem {
  id: string;
  source: string;
  external_id: string;
  title: string;
  content: string;
  url?: string;
  published_at: string;
}

export async function generateBriefCard(intelItems: IntelItem[]) {
  const genAI = getGenAI();

  const prompt = `
    You are a senior cybersecurity intelligence analyst.
    Review the following raw intelligence items and generate a single, high-signal daily brief card.

    Rules:
    1. Do NOT hallucinate CVEs, threat actors, or facts not present in the input.
    2. Write in a concise, professional tone.
    3. If there are multiple items, synthesize them into a coherent narrative.

    Raw Intelligence:
    ${JSON.stringify(intelItems, null, 2)}
  `;

  const response = await genAI.models.generateContent({
    model: "gemini-2.0-flash",
    contents: prompt,
    config: {
      temperature: 0.1, // Low temperature for factual grounding
      responseMimeType: "application/json",
      responseSchema: BriefCardSchema,
    },
  });

  const raw = response.text;
  if (!raw) {
    throw new Error("Gemini returned an empty response");
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`Failed to parse Gemini response as JSON: ${raw.slice(0, 200)}`);
  }
}
