declare module "@prisma/client" {
  export type FeedType =
    | "RSS"
    | "API"
    | "VENDOR_ADVISORY"
    | "NVD"
    | "CISA_KEV"
    | "EPSS"
    | "BLOG";

  export type IntelKind = "CVE" | "ADVISORY" | "CAMPAIGN" | "THREAT";

  export class PrismaClient {
    constructor(options?: unknown);
    feedSource: {
      upsert(args: unknown): Promise<{ id: string }>;
    };
    intelItem: {
      upsert(args: unknown): Promise<{ id: string; title: string; summary: string | null; sourceUrl: string }>;
      update(args: unknown): Promise<unknown>;
    };
    vulnerability: {
      upsert(args: unknown): Promise<{ id: string }>;
    };
    dailyBrief: {
      create(args: unknown): Promise<{ id: string }>;
    };
    subscription: {
      upsert(args: unknown): Promise<unknown>;
    };
    userPreference: {
      upsert(args: unknown): Promise<unknown>;
    };
    $disconnect(): Promise<void>;
  }
}
