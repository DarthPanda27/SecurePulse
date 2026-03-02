export const GEMINI_MODELS = {
  BRIEF_GENERATION: "gemini-2.5-flash",
} as const;

export type GeminiModelId = (typeof GEMINI_MODELS)[keyof typeof GEMINI_MODELS];

export interface IntelItem {
  source: string;
  severity: string;
  detail: string;
}

export interface BriefCard {
  title: string;
  bullets: string[];
  whyItMatters: string;
  suggestedAction: string;
  confidence: string;
  sources: string[];
}

export interface LegacyBriefResponse {
  brief: BriefCard & { summaryBullets: string[] };
}

export interface GenerateBriefRequest {
  intelItems: IntelItem[];
}
