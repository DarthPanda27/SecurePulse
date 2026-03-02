import { type IntelSeverity } from "./severity";

export type UserContext = {
  subscribedSourceSlugs: string[];
  minimumSeverity: IntelSeverity;
  includeRecommendations: boolean;
};

export type ScorableIntel = {
  id: string;
  title: string;
  severity: IntelSeverity;
  feedSourceSlug: string;
  vulnerabilities: Array<{
    exploited: boolean;
    patched: boolean;
    vendor: string | null;
    product: string | null;
  }>;
};

const severityWeights: Record<IntelSeverity, number> = {
  LOW: 10,
  MEDIUM: 30,
  HIGH: 60,
  CRITICAL: 85,
};

const severityRank: Record<IntelSeverity, number> = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
  CRITICAL: 3,
};

export function scoreIntelForUser(intel: ScorableIntel, context: UserContext): number {
  let score = severityWeights[intel.severity];

  if (context.subscribedSourceSlugs.includes(intel.feedSourceSlug)) {
    score += 20;
  }

  if (intel.vulnerabilities.some((v) => v.exploited)) {
    score += 15;
  }

  if (intel.vulnerabilities.some((v) => v.patched)) {
    score -= 8;
  }

  if (!context.includeRecommendations) {
    score -= 3;
  }

  if (severityRank[intel.severity] < severityRank[context.minimumSeverity]) {
    score -= 30;
  }

  return Math.max(0, Math.min(100, score));
}
