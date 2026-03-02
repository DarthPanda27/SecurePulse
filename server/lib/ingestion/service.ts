import type { IngestionConnector } from "./connectors/base";
import type { DeadLetterQueue } from "./dlq";
import { withRetry } from "./retry";
import type { IngestionStore } from "./store";

export interface IngestionServiceOptions {
  store: IngestionStore;
  dlq: DeadLetterQueue;
  connectors: IngestionConnector[];
  retry: {
    maxAttempts: number;
    baseDelayMs: number;
    maxDelayMs: number;
  };
}

export class IngestionService {
  constructor(private readonly options: IngestionServiceOptions) {}

  async ingestAll(): Promise<void> {
    for (const connector of this.options.connectors) {
      await this.ingestConnector(connector.slug);
    }
  }

  async ingestConnector(slug: string): Promise<void> {
    const connector = this.options.connectors.find((entry) => entry.slug === slug);
    if (!connector) throw new Error(`Unknown connector: ${slug}`);

    try {
      const raw = await withRetry(() => connector.fetch(), this.options.retry);
      const parsed = connector.parse(raw);
      for (const item of parsed.items) {
        try {
          const normalized = connector.normalize(item);
          normalized.confidence = connector.confidence(normalized);
          await this.options.store.persist(normalized);
        } catch (error) {
          await this.options.dlq.enqueue({
            sourceSlug: connector.slug,
            stage: "persist",
            payload: item,
            errorMessage: error instanceof Error ? error.message : "persist failure",
          });
        }
      }
      await this.options.store.markSuccess(connector.slug);
    } catch (error) {
      await this.options.store.markFailure(connector.slug);
      await this.options.dlq.enqueue({
        sourceSlug: connector.slug,
        stage: "fetch",
        payload: { message: "connector run failure" },
        errorMessage: error instanceof Error ? error.message : "connector failure",
      });
      throw error;
    }
  }

  async replayDeadLetter(id: string): Promise<boolean> {
    return this.options.dlq.replay(id, async () => undefined);
  }
}
