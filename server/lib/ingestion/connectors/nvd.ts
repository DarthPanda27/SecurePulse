import { JsonHttpConnector } from "./base";
import type { Confidence, NormalizedRecord, ParsedEnvelope } from "../types";

type NvdMetric = {
  cvssData?: {
    baseScore?: number;
  };
};

type NvdItem = {
  cve?: {
    id?: string;
    descriptions?: Array<{ lang?: string; value?: string }>;
    metrics?: {
      cvssMetricV31?: NvdMetric[];
      cvssMetricV30?: NvdMetric[];
      cvssMetricV2?: NvdMetric[];
    };
    published?: string;
  };
};

type NvdResponse = { vulnerabilities?: NvdItem[] };

export class NvdConnector extends JsonHttpConnector<NvdResponse, NvdItem> {
  constructor(url = "https://services.nvd.nist.gov/rest/json/cves/2.0?resultsPerPage=50", fetcher?: typeof fetch) {
    super("nvd", "NVD", url, fetcher);
  }

  parse(raw: NvdResponse): ParsedEnvelope<NvdItem> {
    return { items: raw.vulnerabilities ?? [], fetchedAt: new Date() };
  }

  normalize(item: NvdItem): NormalizedRecord {
    const cveId = item.cve?.id ?? "UNKNOWN";
    const description = item.cve?.descriptions?.find((desc) => desc.lang === "en")?.value ?? "No description";
    const score =
      item.cve?.metrics?.cvssMetricV31?.[0]?.cvssData?.baseScore ??
      item.cve?.metrics?.cvssMetricV30?.[0]?.cvssData?.baseScore ??
      item.cve?.metrics?.cvssMetricV2?.[0]?.cvssData?.baseScore;

    const severity = scoreToSeverity(score);
    const confidence: Confidence = score !== undefined ? "HIGH" : "MEDIUM";

    return {
      sourceSlug: "nvd",
      externalId: cveId,
      cveId,
      title: `NVD ${cveId}`,
      summary: description,
      sourceUrl: `https://nvd.nist.gov/vuln/detail/${cveId}`,
      severity,
      confidence,
      publishedAt: new Date(item.cve?.published ?? Date.now()),
      cvssScore: score,
      exploited: false,
      patched: false,
      raw: item,
    };
  }

  confidence(record: NormalizedRecord): Confidence {
    return record.cvssScore !== undefined ? "HIGH" : "MEDIUM";
  }
}

function scoreToSeverity(score?: number): NormalizedRecord["severity"] {
  if (score === undefined) return "LOW";
  if (score >= 9) return "CRITICAL";
  if (score >= 7) return "HIGH";
  if (score >= 4) return "MEDIUM";
  return "LOW";
}
