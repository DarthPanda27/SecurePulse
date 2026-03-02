# SecurePulse v1 Implementation Blueprint

This document replaces the prior high-level audit with an implementation-ready product + engineering plan aligned to the original requirements.

## System Architecture (v1)

### Recommended stack (pragmatic + deployable)
- **Frontend + Backend**: Next.js (App Router) + TypeScript + React + Tailwind + shadcn/ui
- **API layer**: Next.js Route Handlers (`/app/api/*`) with Zod validation
- **DB**: Postgres + Prisma
- **Queue/Scheduler**: BullMQ + Redis (Upstash Redis in hosted envs)
- **Auth**: Auth.js (simple for v1, provider-flexible)
- **PWA**: `next-pwa` or Workbox-based SW + manifest
- **AI**: Google Gemini `gemini-3-flash` via `@google/genai`
- **Deployment**: Vercel (web/API) + Supabase (Postgres) + Upstash (Redis)

### Why Next.js over NestJS for v1
- Faster path to a single deployable codebase (UI + APIs).
- Easier PWA integration and edge-friendly delivery.
- Reduced operational overhead for a small v1 team.
- Domain services can still be structured in clean layers for future extraction.

### Runtime architecture
1. **Ingestion workers** pull sources on schedule and normalize into `IntelItem`/`Vulnerability`/`ThreatCampaign` tables.
2. **Scoring pipeline** computes severity, relevance, freshness, confidence, and impact hints.
3. **Daily brief job** clusters and summarizes items using Gemini with strict JSON schema outputs.
4. **API** serves brief cards, source evidence, preferences, and subscriptions.
5. **PWA client** fetches latest brief, caches for offline read, and renders card feed.

### Core service boundaries
- `source-connectors`: fetch/parse per source.
- `normalization`: canonical mapping + dedupe.
- `intel-scoring`: numeric scoring + explanation metadata.
- `brief-generation`: card assembly and LLM summarization.
- `delivery`: in-app now, push/email ready.

## Database Schema (Prisma models draft)

```prisma
enum Role {
  OWNER
  ADMIN
  MEMBER
}

enum FeedType {
  RSS
  API
  VENDOR_ADVISORY
  NVD
  CISA_KEV
  EPSS
  BLOG
}

enum SubscriptionType {
  VENDOR
  PRODUCT
  CATEGORY
  FEED
  KEYWORD
}

enum IntelKind {
  CVE
  ADVISORY
  CAMPAIGN
  THREAT_ACTOR
  MALWARE
  GENERAL
}

enum DeliveryChannel {
  IN_APP
  PUSH
  EMAIL
}

model User {
  id             String   @id @default(cuid())
  email          String   @unique
  name           String?
  role           Role     @default(MEMBER)
  orgId          String?
  org            Organization? @relation(fields: [orgId], references: [id])
  preferences    UserPreference?
  subscriptions  Subscription[]
  dailyBriefs    DailyBrief[]
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([orgId])
}

model Organization {
  id             String   @id @default(cuid())
  name           String
  users          User[]
  vendors        Vendor[]
  products       Product[]
  feedSources    FeedSource[]
  dailyBriefs    DailyBrief[]
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}

model Vendor {
  id             String   @id @default(cuid())
  orgId          String?
  org            Organization? @relation(fields: [orgId], references: [id])
  name           String
  normalizedName String
  externalRef    String?
  products       Product[]
  subscriptions  Subscription[]
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@unique([orgId, normalizedName])
  @@index([normalizedName])
}

model Product {
  id             String   @id @default(cuid())
  orgId          String?
  org            Organization? @relation(fields: [orgId], references: [id])
  vendorId       String
  vendor         Vendor   @relation(fields: [vendorId], references: [id])
  name           String
  normalizedName String
  categoryId     String?
  category       Category? @relation(fields: [categoryId], references: [id])
  subscriptions  Subscription[]
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@unique([vendorId, normalizedName])
  @@index([categoryId])
}

model Category {
  id             String   @id @default(cuid())
  name           String
  slug           String   @unique
  products       Product[]
  subscriptions  Subscription[]
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}

model FeedSource {
  id             String   @id @default(cuid())
  orgId          String?
  org            Organization? @relation(fields: [orgId], references: [id])
  name           String
  type           FeedType
  url            String?
  isEnabled      Boolean  @default(true)
  trustScore     Float    @default(0.5)
  pollIntervalMin Int     @default(60)
  lastSuccessAt  DateTime?
  lastErrorAt    DateTime?
  lastError      String?
  subscriptions  Subscription[]
  intelItems     IntelItem[]
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([type, isEnabled])
}

model Subscription {
  id             String   @id @default(cuid())
  userId         String
  user           User     @relation(fields: [userId], references: [id])
  type           SubscriptionType
  feedSourceId   String?
  feedSource     FeedSource? @relation(fields: [feedSourceId], references: [id])
  vendorId       String?
  vendor         Vendor?  @relation(fields: [vendorId], references: [id])
  productId      String?
  product        Product? @relation(fields: [productId], references: [id])
  categoryId     String?
  category       Category? @relation(fields: [categoryId], references: [id])
  keyword        String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([userId, type])
}

model IntelItem {
  id             String   @id @default(cuid())
  sourceId       String
  source         FeedSource @relation(fields: [sourceId], references: [id])
  kind           IntelKind
  title          String
  summary        String?
  body           String?
  sourceUrl      String
  sourcePublishedAt DateTime?
  observedAt     DateTime?
  normalizedHash String   @unique
  corroborationCount Int  @default(1)
  confidenceRaw  Float    @default(0.5)
  metadata       Json?
  vulnerabilities VulnerabilityIntelItem[]
  campaigns      CampaignIntelItem[]
  scores         RelevanceScore[]
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([kind, sourcePublishedAt])
  @@index([sourceId, sourcePublishedAt])
}

model Vulnerability {
  id             String   @id @default(cuid())
  cveId          String   @unique
  cvssScore      Float?
  epssScore      Float?
  kevFlag        Boolean  @default(false)
  exploitStatus  String?
  vector         String?
  publishedAt    DateTime?
  modifiedAt     DateTime?
  affectedSummary String?
  intelItems     VulnerabilityIntelItem[]
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([kevFlag, epssScore])
}

model ThreatActor {
  id             String   @id @default(cuid())
  name           String   @unique
  aliases        Json?
  description    String?
  campaigns      ThreatCampaign[]
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}

model ThreatCampaign {
  id             String   @id @default(cuid())
  actorId        String?
  actor          ThreatActor? @relation(fields: [actorId], references: [id])
  name           String
  status         String?
  firstSeenAt    DateTime?
  lastSeenAt     DateTime?
  targets        Json?
  ttpTags        Json?
  intelItems     CampaignIntelItem[]
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([lastSeenAt])
}

model DailyBrief {
  id             String   @id @default(cuid())
  userId         String
  user           User     @relation(fields: [userId], references: [id])
  orgId          String?
  org            Organization? @relation(fields: [orgId], references: [id])
  briefDate      DateTime
  tldr           String?
  cards          BriefCard[]
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@unique([userId, briefDate])
  @@index([briefDate])
}

model BriefCard {
  id             String   @id @default(cuid())
  dailyBriefId   String
  dailyBrief     DailyBrief @relation(fields: [dailyBriefId], references: [id])
  cardType       String
  title          String
  bullets        Json
  whyItMatters   String
  suggestedAction String?
  confidence     Float
  sourceLinks    Json
  affectedRefs   Json?
  score          Float?
  orderIndex     Int
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([dailyBriefId, orderIndex])
}

model RelevanceScore {
  id             String   @id @default(cuid())
  intelItemId    String
  intelItem      IntelItem @relation(fields: [intelItemId], references: [id])
  userId         String
  user           User     @relation(fields: [userId], references: [id])
  severityScore  Float
  relevanceScore Float
  freshnessScore Float
  confidenceScore Float
  impactScore    Float
  totalScore     Float
  explanation    Json
  createdAt      DateTime @default(now())

  @@unique([intelItemId, userId])
  @@index([userId, totalScore])
}

model UserPreference {
  id             String   @id @default(cuid())
  userId         String   @unique
  user           User     @relation(fields: [userId], references: [id])
  topics         Json?
  geos           Json?
  sectors        Json?
  severityMin    Float?   @default(0.5)
  deliveryHourUtc Int?    @default(7)
  channels       Json?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}

model DigestDeliveryLog {
  id             String   @id @default(cuid())
  dailyBriefId   String
  dailyBrief     DailyBrief @relation(fields: [dailyBriefId], references: [id])
  channel        DeliveryChannel
  status         String
  attemptedAt    DateTime @default(now())
  deliveredAt    DateTime?
  providerRef    String?
  error          String?

  @@index([dailyBriefId, channel])
}

model VulnerabilityIntelItem {
  vulnerabilityId String
  intelItemId     String
  vulnerability   Vulnerability @relation(fields: [vulnerabilityId], references: [id])
  intelItem       IntelItem @relation(fields: [intelItemId], references: [id])

  @@id([vulnerabilityId, intelItemId])
}

model CampaignIntelItem {
  campaignId      String
  intelItemId     String
  campaign        ThreatCampaign @relation(fields: [campaignId], references: [id])
  intelItem       IntelItem @relation(fields: [intelItemId], references: [id])

  @@id([campaignId, intelItemId])
}
```

### Dedupe keys and idempotency notes
- `IntelItem.normalizedHash` = hash of canonicalized `{sourceType, sourceUrl|externalId, titleNorm, publishedDateBucket}`.
- `Vulnerability.cveId` unique by design.
- For source polling, store checkpoint cursor per source and process with upsert semantics.

## Ingestion + Normalization Flow

### Connector interface (TypeScript)
```ts
interface SourceConnector {
  sourceType: 'CISA_KEV' | 'NVD' | 'EPSS' | 'RSS' | 'VENDOR_ADVISORY' | 'BLOG';
  fetch(since?: string): Promise<RawSourceRecord[]>;
  parse(raw: RawSourceRecord): ParsedRecord;
  normalize(parsed: ParsedRecord): NormalizedIntelDraft;
  confidence(parsed: ParsedRecord): number; // 0..1
}
```

### Pipeline stages
1. **Scheduler** enqueues `ingest:source:{id}` jobs.
2. **Fetch** with timeout, retry (`exponential backoff`, max 5), and jitter.
3. **Parse/normalize** into canonical intel shape.
4. **Deduplicate** using `normalizedHash` and CVE/campaign keys.
5. **Enrich** with EPSS/KEV flags and vendor-product matching.
6. **Persist** intel + relationship edges.
7. **Emit metrics** (latency, success/fail, duplicate rate).

### Dead-letter strategy
- Jobs failing after max retries move to `ingest:dlq`.
- Attach source id, error class, payload fingerprint.
- Admin endpoint surfaces DLQ for replay.

### Source health monitoring
- `FeedSource.lastSuccessAt`, `lastErrorAt`, error streak counter.
- Health status:
  - `healthy`: success < 6h old
  - `degraded`: no success 6–24h
  - `offline`: no success >24h or repeated failures

## Scoring + Daily Brief Generation

### Scoring formula
`total = 0.35*severity + 0.30*relevance + 0.15*freshness + 0.10*confidence + 0.10*impact`

- **Severity**: CVSS, KEV flag, exploit status, EPSS percentile.
- **Relevance**: matched subscriptions + product inventory + preferences.
- **Freshness**: recency decay (e.g., half-life 24h).
- **Confidence**: source trust + corroboration count.
- **Impact**: mapped hints (cloud/identity/endpoint/supply chain/internet-facing).

### Card types (required)
1. Top Risk Today
2. Critical CVEs to Review
3. Active Threat Campaigns
4. Vendor/Product Alerts
5. What Changed Since Yesterday
6. Recommended Actions

### Card object shape
```ts
type CardOutput = {
  cardType: string;
  title: string;
  bullets: string[]; // 2-4 bullets
  whyItMatters: string;
  affected: { vendors: string[]; products: string[]; categories: string[] };
  sources: { title: string; url: string }[];
  suggestedAction: string;
  confidence: number; // 0..1
};
```

### LLM usage + guardrails
- Use Gemini only for summarization/synthesis, not fact invention.
- Prompt requires strict citation from provided evidence list.
- Validate JSON with Zod; reject on schema mismatch.
- Keep raw evidence links stored per card for traceability.

### Prompt contracts
- `SummarizeItemsPrompt` -> concise cluster summary + key facts + citations.
- `GenerateCardPrompt` -> one card in strict JSON.
- `MergeDuplicateIntelPrompt` -> merged canonical record + conflict notes.
- `ExplainRelevancePrompt` -> user-specific relevance explanation.

### TL;DR mode
- Per brief produce one `tldr` block: max ~100 words, <=30 second read.

## API Contract (REST endpoints)

### Auth + user/workspace
- `GET /api/me`
- `PATCH /api/me/preferences`
- `GET /api/workspace`

### Taxonomy and inventory
- `GET /api/vendors`
- `POST /api/vendors`
- `GET /api/products`
- `POST /api/products`
- `GET /api/categories`

### Feed/source management
- `GET /api/feed-sources`
- `POST /api/feed-sources`
- `PATCH /api/feed-sources/:id`
- `POST /api/feed-sources/:id/test`

### Subscriptions
- `GET /api/subscriptions`
- `POST /api/subscriptions`
- `DELETE /api/subscriptions/:id`

### Intel + brief
- `GET /api/intel-items?kind=&severityMin=&q=`
- `GET /api/daily-briefs/latest`
- `GET /api/daily-briefs/:id`
- `POST /api/daily-briefs/generate` (admin/system)

### Delivery + logs
- `POST /api/briefs/:id/deliver`
- `GET /api/delivery-logs`

### Operations
- `GET /api/health`
- `GET /api/metrics` (protected)
- `GET /api/dlq`
- `POST /api/dlq/replay/:jobId`

## Frontend App Structure

### Pages/routes
- `/onboarding`: topic/vendor/product/category setup
- `/brief`: daily card feed + TL;DR panel
- `/feeds`: connectors and source health
- `/search`: filterable intel list
- `/settings`: thresholds, delivery schedule, notifications

### Component system
- `BriefCard` variants for all card types.
- `SeverityBadge`, `ConfidenceBadge`, `NewSinceLastLabel`.
- `ItemDetailDrawer` with source evidence timeline.
- `FilterBar` with quick chips and saved views.

### Mobile-first behaviors
- Swipe between cards.
- Sticky action footer (`Acknowledge`, `Create Task`, `Dismiss`).
- Compact TL;DR at top with expand/collapse.

## PWA Implementation Steps

1. Add `manifest.webmanifest` (name, icons, colors, display standalone).
2. Register service worker with runtime caching:
   - `/api/daily-briefs/latest` network-first with stale fallback
   - static assets cache-first
3. Offline fallback page for latest cached brief.
4. Install prompt UX on supported browsers.
5. Push-ready architecture:
   - store push subscriptions in DB
   - background handler placeholders
6. Lighthouse pass criteria:
   - installable
   - works offline for latest brief
   - responsive + a11y checks

## 12-Week Build Roadmap

### Weeks 1-2: Foundations
- Next.js migration, Prisma setup, base auth, org/user models.
- Seed taxonomy + scaffolding routes.

### Weeks 3-4: Source ingestion MVP
- Implement NVD, CISA KEV, EPSS connectors.
- Queue + retry + DLQ + health status.

### Weeks 5-6: Core intel domain
- Intel normalization, dedupe, linking to vendors/products.
- Search/filter APIs.

### Weeks 7-8: Scoring + brief generation
- Relevance scoring engine.
- Daily brief assembly.
- Gemini summarization with JSON validation.

### Weeks 9-10: Frontend product UX
- Onboarding, feed management, daily brief cards, detail drawer.
- “What changed since yesterday” diff logic.

### Week 11: Delivery + PWA hardening
- In-app delivery logs, push-ready hooks.
- Offline cache and install flows.

### Week 12: QA + launch readiness
- Security checklist, rate limiting, audit logs.
- Performance tuning + production runbooks.

## MVP Backlog (prioritized tickets with acceptance criteria)

1. **DB bootstrap + migrations**
   - AC: Prisma migrations apply in CI and local dev.
2. **Connector framework**
   - AC: New connector can be added by implementing interface + config.
3. **NVD connector**
   - AC: CVE items ingested with cveId, cvss, published timestamps.
4. **CISA KEV connector**
   - AC: KEV flag correctly updates vulnerability records.
5. **EPSS enrichment**
   - AC: EPSS score present for mapped CVEs when available.
6. **Deduplication service**
   - AC: Duplicate raw events map to one IntelItem.
7. **Scoring service**
   - AC: Deterministic score output with explanation JSON.
8. **Daily brief generator**
   - AC: One brief/day/user with 6 card types and citations.
9. **Gemini integration**
   - AC: Uses `GEMINI_API_KEY` env var only; no hardcoded key.
10. **Brief UI**
    - AC: Cards render title, bullets, why it matters, action, confidence.
11. **PWA install + offline**
    - AC: Latest brief available offline after first load.
12. **Audit logging + rate limiting**
    - AC: Sensitive endpoints logged and rate limited.

## Risk Register + Mitigations

1. **Source schema drift**
   - Mitigation: adapter versioning + parser contract tests.
2. **LLM hallucination risk**
   - Mitigation: citation-required prompts + no-new-facts policy + schema validation.
3. **Noisy relevance for early users**
   - Mitigation: explicit preference onboarding + tunable weight profile.
4. **Ingestion outages**
   - Mitigation: retries, DLQ, source health dashboards.
5. **Performance degradation with scale**
   - Mitigation: indexed queries, partition old intel, async generation jobs.
6. **Compliance/privacy gaps**
   - Mitigation: export/delete endpoints, audit trails, least-privilege secrets.

## Day-1 starter repo plan with exact folder structure

```txt
securepulse/
  apps/
    web/
      app/
        (auth)/
        onboarding/
        brief/
        feeds/
        search/
        settings/
        api/
          health/route.ts
          daily-briefs/latest/route.ts
          subscriptions/route.ts
      components/
        cards/
        badges/
        layout/
      lib/
        api-client.ts
        auth.ts
        zod-schemas.ts
      public/
        manifest.webmanifest
        icons/
      styles/
      next.config.ts
  packages/
    domain/
      src/
        scoring/
        normalization/
        types/
    connectors/
      src/
        nvd/
        cisa-kev/
        epss/
        rss/
    prompts/
      src/
        summarize-items.ts
        generate-card.ts
        merge-duplicate-intel.ts
        explain-relevance.ts
    db/
      prisma/
        schema.prisma
        migrations/
      src/
        client.ts
  workers/
    ingestion-worker/
      src/
        jobs/
        queues/
        runner.ts
    brief-worker/
      src/
        jobs/
        runner.ts
  infra/
    docker/
    terraform/
  docs/
    architecture.md
    threat-model.md
  .env.example
  package.json
  turbo.json
```

## Prompts for coding agents

### Backend agent prompt pack
- Build Prisma models and migrations from schema.
- Implement Route Handlers for subscriptions, feed-sources, and daily-brief retrieval.
- Add Zod validation on all request bodies.
- Implement rate limiting middleware for public APIs.
- Add unit tests for scoring and brief assembly.

### Frontend agent prompt pack
- Implement onboarding wizard with multi-step selection (topics/vendors/products/categories).
- Build Daily Brief page with reusable card components and confidence/severity badges.
- Add filters/search UX and detail drawer with source citations.
- Ensure mobile-first layout and keyboard accessibility.

### Data pipeline agent prompt pack
- Implement connectors for NVD, CISA KEV, EPSS.
- Build ingestion job retries, backoff, and DLQ replay tooling.
- Implement dedupe hashing and idempotent upserts.
- Record source health metrics and expose operational endpoints.

### QA agent prompt pack
- Add API contract tests for key endpoints.
- Add integration tests for ingestion -> scoring -> brief generation path.
- Validate LLM response JSON using fixture-based tests.
- Add Lighthouse PWA/a11y performance checks in CI.

## Secrets + environment policy
- Required: `GEMINI_API_KEY`, `DATABASE_URL`, `REDIS_URL`, `AUTH_SECRET`.
- In AI Studio/deployed environments, use managed secrets.
- Local development may use `.env.local` for non-production only.
- Never hardcode credentials in code, tests, or fixtures.
