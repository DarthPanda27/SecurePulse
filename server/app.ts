import express from "express";
import type { PrismaClient } from "@prisma/client";
import { scoreIntelForUser, type UserContext } from "./lib/personalization";
import { INTEL_SEVERITIES, type IntelSeverity } from "./lib/severity";
import { GeminiDailyBriefService } from "./lib/briefing";

const severityOrder: Record<IntelSeverity, number> = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
  CRITICAL: 3,
};

type DbClient = Pick<
  PrismaClient,
  "subscription" | "userPreference" | "intelItem"
>;

const isNonEmptyString = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
const isBoolean = (value: unknown): value is boolean => typeof value === "boolean";
const isSeverity = (value: unknown): value is IntelSeverity =>
  typeof value === "string" && (INTEL_SEVERITIES as readonly string[]).includes(value);

function parseSubscriptionPayload(payload: unknown, partial = false) {
  if (!payload || typeof payload !== "object") return { error: "payload must be an object" };
  const body = payload as Record<string, unknown>;

  const requiredFields = ["feedSourceId", "subscriberKey", "channel", "endpoint"];
  if (!partial) {
    for (const field of requiredFields) {
      if (!isNonEmptyString(body[field])) return { error: `invalid ${field}` };
    }
  }

  if (body.feedSourceId !== undefined && !isNonEmptyString(body.feedSourceId)) return { error: "invalid feedSourceId" };
  if (body.subscriberKey !== undefined && !isNonEmptyString(body.subscriberKey)) return { error: "invalid subscriberKey" };
  if (body.channel !== undefined && !isNonEmptyString(body.channel)) return { error: "invalid channel" };
  if (body.endpoint !== undefined && !isNonEmptyString(body.endpoint)) return { error: "invalid endpoint" };
  if (body.isActive !== undefined && !isBoolean(body.isActive)) return { error: "invalid isActive" };

  return {
    value: {
      feedSourceId: body.feedSourceId,
      subscriberKey: body.subscriberKey,
      channel: body.channel,
      endpoint: body.endpoint,
      isActive: body.isActive,
    },
  };
}

function parsePreferencePayload(payload: unknown, partial = false) {
  if (!payload || typeof payload !== "object") return { error: "payload must be an object" };
  const body = payload as Record<string, unknown>;

  if (!partial && !isNonEmptyString(body.subscriptionId)) return { error: "invalid subscriptionId" };
  if (body.subscriptionId !== undefined && !isNonEmptyString(body.subscriptionId)) return { error: "invalid subscriptionId" };
  if (body.timezone !== undefined && !isNonEmptyString(body.timezone)) return { error: "invalid timezone" };
  if (
    body.digestHourUtc !== undefined &&
    (typeof body.digestHourUtc !== "number" || !Number.isInteger(body.digestHourUtc) || body.digestHourUtc < 0 || body.digestHourUtc > 23)
  ) {
    return { error: "invalid digestHourUtc" };
  }
  if (body.minimumSeverity !== undefined && !isSeverity(body.minimumSeverity)) return { error: "invalid minimumSeverity" };
  if (body.includeRecommendations !== undefined && !isBoolean(body.includeRecommendations)) {
    return { error: "invalid includeRecommendations" };
  }

  return {
    value: {
      subscriptionId: body.subscriptionId,
      timezone: body.timezone,
      digestHourUtc: body.digestHourUtc,
      minimumSeverity: body.minimumSeverity,
      includeRecommendations: body.includeRecommendations,
    },
  };
}

async function loadUserContext(db: DbClient, subscriberKey: string): Promise<UserContext> {
  const activeSubscriptions = await db.subscription.findMany({
    where: { subscriberKey, isActive: true },
    include: {
      feedSource: true,
      userPreference: true,
    },
  });

  if (activeSubscriptions.length === 0) {
    return {
      subscribedSourceSlugs: [],
      minimumSeverity: "MEDIUM",
      includeRecommendations: true,
    };
  }

  let minimumSeverity: IntelSeverity = "MEDIUM";
  let includeRecommendations = true;

  for (const sub of activeSubscriptions) {
    if (sub.userPreference) {
      if (severityOrder[sub.userPreference.minimumSeverity] > severityOrder[minimumSeverity]) {
        minimumSeverity = sub.userPreference.minimumSeverity;
      }
      includeRecommendations = includeRecommendations && sub.userPreference.includeRecommendations;
    }
  }

  return {
    subscribedSourceSlugs: [...new Set(activeSubscriptions.map((sub: any) => String(sub.feedSource.slug)))] as string[],
    minimumSeverity,
    includeRecommendations,
  };
}

export function createApp(db: DbClient) {
  const app = express();
  const dailyBriefService = new GeminiDailyBriefService();
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", app: "SecurePulse MVP" });
  });

  app.get("/api/users/:subscriberKey/context", async (req, res) => {
    if (!isNonEmptyString(req.params.subscriberKey)) {
      return res.status(400).json({ error: "invalid subscriberKey" });
    }
    const context = await loadUserContext(db, req.params.subscriberKey);
    return res.json(context);
  });

  app.get("/api/users/:subscriberKey/personalized-intel", async (req, res) => {
    if (!isNonEmptyString(req.params.subscriberKey)) {
      return res.status(400).json({ error: "invalid subscriberKey" });
    }

    const context = await loadUserContext(db, req.params.subscriberKey);
    const rows = await db.intelItem.findMany({
      include: {
        feedSource: true,
        vulnerabilities: true,
      },
      orderBy: { publishedAt: "desc" },
      take: 50,
    });

    const scored = rows
      .map((row) => ({
        id: row.id,
        title: row.title,
        severity: row.severity,
        feedSourceSlug: row.feedSource.slug,
        publishedAt: row.publishedAt,
        score: scoreIntelForUser(
          {
            id: row.id,
            title: row.title,
            severity: row.severity,
            feedSourceSlug: row.feedSource.slug,
            vulnerabilities: row.vulnerabilities,
          },
          context,
        ),
      }))
      .sort((a, b) => b.score - a.score || b.publishedAt.getTime() - a.publishedAt.getTime());

    return res.json({ context, items: scored });
  });

  app.get("/api/users/:subscriberKey/daily-brief", async (req, res) => {
    if (!isNonEmptyString(req.params.subscriberKey)) {
      return res.status(400).json({ error: "invalid subscriberKey" });
    }

    const rows = await db.intelItem.findMany({
      include: {
        feedSource: true,
      },
      orderBy: { publishedAt: "desc" },
      take: 20,
    });

    const brief = await dailyBriefService.generateDailyBrief(
      rows.map((row) => ({
        id: row.id,
        title: row.title,
        summary: row.summary,
        severity: row.severity,
        sourceUrl: row.sourceUrl,
        publishedAt: row.publishedAt,
      })),
    );

    return res.json(brief);
  });

  app.get("/api/subscriptions", async (req, res) => {
    const subscriberKey = req.query.subscriberKey;
    if (!isNonEmptyString(subscriberKey)) return res.status(400).json({ error: "invalid subscriberKey query" });

    const rows = await db.subscription.findMany({ where: { subscriberKey }, include: { userPreference: true, feedSource: true } });
    return res.json(rows);
  });

  app.post("/api/subscriptions", async (req, res) => {
    const parsed = parseSubscriptionPayload(req.body, false);
    if (parsed.error) return res.status(400).json({ error: parsed.error });

    const created = await db.subscription.create({ data: parsed.value as any });
    return res.status(201).json(created);
  });

  app.patch("/api/subscriptions/:id", async (req, res) => {
    if (!isNonEmptyString(req.params.id)) return res.status(400).json({ error: "invalid id" });
    const parsed = parseSubscriptionPayload(req.body, true);
    if (parsed.error) return res.status(400).json({ error: parsed.error });

    const updated = await db.subscription.update({ where: { id: req.params.id }, data: parsed.value as any });
    return res.json(updated);
  });

  app.delete("/api/subscriptions/:id", async (req, res) => {
    if (!isNonEmptyString(req.params.id)) return res.status(400).json({ error: "invalid id" });
    await db.subscription.delete({ where: { id: req.params.id } });
    return res.status(204).send();
  });

  app.post("/api/preferences", async (req, res) => {
    const parsed = parsePreferencePayload(req.body, false);
    if (parsed.error) return res.status(400).json({ error: parsed.error });

    const created = await db.userPreference.create({ data: parsed.value as any });
    return res.status(201).json(created);
  });

  app.get("/api/preferences/:subscriptionId", async (req, res) => {
    if (!isNonEmptyString(req.params.subscriptionId)) return res.status(400).json({ error: "invalid subscriptionId" });
    const row = await db.userPreference.findUnique({ where: { subscriptionId: req.params.subscriptionId } });
    if (!row) return res.status(404).json({ error: "not found" });
    return res.json(row);
  });

  app.patch("/api/preferences/:subscriptionId", async (req, res) => {
    if (!isNonEmptyString(req.params.subscriptionId)) return res.status(400).json({ error: "invalid subscriptionId" });
    const parsed = parsePreferencePayload(req.body, true);
    if (parsed.error) return res.status(400).json({ error: parsed.error });

    const updated = await db.userPreference.update({ where: { subscriptionId: req.params.subscriptionId }, data: parsed.value as any });
    return res.json(updated);
  });

  app.delete("/api/preferences/:subscriptionId", async (req, res) => {
    if (!isNonEmptyString(req.params.subscriptionId)) return res.status(400).json({ error: "invalid subscriptionId" });
    await db.userPreference.delete({ where: { subscriptionId: req.params.subscriptionId } });
    return res.status(204).send();
  });

  return app;
}
