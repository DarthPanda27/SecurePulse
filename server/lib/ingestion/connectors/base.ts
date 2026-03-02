import type { ConnectorSlug, Confidence, NormalizedRecord, ParsedEnvelope } from "../types";

export interface IngestionConnector<TRaw = unknown, TParsed = unknown> {
  readonly slug: ConnectorSlug;
  readonly sourceName: string;
  fetch(signal?: AbortSignal): Promise<TRaw>;
  parse(raw: TRaw): ParsedEnvelope<TParsed>;
  normalize(parsed: TParsed): NormalizedRecord;
  confidence(record: NormalizedRecord): Confidence;
}

export type HttpFetcher = (url: string, init?: RequestInit) => Promise<Response>;

export abstract class JsonHttpConnector<TRaw, TParsed> implements IngestionConnector<TRaw, TParsed> {
  protected constructor(
    public readonly slug: ConnectorSlug,
    public readonly sourceName: string,
    protected readonly url: string,
    protected readonly fetcher: HttpFetcher = fetch,
  ) {}

  async fetch(signal?: AbortSignal): Promise<TRaw> {
    const response = await this.fetcher(this.url, { signal });
    if (!response.ok) {
      throw new Error(`${this.slug} fetch failed: ${response.status} ${response.statusText}`);
    }
    return (await response.json()) as TRaw;
  }

  abstract parse(raw: TRaw): ParsedEnvelope<TParsed>;
  abstract normalize(parsed: TParsed): NormalizedRecord;
  abstract confidence(record: NormalizedRecord): Confidence;
}
