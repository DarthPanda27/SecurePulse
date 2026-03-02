# SecurePulse Next Steps + Agent Prompts (Merged Comparison)

This file compares Claude's recommendations with the existing `next_steps.md` plan and produces one merged, prioritized execution list with implementation prompts.

## Comparison: Claude list vs previous next_steps list

### What Claude added that should be prioritized immediately
1. **Secret exposure prevention in frontend bundles**
   - Move all Gemini calls server-side and ensure API keys never reach browser bundles.
2. **`POST /api/generate-brief` backend endpoint**
   - Create a dedicated server API for AI brief generation.
3. **Type safety hardening (`any[]`, unsafe JSON parsing, model naming fixes)**
   - Improve reliability and reduce runtime failures.
4. **DB integrity guardrail (`PRAGMA foreign_keys = ON` for SQLite)**
   - Enforce relational constraints in current local setup.
5. **Explicit security-focused test plan**
   - Add checks for bundle secret leakage and endpoint behavior.

### What the previous next_steps list already covered well
1. Persistence and schema evolution (Prisma/Postgres)
2. Source ingestion connectors and reliability (retry/DLQ)
3. Personalization via user subscriptions/preferences
4. Gemini integration with validation and citations
5. API hardening and observability
6. PWA install/offline support

### Merged strategy
- **Phase 0 (Immediate hardening)**: Apply Claude's critical security/runtime fixes first.
- **Phase 1+ (Product build-out)**: Continue the architecture roadmap from the previous list.

---

## 0) Critical security/runtime hardening (do first)

### 0.1 Remove secret exposure from client bundle

#### Goal
Ensure `GEMINI_API_KEY` is never available in browser code or built assets.

#### Deliverables
- Audit Vite and client imports for env leakage.
- Move all Gemini calls to server-only modules/routes.
- Add build artifact check to assert no secret strings in `dist/assets`.

#### Prompt
```text
You are a security-focused full-stack engineer.
Harden SecurePulse so Gemini secrets cannot leak to the browser.

Requirements:
1) Audit current frontend and Vite config for any use of `import.meta.env` or build-time env injection exposing GEMINI_API_KEY.
2) Move all Gemini calls to server-only code paths.
3) Ensure frontend only calls backend APIs, never Gemini directly.
4) Add a CI/dev script that scans built JS bundles for `GEMINI_API_KEY` and related key patterns.
5) Document the secret-handling policy in README.

Validation:
- `npm run build`
- Search dist bundles to confirm GEMINI_API_KEY is absent.
- `npm run lint`
```

---

### 0.2 Add `POST /api/generate-brief` and server-side AI orchestration

#### Goal
Provide a server-owned endpoint that accepts evidence and returns validated brief card output.

#### Deliverables
- New `POST /api/generate-brief` endpoint with body validation.
- Calls Gemini from server module only.
- Returns structured card response with citations.
- Handles invalid body (`400`) and model failures (`5xx` with safe error envelope).

#### Prompt
```text
You are a backend API engineer.
Implement `POST /api/generate-brief` for SecurePulse.

Requirements:
1) Add endpoint `POST /api/generate-brief`.
2) Validate request body with Zod (must contain an array of intel items).
3) Invoke server-side Gemini summarization (no client-side AI calls).
4) Return structured response with card title, bullets, whyItMatters, suggestedAction, confidence, and sources.
5) Return 400 for invalid payloads and consistent 5xx error envelope on failures.

Validation:
- Valid request returns structured card JSON.
- Invalid non-array body returns 400.
- `npm run lint`
```

---

### 0.3 Type-safety and parsing hardening

#### Goal
Eliminate unsafe `any` usage and fragile parse flows in AI/data modules.

#### Deliverables
- Replace `any[]` with explicit interfaces.
- Guard JSON parsing with schema validation.
- Normalize Gemini model naming/config usage.

#### Prompt
```text
You are a TypeScript quality engineer.
Refactor SecurePulse for strict typing and safe parsing.

Requirements:
1) Replace `any`/`any[]` with domain interfaces.
2) Wrap all JSON parsing with safe parse + schema validation.
3) Add utility helpers for parse failures with actionable errors.
4) Ensure Gemini model identifiers are centralized and consistent.
5) Add unit tests for parse success/failure paths.

Validation:
- TypeScript compile passes with no implicit-any regressions.
- JSON parse edge-case tests pass.
- `npm run lint`
```

---

### 0.4 Relational integrity in current SQLite path

#### Goal
Prevent silent FK integrity issues in local development.

#### Deliverables
- Enable `PRAGMA foreign_keys = ON` at DB initialization.
- Add a startup check/assertion and test.

#### Prompt
```text
You are a backend reliability engineer.
Enforce relational integrity in SecurePulse's SQLite mode.

Requirements:
1) Set `PRAGMA foreign_keys = ON` on DB init.
2) Add a startup assertion/log confirming FK enforcement is active.
3) Add a small test proving FK violations are rejected.
4) Keep this behavior documented for local dev.

Validation:
- FK test demonstrates violation rejection.
- App startup logs FK enforcement enabled.
- `npm run lint`
```

---

### 0.5 Baseline regression/security test plan

#### Goal
Codify immediate checks so critical regressions are caught.

#### Deliverables
- Build + health/API contract checks.
- Secret-leak scan in built bundles.
- Endpoint behavior checks for success and 400 path.

#### Prompt
```text
You are a QA automation engineer.
Create a baseline regression suite for SecurePulse.

Requirements:
1) Add scripts/checks for:
   - successful `npm run build`
   - `/api/health` contract
   - `/api/generate-brief` success path
   - `/api/generate-brief` invalid-body 400 path
2) Add a post-build secret scan for dist bundles.
3) Provide a single command to run all baseline checks.

Validation:
- Baseline suite passes locally.
- Failures are clear and actionable.
```

---

## 1) Add persistence with Postgres + Prisma

### Goal
Replace in-memory demo data with persistent storage and migration-backed schema management.

### Prompt
```text
You are a senior TypeScript backend engineer.
Implement Postgres + Prisma persistence for SecurePulse.

Requirements:
1) Add Prisma setup and dependencies.
2) Create schema models for FeedSource, IntelItem, Vulnerability, DailyBrief, BriefCard, Subscription, UserPreference with relations/indexes.
3) Generate initial migration.
4) Add seed script with representative records.
5) Add typed Prisma client helper module.

Validation:
- `npx prisma validate`
- `npx prisma migrate status`
- `npm run lint`
```

---

## 2) Implement ingestion connectors (NVD, CISA KEV, EPSS)

### Goal
Ingest real cybersecurity feeds with retry/backoff/DLQ and source health visibility.

### Prompt
```text
You are a data pipeline engineer.
Implement connector-based ingestion for NVD, CISA KEV, EPSS.

Requirements:
1) Define connector interface (fetch/parse/normalize/confidence).
2) Implement NVD/CISA KEV/EPSS connectors.
3) Add retry with exponential backoff and max attempts.
4) Add DLQ handling and replay entry points.
5) Persist normalized records idempotently.
6) Track source health fields (lastSuccessAt, lastErrorAt, error streak).

Validation:
- Unit tests for parser/normalizer fixtures.
- End-to-end ingest smoke test.
- `npm run lint`
```

---

## 3) Replace stub personalization with real subscriptions/preferences

### Goal
Drive relevance from DB-backed user context instead of hardcoded subscriptions.

### Prompt
```text
You are a full-stack engineer implementing personalization.
Replace hardcoded user context with DB-backed preferences/subscriptions.

Requirements:
1) Remove static user context stubs.
2) Load user subscriptions/preferences from DB.
3) Feed context into scoring logic.
4) Add CRUD APIs for subscriptions and preferences.
5) Validate all payloads.

Validation:
- Tests show score differences across user profiles.
- API contract tests pass.
- `npm run lint`
```

---

## 4) Integrate Gemini summarization with strict JSON validation

### Goal
Use `gemini-3-flash` for concise summaries with no hallucinated facts and citation traceability.

### Prompt
```text
You are an AI integration engineer.
Integrate Gemini summarization for SecurePulse daily briefs.

Requirements:
1) Add Gemini service using server env `GEMINI_API_KEY`.
2) Implement prompt templates for summary/card generation.
3) Validate model output with Zod schemas.
4) On validation failure, fallback to deterministic summarization.
5) Require source citation objects in responses.

Validation:
- Unit tests with mocked Gemini responses.
- Validation-failure fallback tests.
- `npm run lint`
```

---

## 5) Add API hardening + observability

### Goal
Improve production readiness through validation, rate limiting, audit logs, and metrics.

### Prompt
```text
You are a backend security engineer.
Harden SecurePulse APIs and observability.

Requirements:
1) Add centralized request validation middleware.
2) Add rate limiting to key endpoints.
3) Add audit logs for create/update/delete operations.
4) Add protected metrics/ops endpoint.
5) Standardize error response envelopes.

Validation:
- Invalid payload tests pass.
- Rate-limit tests pass.
- `npm run lint`
```

---

## 6) Add PWA support (install + offline latest brief)

### Goal
Enable installability and offline access to the latest brief.

### Prompt
```text
You are a frontend/PWA engineer.
Implement PWA support for SecurePulse.

Requirements:
1) Add manifest with name/icons/theme/display.
2) Register service worker.
3) Cache strategy:
   - cache-first static assets
   - network-first `/api/daily-briefs/latest` with fallback
4) Add offline fallback UI.
5) Ensure safe SW update lifecycle.

Validation:
- Install prompt available in supported browsers.
- Latest brief readable offline after initial load.
- `npm run lint`
```

---

## Suggested execution order
1. 0.1 Secret exposure prevention
2. 0.2 `/api/generate-brief` endpoint
3. 0.3 Type-safety/parsing hardening
4. 0.4 SQLite FK enforcement
5. 0.5 Baseline regression/security suite
6. 1 Persistence (Prisma/Postgres)
7. 2 Ingestion connectors
8. 3 Personalization from DB
9. 4 Gemini summarization + validation
10. 5 API hardening/observability
11. 6 PWA support
