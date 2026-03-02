import type { ConnectorSlug, NormalizedRecord, SourceHealthSnapshot } from "./types";
import type { IngestionStore } from "./store";

export class InMemoryIngestionStore implements IngestionStore {
  public records = new Map<string, NormalizedRecord>();
  public health = new Map<ConnectorSlug, SourceHealthSnapshot>();

  async persist(record: NormalizedRecord): Promise<void> {
    const key = `${record.sourceSlug}:${record.externalId}`;
    this.records.set(key, record);
  }

  async markSuccess(sourceSlug: ConnectorSlug): Promise<void> {
    const previous = this.health.get(sourceSlug);
    this.health.set(sourceSlug, {
      lastSuccessAt: new Date(),
      lastErrorAt: previous?.lastErrorAt ?? null,
      errorStreak: 0,
    });
  }

  async markFailure(sourceSlug: ConnectorSlug): Promise<void> {
    const previous = this.health.get(sourceSlug);
    this.health.set(sourceSlug, {
      lastSuccessAt: previous?.lastSuccessAt ?? null,
      lastErrorAt: new Date(),
      errorStreak: (previous?.errorStreak ?? 0) + 1,
    });
  }
}
