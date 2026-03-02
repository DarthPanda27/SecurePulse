export type Severity = "critical" | "high" | "medium" | "low";

export interface IntelItem {
  id: string;
  kind: "cve" | "campaign" | "advisory";
  title: string;
  summary: string;
  source: string;
  sourceUrl: string;
  publishedAt: string;
  vendorTags: string[];
  productTags: string[];
  cvss?: number;
  epss?: number;
  kev?: boolean;
  exploitObserved?: boolean;
  confidence: number;
}

export interface UserContext {
  subscribedVendors: string[];
  subscribedProducts: string[];
}

export interface RelevanceScore {
  severityScore: number;
  relevanceScore: number;
  freshnessScore: number;
  confidenceScore: number;
  impactScore: number;
  totalScore: number;
}

export interface BriefCard {
  id: string;
  cardType:
    | "Top Risk Today"
    | "Critical CVEs to Review"
    | "Active Threat Campaigns"
    | "Vendor/Product Alerts"
    | "Recommended Actions";
  severity: Severity;
  title: string;
  bullets: string[];
  whyItMatters: string;
  suggestedAction: string;
  confidenceLabel: "HIGH" | "MEDIUM" | "LOW";
  sources: Array<{ title: string; url: string }>;
  score: number;
}

const now = Date.now();

export const intelDataset: IntelItem[] = [
  {
    id: "intel-001",
    kind: "cve",
    title: "CVE-2024-21893 actively exploited in Ivanti Connect Secure",
    summary:
      "SSRF vulnerability in SAML component can enable auth bypass and internal resource access.",
    source: "CISA KEV",
    sourceUrl: "https://www.cisa.gov/known-exploited-vulnerabilities-catalog",
    publishedAt: new Date(now - 1000 * 60 * 60 * 3).toISOString(),
    vendorTags: ["Ivanti"],
    productTags: ["Connect Secure"],
    cvss: 8.2,
    epss: 0.92,
    kev: true,
    exploitObserved: true,
    confidence: 0.9,
  },
  {
    id: "intel-002",
    kind: "campaign",
    title: "Scattered Spider shifts to cloud identity targeting",
    summary:
      "Recent campaigns leverage social engineering and MFA fatigue against identity admins.",
    source: "Threat Research Blog",
    sourceUrl: "https://example.com/scattered-spider-identity",
    publishedAt: new Date(now - 1000 * 60 * 60 * 8).toISOString(),
    vendorTags: ["Microsoft", "Okta"],
    productTags: ["Entra ID", "Okta Workforce Identity"],
    confidence: 0.72,
  },
  {
    id: "intel-003",
    kind: "advisory",
    title: "Fortinet advisory addresses SSL VPN RCE chain",
    summary:
      "Patch release mitigates a chaining path from auth bypass to remote execution in edge deployments.",
    source: "Fortinet Advisory",
    sourceUrl: "https://example.com/fortinet-advisory",
    publishedAt: new Date(now - 1000 * 60 * 60 * 30).toISOString(),
    vendorTags: ["Fortinet"],
    productTags: ["FortiGate"],
    cvss: 9.1,
    epss: 0.64,
    exploitObserved: false,
    confidence: 0.8,
  },
];

function computeFreshness(publishedAt: string): number {
  const ageHours = (Date.now() - new Date(publishedAt).getTime()) / (1000 * 60 * 60);
  const score = Math.exp(-Math.log(2) * (ageHours / 24));
  return Math.max(0, Math.min(1, score));
}

function computeSeverity(item: IntelItem): number {
  const cvssScore = item.cvss ? Math.min(item.cvss / 10, 1) : 0.45;
  const kevBoost = item.kev ? 0.2 : 0;
  const exploitBoost = item.exploitObserved ? 0.15 : 0;
  const epssBoost = item.epss ? Math.min(item.epss * 0.2, 0.2) : 0;
  return Math.min(1, cvssScore + kevBoost + exploitBoost + epssBoost);
}

function computeRelevance(item: IntelItem, user: UserContext): number {
  const vendorMatch = item.vendorTags.some((vendor) => user.subscribedVendors.includes(vendor));
  const productMatch = item.productTags.some((product) => user.subscribedProducts.includes(product));
  if (vendorMatch && productMatch) return 1;
  if (vendorMatch || productMatch) return 0.75;
  return 0.35;
}

function computeImpact(item: IntelItem): number {
  if (item.title.toLowerCase().includes("identity")) return 0.9;
  if (item.title.toLowerCase().includes("vpn")) return 0.85;
  if (item.kind === "cve") return 0.8;
  return 0.6;
}

export function scoreIntelItem(item: IntelItem, user: UserContext): RelevanceScore {
  const severityScore = computeSeverity(item);
  const relevanceScore = computeRelevance(item, user);
  const freshnessScore = computeFreshness(item.publishedAt);
  const confidenceScore = item.confidence;
  const impactScore = computeImpact(item);

  const totalScore =
    0.35 * severityScore +
    0.3 * relevanceScore +
    0.15 * freshnessScore +
    0.1 * confidenceScore +
    0.1 * impactScore;

  return {
    severityScore,
    relevanceScore,
    freshnessScore,
    confidenceScore,
    impactScore,
    totalScore,
  };
}

function severityFromScore(score: number): Severity {
  if (score >= 0.85) return "critical";
  if (score >= 0.7) return "high";
  if (score >= 0.5) return "medium";
  return "low";
}

function confidenceLabel(confidence: number): "HIGH" | "MEDIUM" | "LOW" {
  if (confidence >= 0.8) return "HIGH";
  if (confidence >= 0.6) return "MEDIUM";
  return "LOW";
}

export function buildDailyBrief(user: UserContext) {
  const ranked = intelDataset
    .map((item) => ({ item, score: scoreIntelItem(item, user) }))
    .sort((a, b) => b.score.totalScore - a.score.totalScore);

  const cards: BriefCard[] = ranked.slice(0, 5).map(({ item, score }, index) => {
    const cardType: BriefCard["cardType"] =
      index === 0
        ? "Top Risk Today"
        : item.kind === "cve"
          ? "Critical CVEs to Review"
          : item.kind === "campaign"
            ? "Active Threat Campaigns"
            : "Vendor/Product Alerts";

    return {
      id: item.id,
      cardType,
      severity: severityFromScore(score.totalScore),
      title: item.title,
      bullets: [
        item.summary,
        `Source: ${item.source}. Published ${new Date(item.publishedAt).toLocaleString()}.`,
      ],
      whyItMatters:
        score.relevanceScore >= 0.75
          ? "This aligns with your subscribed vendors/products and has elevated urgency."
          : "Track this item for ecosystem risk and potential downstream exposure.",
      suggestedAction:
        item.kind === "campaign"
          ? "Harden identity admin protections and review suspicious MFA patterns."
          : "Validate patch posture and prioritize remediation in your next change window.",
      confidenceLabel: confidenceLabel(score.confidenceScore),
      sources: [{ title: item.source, url: item.sourceUrl }],
      score: Number(score.totalScore.toFixed(3)),
    };
  });

  const tldr =
    cards.length > 0
      ? `Top risk: ${cards[0].title}. Prioritize vendor-linked vulnerabilities first, then review identity campaign defenses.`
      : "No high-signal updates detected in the current ingest window.";

  return {
    generatedAt: new Date().toISOString(),
    tldr,
    cards,
  };
}
