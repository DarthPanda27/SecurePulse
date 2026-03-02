import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { type IntelSeverity } from "../severity";
import { createApp } from "../../app";

type FeedSource = { id: string; slug: string; name: string };
type Subscription = {
  id: string;
  feedSourceId: string;
  subscriberKey: string;
  channel: string;
  endpoint: string;
  isActive: boolean;
  feedSource: FeedSource;
};
type Preference = {
  id: string;
  subscriptionId: string;
  timezone: string;
  digestHourUtc: number;
  minimumSeverity: IntelSeverity;
  includeRecommendations: boolean;
};

function createFakeDb() {
  const feeds: FeedSource[] = [{ id: "feed-1", slug: "vendor-advisories", name: "Vendor" }];
  const subscriptions: Subscription[] = [];
  const preferences: Preference[] = [];
  const intelItems = [
    {
      id: "intel-1",
      title: "Critical bug",
      severity: "CRITICAL" as IntelSeverity,
      publishedAt: new Date("2026-01-01"),
      feedSource: feeds[0],
      vulnerabilities: [{ exploited: true, patched: false, vendor: "Ivanti", product: "Connect Secure" }],
    },
  ];

  return {
    subscription: {
      findMany: async ({ where }: any) => {
        const rows = subscriptions.filter((s) => {
          if (where?.subscriberKey && s.subscriberKey !== where.subscriberKey) return false;
          if (where?.isActive !== undefined && s.isActive !== where.isActive) return false;
          return true;
        });
        return rows.map((row) => ({
          ...row,
          userPreference: preferences.find((p) => p.subscriptionId === row.id) ?? null,
          feedSource: row.feedSource,
        }));
      },
      create: async ({ data }: any) => {
        const next: Subscription = {
          id: `sub-${subscriptions.length + 1}`,
          ...data,
          isActive: data.isActive ?? true,
          feedSource: feeds.find((f) => f.id === data.feedSourceId)!,
        };
        subscriptions.push(next);
        return next;
      },
      update: async ({ where, data }: any) => {
        const row = subscriptions.find((s) => s.id === where.id)!;
        Object.assign(row, data);
        return row;
      },
      delete: async ({ where }: any) => {
        const idx = subscriptions.findIndex((s) => s.id === where.id);
        subscriptions.splice(idx, 1);
      },
    },
    userPreference: {
      create: async ({ data }: any) => {
        const next: Preference = { id: `pref-${preferences.length + 1}`, ...data };
        preferences.push(next);
        return next;
      },
      findUnique: async ({ where }: any) => preferences.find((p) => p.subscriptionId === where.subscriptionId) ?? null,
      update: async ({ where, data }: any) => {
        const row = preferences.find((p) => p.subscriptionId === where.subscriptionId)!;
        Object.assign(row, data);
        return row;
      },
      delete: async ({ where }: any) => {
        const idx = preferences.findIndex((p) => p.subscriptionId === where.subscriptionId);
        preferences.splice(idx, 1);
      },
    },
    intelItem: {
      findMany: async () => intelItems,
    },
  };
}

async function withServer(fn: (baseUrl: string) => Promise<void>) {
  const app = createApp(createFakeDb() as any);
  const server = createServer(app);

  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("unexpected address");
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    await fn(baseUrl);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  }
}

test("subscription + preferences CRUD and personalized intel contract", async () => {
  await withServer(async (baseUrl) => {
    const badSubResp = await fetch(`${baseUrl}/api/subscriptions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ feedSourceId: "", subscriberKey: "", channel: "", endpoint: "" }),
    });
    assert.equal(badSubResp.status, 400);

    const subResp = await fetch(`${baseUrl}/api/subscriptions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ feedSourceId: "feed-1", subscriberKey: "alice@example.com", channel: "email", endpoint: "alice@example.com" }),
    });
    assert.equal(subResp.status, 201);
    const subscription = await subResp.json();

    const prefResp = await fetch(`${baseUrl}/api/preferences`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        subscriptionId: subscription.id,
        timezone: "UTC",
        digestHourUtc: 8,
        minimumSeverity: "HIGH",
        includeRecommendations: true,
      }),
    });
    assert.equal(prefResp.status, 201);

    const intelResp = await fetch(`${baseUrl}/api/users/alice@example.com/personalized-intel`);
    assert.equal(intelResp.status, 200);
    const intelPayload = await intelResp.json();
    assert.equal(intelPayload.context.minimumSeverity, "HIGH");
    assert.equal(intelPayload.items.length, 1);

    const patchPrefResp = await fetch(`${baseUrl}/api/preferences/${subscription.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ digestHourUtc: 23, includeRecommendations: false }),
    });
    assert.equal(patchPrefResp.status, 200);

    const deletePrefResp = await fetch(`${baseUrl}/api/preferences/${subscription.id}`, { method: "DELETE" });
    assert.equal(deletePrefResp.status, 204);

    const deleteSubResp = await fetch(`${baseUrl}/api/subscriptions/${subscription.id}`, { method: "DELETE" });
    assert.equal(deleteSubResp.status, 204);
  });
});
