import type { PrismaClient } from "@prisma/client";
import type { ConnectorSlug, NormalizedRecord } from "./types";

export interface IngestionStore {
  persist(record: NormalizedRecord): Promise<void>;
  markSuccess(sourceSlug: ConnectorSlug): Promise<void>;
  markFailure(sourceSlug: ConnectorSlug): Promise<void>;
}

export class PrismaIngestionStore implements IngestionStore {
  constructor(private readonly prisma: PrismaClient) {}

  private get db(): any {
    return this.prisma as any;
  }

  async persist(record: NormalizedRecord): Promise<void> {
    const source = await this.db.feedSource.upsert({
      where: { slug: record.sourceSlug },
      update: { name: sourceName(record.sourceSlug) },
      create: {
        slug: record.sourceSlug,
        name: sourceName(record.sourceSlug),
        baseUrl: record.sourceUrl,
      },
    });

    const intelItem = await this.db.intelItem.upsert({
      where: {
        feedSourceId_externalId: {
          feedSourceId: source.id,
          externalId: record.externalId,
        },
      },
      create: {
        feedSourceId: source.id,
        externalId: record.externalId,
        title: record.title,
        summary: record.summary,
        sourceUrl: record.sourceUrl,
        severity: record.severity,
        publishedAt: record.publishedAt,
      },
      update: {
        title: record.title,
        summary: record.summary,
        sourceUrl: record.sourceUrl,
        severity: record.severity,
        publishedAt: record.publishedAt,
      },
    });

    if (record.cveId) {
      await this.db.vulnerability.upsert({
        where: { cveId: record.cveId },
        create: {
          intelItemId: intelItem.id,
          cveId: record.cveId,
          vendor: record.vendor,
          product: record.product,
          cvssScore: record.cvssScore,
          exploited: record.exploited ?? false,
          patched: record.patched ?? false,
          publishedAt: record.publishedAt,
        },
        update: {
          intelItemId: intelItem.id,
          vendor: record.vendor,
          product: record.product,
          cvssScore: record.cvssScore,
          exploited: record.exploited ?? false,
          patched: record.patched ?? false,
          publishedAt: record.publishedAt,
        },
      });
    }
  }

  async markSuccess(sourceSlug: ConnectorSlug): Promise<void> {
    await this.db.feedSource.updateMany({
      where: { slug: sourceSlug },
      data: { lastSuccessAt: new Date(), errorStreak: 0 },
    });
  }

  async markFailure(sourceSlug: ConnectorSlug): Promise<void> {
    const source = await this.db.feedSource.findUnique({ where: { slug: sourceSlug } });
    if (!source) {
      await this.db.feedSource.create({
        data: {
          slug: sourceSlug,
          name: sourceName(sourceSlug),
          errorStreak: 1,
          lastErrorAt: new Date(),
        },
      });
      return;
    }

    await this.db.feedSource.update({
      where: { slug: sourceSlug },
      data: {
        lastErrorAt: new Date(),
        errorStreak: (source.errorStreak ?? 0) + 1,
      },
    });
  }
}

function sourceName(slug: ConnectorSlug): string {
  if (slug === "nvd") return "NVD";
  if (slug === "cisa-kev") return "CISA KEV";
  return "EPSS";
}
