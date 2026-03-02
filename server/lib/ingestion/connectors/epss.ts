import { JsonHttpConnector } from "./base";
import type { Confidence, NormalizedRecord, ParsedEnvelope } from "../types";

type EpssItem = {
  cve: string;
  epss: string;
  percentile: string;
  date?: string;
};

type EpssResponse = {
  data?: EpssItem[];
};

export class EpssConnector extends JsonHttpConnector<EpssResponse, EpssItem> {
  constructor(url = "https://api.first.org/data/v1/epss", fetcher?: typeof fetch) {
    super("epss", "EPSS", url, fetcher);
  }

  parse(raw: EpssResponse): ParsedEnvelope<EpssItem> {
    return { items: raw.data ?? [], fetchedAt: new Date() };
  }

  normalize(item: EpssItem): NormalizedRecord {
    const probability = Number(item.epss);
    const percentile = Number(item.percentile);
    const record: NormalizedRecord = {
      sourceSlug: "epss",
      externalId: `${item.cve}:${item.date ?? "latest"}`,
      cveId: item.cve,
      title: `EPSS score for ${item.cve}`,
      summary: `EPSS probability ${probability.toFixed(4)} (percentile ${percentile.toFixed(4)})`,
      sourceUrl: `https://api.first.org/data/v1/epss?cve=${item.cve}`,
      severity: percentile >= 0.98 ? "CRITICAL" : percentile >= 0.9 ? "HIGH" : percentile >= 0.6 ? "MEDIUM" : "LOW",
      confidence: "MEDIUM",
      publishedAt: new Date(item.date ?? Date.now()),
      cvssScore: probability * 10,
      exploited: probability >= 0.7,
      patched: false,
      raw: item,
    };

    record.confidence = this.confidence(record);
    return record;
  }

  confidence(record: NormalizedRecord): Confidence {
    return record.cvssScore && record.cvssScore >= 7 ? "HIGH" : "MEDIUM";
  }
}
