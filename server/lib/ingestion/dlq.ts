import type { PrismaClient } from "@prisma/client";
import type { ConnectorSlug, NormalizedRecord } from "./types";

export interface DeadLetterRecord {
  id: string;
  sourceSlug: ConnectorSlug;
  stage: "fetch" | "parse" | "normalize" | "persist";
  payload: unknown;
  errorMessage: string;
  createdAt: Date;
  replayedAt: Date | null;
}

export interface DeadLetterQueue {
  enqueue(input: Omit<DeadLetterRecord, "id" | "createdAt" | "replayedAt">): Promise<DeadLetterRecord>;
  replay(id: string, handler: (payload: unknown) => Promise<NormalizedRecord | void>): Promise<boolean>;
  listPending(): Promise<DeadLetterRecord[]>;
}

export class InMemoryDeadLetterQueue implements DeadLetterQueue {
  private items = new Map<string, DeadLetterRecord>();

  async enqueue(input: Omit<DeadLetterRecord, "id" | "createdAt" | "replayedAt">): Promise<DeadLetterRecord> {
    const item: DeadLetterRecord = {
      ...input,
      id: `dlq_${this.items.size + 1}`,
      createdAt: new Date(),
      replayedAt: null,
    };
    this.items.set(item.id, item);
    return item;
  }

  async replay(id: string, handler: (payload: unknown) => Promise<NormalizedRecord | void>): Promise<boolean> {
    const item = this.items.get(id);
    if (!item || item.replayedAt) return false;
    await handler(item.payload);
    item.replayedAt = new Date();
    this.items.set(id, item);
    return true;
  }

  async listPending(): Promise<DeadLetterRecord[]> {
    return [...this.items.values()].filter((item) => item.replayedAt === null);
  }
}

export class PrismaDeadLetterQueue implements DeadLetterQueue {
  constructor(private readonly prisma: PrismaClient) {}

  private get db(): any {
    return this.prisma as any;
  }

  async enqueue(input: Omit<DeadLetterRecord, "id" | "createdAt" | "replayedAt">): Promise<DeadLetterRecord> {
    const created = await this.db.deadLetterItem.create({
      data: {
        sourceSlug: input.sourceSlug,
        stage: input.stage,
        payload: input.payload as object,
        errorMessage: input.errorMessage,
      },
    });

    return {
      ...created,
      sourceSlug: created.sourceSlug as ConnectorSlug,
      stage: created.stage as DeadLetterRecord["stage"],
    };
  }

  async replay(id: string, handler: (payload: unknown) => Promise<NormalizedRecord | void>): Promise<boolean> {
    const item = await this.db.deadLetterItem.findUnique({ where: { id } });
    if (!item || item.replayedAt) return false;
    await handler(item.payload);
    await this.db.deadLetterItem.update({ where: { id }, data: { replayedAt: new Date() } });
    return true;
  }

  async listPending(): Promise<DeadLetterRecord[]> {
    const items = await this.db.deadLetterItem.findMany({
      where: { replayedAt: null },
      orderBy: { createdAt: "asc" },
    });

    return items.map((item) => ({
      ...item,
      sourceSlug: item.sourceSlug as ConnectorSlug,
      stage: item.stage as DeadLetterRecord["stage"],
    }));
  }
}
