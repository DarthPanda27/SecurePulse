import { BriefCard, GenerateBriefRequest, IntelItem } from "./models.ts";

export class ParseFailureError extends Error {
  constructor(
    public readonly context: string,
    public readonly details: string,
    public readonly rawValue?: unknown,
  ) {
    super(`[${context}] ${details}`);
    this.name = "ParseFailureError";
  }
}

export function safeJsonParse(raw: string, context: string): unknown {
  try {
    return JSON.parse(raw);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Invalid JSON";
    throw new ParseFailureError(context, `Failed to parse JSON: ${reason}`, raw);
  }
}

function ensureObject(value: unknown, context: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ParseFailureError(context, "Expected a JSON object payload.", value);
  }
  return value as Record<string, unknown>;
}

function ensureString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ParseFailureError(path, "Expected a non-empty string.", value);
  }
  return value;
}

function ensureStringArray(value: unknown, path: string): string[] {
  if (!Array.isArray(value)) {
    throw new ParseFailureError(path, "Expected an array of strings.", value);
  }
  return value.map((entry, idx) => ensureString(entry, `${path}[${idx}]`));
}

export function parseIntelItem(value: unknown, context: string): IntelItem {
  const obj = ensureObject(value, context);
  return {
    source: ensureString(obj.source, `${context}.source`),
    severity: ensureString(obj.severity, `${context}.severity`),
    detail: ensureString(obj.detail, `${context}.detail`),
  };
}

export function parseGenerateBriefRequest(value: unknown): GenerateBriefRequest {
  const obj = ensureObject(value, "generateBriefRequest");
  if (!Array.isArray(obj.intelItems) || obj.intelItems.length === 0) {
    throw new ParseFailureError(
      "generateBriefRequest.intelItems",
      "Expected at least one intelligence item.",
      obj.intelItems,
    );
  }

  return {
    intelItems: obj.intelItems.map((item, idx) => parseIntelItem(item, `generateBriefRequest.intelItems[${idx}]`)),
  };
}

export function parseBriefCard(value: unknown): BriefCard {
  const obj = ensureObject(value, "briefCard");
  return {
    title: ensureString(obj.title, "briefCard.title"),
    bullets: ensureStringArray(obj.bullets, "briefCard.bullets"),
    whyItMatters: ensureString(obj.whyItMatters, "briefCard.whyItMatters"),
    suggestedAction: ensureString(obj.suggestedAction, "briefCard.suggestedAction"),
    confidence: ensureString(obj.confidence, "briefCard.confidence"),
    sources: ensureStringArray(obj.sources, "briefCard.sources"),
  };
}
