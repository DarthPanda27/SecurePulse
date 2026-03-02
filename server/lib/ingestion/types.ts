export type ConnectorSlug = "nvd" | "cisa-kev" | "epss";

export type Confidence = "LOW" | "MEDIUM" | "HIGH";

export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface NormalizedRecord {
  sourceSlug: ConnectorSlug;
  externalId: string;
  title: string;
  summary: string;
  sourceUrl?: string;
  severity: Severity;
  confidence: Confidence;
  publishedAt: Date;
  cveId?: string;
  vendor?: string;
  product?: string;
  cvssScore?: number;
  exploited?: boolean;
  patched?: boolean;
  raw: unknown;
}

export interface ParsedEnvelope<T = unknown> {
  items: T[];
  fetchedAt: Date;
}

export interface SourceHealthSnapshot {
  lastSuccessAt: Date | null;
  lastErrorAt: Date | null;
  errorStreak: number;
}
