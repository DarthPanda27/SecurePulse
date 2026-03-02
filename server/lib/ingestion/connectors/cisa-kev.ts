import { JsonHttpConnector } from "./base";
import type { Confidence, NormalizedRecord, ParsedEnvelope } from "../types";

type KevItem = {
  cveID: string;
  vendorProject?: string;
  product?: string;
  vulnerabilityName?: string;
  shortDescription?: string;
  dateAdded?: string;
  dueDate?: string;
  knownRansomwareCampaignUse?: string;
};

type KevResponse = { vulnerabilities?: KevItem[] };

export class CisaKevConnector extends JsonHttpConnector<KevResponse, KevItem> {
  constructor(url = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json", fetcher?: typeof fetch) {
    super("cisa-kev", "CISA KEV", url, fetcher);
  }

  parse(raw: KevResponse): ParsedEnvelope<KevItem> {
    return { items: raw.vulnerabilities ?? [], fetchedAt: new Date() };
  }

  normalize(item: KevItem): NormalizedRecord {
    const exploited = true;
    const patched = Boolean(item.dueDate);
    const summary = item.shortDescription ?? item.vulnerabilityName ?? "No description";

    const record: NormalizedRecord = {
      sourceSlug: "cisa-kev",
      externalId: item.cveID,
      cveId: item.cveID,
      title: item.vulnerabilityName ?? `CISA KEV ${item.cveID}`,
      summary,
      sourceUrl: "https://www.cisa.gov/known-exploited-vulnerabilities-catalog",
      severity: item.knownRansomwareCampaignUse === "Known" ? "CRITICAL" : "HIGH",
      confidence: "HIGH",
      publishedAt: new Date(item.dateAdded ?? Date.now()),
      vendor: item.vendorProject,
      product: item.product,
      exploited,
      patched,
      raw: item,
    };

    record.confidence = this.confidence(record);
    return record;
  }

  confidence(record: NormalizedRecord): Confidence {
    return record.exploited ? "HIGH" : "MEDIUM";
  }
}
