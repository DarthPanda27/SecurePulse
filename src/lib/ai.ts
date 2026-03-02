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

export async function generateBriefCard(intelItems: any[]) {
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
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      temperature: 0.1, // Low temperature for factual grounding
      responseMimeType: "application/json",
      responseSchema: BriefCardSchema,
    },
  });

  return JSON.parse(response.text || "{}");
}
