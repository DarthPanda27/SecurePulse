export type Citation = {
  sourceId: string;
  title: string;
  sourceUrl?: string;
  publishedAt?: string;
};

export type BriefCard = {
  title: string;
  summaryBullets: string[];
  whyItMatters: string;
  suggestedAction?: string;
  confidence: "LOW" | "MEDIUM" | "HIGH";
  citations: Citation[];
};

export type DailyBrief = {
  headline: string;
  executiveSummary: string;
  cards: BriefCard[];
};

export type BriefInputItem = {
  id: string;
  title: string;
  summary: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  sourceUrl?: string | null;
  publishedAt: Date;
};

const isNonEmptyString = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;

function isCitation(value: unknown): value is Citation {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  if (!isNonEmptyString(record.sourceId) || !isNonEmptyString(record.title)) return false;
  if (record.sourceUrl !== undefined) {
    if (!isNonEmptyString(record.sourceUrl)) return false;
    try {
      new URL(record.sourceUrl);
    } catch {
      return false;
    }
  }
  if (record.publishedAt !== undefined && !isNonEmptyString(record.publishedAt)) return false;
  return true;
}

function isBriefCard(value: unknown): value is BriefCard {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  if (!isNonEmptyString(record.title) || !isNonEmptyString(record.whyItMatters)) return false;
  if (!Array.isArray(record.summaryBullets) || record.summaryBullets.length < 2 || record.summaryBullets.length > 4) return false;
  if (!record.summaryBullets.every((bullet) => isNonEmptyString(bullet))) return false;
  if (record.suggestedAction !== undefined && !isNonEmptyString(record.suggestedAction)) return false;
  if (record.confidence !== "LOW" && record.confidence !== "MEDIUM" && record.confidence !== "HIGH") return false;
  if (!Array.isArray(record.citations) || record.citations.length < 1 || !record.citations.every(isCitation)) return false;
  return true;
}

export function parseDailyBrief(value: unknown): DailyBrief | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (!isNonEmptyString(record.headline) || !isNonEmptyString(record.executiveSummary)) return null;
  if (!Array.isArray(record.cards) || record.cards.length < 1 || !record.cards.every(isBriefCard)) return null;
  return record as DailyBrief;
}
