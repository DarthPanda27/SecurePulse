# SecurePulse Next Steps + Agent Prompts

This file translates the recommended next steps into concrete implementation tasks and ready-to-use prompts.

## 1) Add persistence with Postgres + Prisma

### Goal
Replace in-memory demo data with persistent storage and migration-backed schema management.

### Deliverables
- Add Prisma dependencies and initialize `prisma/schema.prisma`.
- Create initial models for: `FeedSource`, `IntelItem`, `Vulnerability`, `DailyBrief`, `BriefCard`, `Subscription`, `UserPreference`.
- Add first migration and seed script.
- Add DB client utility and wire startup checks.

### Prompt
```text
You are a senior TypeScript backend engineer.
Implement Postgres + Prisma persistence for this SecurePulse repo.

Requirements:
1) Add Prisma setup and dependencies.
2) Create schema models for FeedSource, IntelItem, Vulnerability, DailyBrief, BriefCard, Subscription, UserPreference with relations and indexes.
3) Generate and include an initial migration.
4) Add a seed script with minimal sample records.
5) Add a typed Prisma client helper module.
6) Update README with local DB setup and migration commands.

Constraints:
- TypeScript end-to-end.
- Keep naming clear and production-friendly.
- No hardcoded secrets.

Validation:
- `npx prisma validate`
- `npx prisma migrate status`
- `npm run lint`
```

---

## 2) Implement ingestion connectors (NVD, CISA KEV, EPSS)

### Goal
Ingest real cybersecurity data sources with resilient retries and dead-letter handling.

### Deliverables
- Connector interface (`fetch`, `parse`, `normalize`).
- Initial connectors for NVD, CISA KEV, EPSS.
- Basic polling/sync service.
- Retry + backoff + DLQ behavior.
- Source health status tracking.

### Prompt
```text
You are a data pipeline engineer building ingestion for SecurePulse.
Implement a connector-based ingestion layer for NVD, CISA KEV, and EPSS.

Requirements:
1) Define a shared connector interface with fetch/parse/normalize.
2) Implement source modules for NVD, CISA KEV, EPSS.
3) Add retry with exponential backoff and max-attempt controls.
4) Add DLQ handling for repeated failures.
5) Track source health (lastSuccessAt, lastErrorAt, error streak).
6) Persist normalized records using Prisma.

Constraints:
- Ensure idempotent writes.
- Add clear logs for observability.
- Do not block app startup if a source is down.

Validation:
- Add unit tests for parse/normalize functions.
- Run ingestion locally against sample payload fixtures.
- `npm run lint`
```

---

## 3) Replace stub personalization with real user subscriptions/preferences

### Goal
Drive relevance scores using actual user data instead of hardcoded context.

### Deliverables
- Store and query subscriptions + user preferences from DB.
- Replace `getUserContext()` stub in `server.ts`.
- Add user-scoped ranking logic.
- Add endpoints to CRUD subscriptions/preferences.

### Prompt
```text
You are a full-stack engineer implementing personalization in SecurePulse.
Replace hardcoded user context with DB-backed subscriptions and preferences.

Requirements:
1) Remove the static getUserContext() stub.
2) Load user subscriptions/preferences from Prisma.
3) Update scoring input to use real user context.
4) Add API endpoints for:
   - GET/POST/DELETE subscriptions
   - GET/PATCH user preferences
5) Add validation for all request payloads.

Constraints:
- Keep API responses backward-compatible where possible.
- Handle missing preference data gracefully.

Validation:
- Add tests for relevance scoring with different subscription sets.
- `npm run lint`
```

---

## 4) Integrate Gemini (`gemini-3-flash`) for card summarization

### Goal
Use LLM for concise card text while keeping facts traceable and schema-validated.

### Deliverables
- Gemini client integration via `GEMINI_API_KEY` env var.
- Prompt templates for card/TL;DR generation.
- Zod schemas for strict JSON output validation.
- Citation-preserving output structure.

### Prompt
```text
You are an AI integration engineer for SecurePulse.
Integrate Gemini 3 Flash (`gemini-3-flash`) for brief card and TL;DR generation.

Requirements:
1) Add a Gemini service module using `@google/genai` and `GEMINI_API_KEY`.
2) Create prompt templates for:
   - SummarizeItemsPrompt
   - GenerateCardPrompt
3) Define Zod schemas for model outputs and validate responses.
4) If validation fails, fallback to deterministic non-LLM summaries.
5) Ensure every generated card includes source citations.

Constraints:
- Never hardcode secrets.
- No fabricated facts; only summarize provided evidence.

Validation:
- Add unit tests with mocked Gemini responses.
- Add tests for schema validation failures and fallback behavior.
- `npm run lint`
```

---

## 5) Add API hardening + observability

### Goal
Improve production readiness through validation, rate limiting, and audit logs.

### Deliverables
- Centralized request validation.
- API rate limiting.
- Basic audit logging for sensitive mutations.
- Metrics endpoint for operational visibility.

### Prompt
```text
You are a backend security engineer.
Harden SecurePulse APIs for production-readiness.

Requirements:
1) Add request validation middleware (Zod-based or equivalent).
2) Add rate limiting on public and mutation endpoints.
3) Add audit logging for create/update/delete operations.
4) Expose a protected operational endpoint for basic metrics.
5) Return consistent error envelopes.

Constraints:
- Keep middleware composable and testable.
- Avoid breaking existing endpoint contracts unless necessary.

Validation:
- Add tests for invalid payload rejection.
- Add tests for rate-limiting behavior.
- `npm run lint`
```

---

## 6) Add core PWA support (install + offline latest brief)

### Goal
Enable installability and offline access for the latest brief.

### Deliverables
- `manifest.webmanifest`.
- Service worker registration.
- Cache strategy for static assets and `/api/daily-briefs/latest`.
- Offline fallback UX.

### Prompt
```text
You are a frontend/PWA engineer.
Implement PWA support for SecurePulse with install and offline brief access.

Requirements:
1) Add a proper manifest with icons, theme/background colors, and standalone display.
2) Register a service worker in the app.
3) Implement caching strategy:
   - Cache-first for static assets
   - Network-first with fallback for `/api/daily-briefs/latest`
4) Add an offline fallback UI for when network is unavailable.
5) Keep mobile-first UX intact.

Constraints:
- Do not degrade normal online behavior.
- Ensure service worker updates are handled safely.

Validation:
- Verify installability in browser devtools.
- Verify latest brief remains available offline after first load.
- `npm run lint`
```

---

## Suggested execution order
1. Persistence (Prisma/Postgres)
2. Ingestion connectors
3. Personalization from DB
4. Gemini summarization
5. API hardening/observability
6. PWA support
