# Issue: Plan and Execute SecurePulse Persistence Changeover from SQLite to Prisma/PostgreSQL

## Summary
SecurePulse currently initializes and enforces relational behavior through a local SQLite database at startup, while Prisma + PostgreSQL scaffolding has been introduced but is not yet wired into runtime request paths. We need a controlled, low-risk migration plan to make Prisma/Postgres the production system of record.

## Problem Statement
- Runtime still imports and validates SQLite on boot (`server.ts` -> `src/lib/db.ts`).
- Prisma client module and schema/migrations exist but are not yet integrated into endpoint logic.
- Seed idempotency needs tightening for `BriefCard` to avoid duplicate records across repeated seed runs.
- We need observability, rollout controls, and rollback safety before cutover.

## Goals
1. Migrate reads/writes from SQLite to Prisma/Postgres safely.
2. Ensure deterministic, repeatable migration + seed behavior.
3. Preserve existing API contracts and error behavior during transition.
4. Provide a clear rollback strategy.

## Non-Goals
- Redesigning API response shapes.
- Reworking AI prompt logic or Gemini integration.

## Scope
### In scope
- Add runtime data access layer abstraction (repository/service boundary).
- Add feature flag(s) for DB backend selection and phased rollout.
- Implement Prisma-backed persistence for:
  - FeedSource
  - IntelItem
  - Vulnerability
  - DailyBrief
  - BriefCard
  - Subscription
  - UserPreference
- Remove direct runtime dependence on SQLite once production is stable.
- Add runbook + operational docs.

### Out of scope
- Multi-region database topology changes.
- Historical backfill beyond current app-required datasets.

## Proposed Rollout Plan
1. **Preparation**
   - Confirm staging PostgreSQL readiness and credentials management.
   - Add health checks for Prisma connectivity.
   - Add metrics/log tags for selected backend.
2. **Abstraction Layer**
   - Introduce interfaces for all persistence operations used by handlers/jobs.
   - Provide SQLite and Prisma implementations (temporary dual support).
3. **Dual-Write (optional if low traffic)**
   - Write to both backends for critical entities and compare outcomes.
4. **Read Switch by Endpoint**
   - Move read paths incrementally under a feature flag.
5. **Write Switch**
   - Set Prisma as primary writer in production.
6. **Decommission SQLite**
   - Remove `src/lib/db.ts` startup dependency from runtime path after burn-in period.

## Acceptance Criteria
- [ ] `server.ts` no longer depends on SQLite initialization in production runtime path.
- [ ] All persistence for core domain models uses Prisma client helper.
- [ ] Migration strategy documented and reproducible in staging/prod.
- [ ] Seed script is idempotent for all inserted records (including `BriefCard`).
- [ ] Feature flag supports instant rollback to previous behavior during rollout window.
- [ ] Dashboards/alerts added for DB errors, latency, and migration failures.
- [ ] Runbook added for on-call rollback and incident response.

## Technical Tasks
- [ ] Add DB provider interface + dependency injection at app startup.
- [ ] Implement Prisma repositories for each aggregate.
- [ ] Add unique constraint or deterministic upsert strategy for `BriefCard` seed rows.
- [ ] Add integration tests for Prisma persistence behavior.
- [ ] Add migration verification step in CI (`prisma validate`, `prisma migrate status`).
- [ ] Add startup checks for `DATABASE_URL` and Prisma connectivity.

## Risks & Mitigations
- **Risk:** Data divergence during transition.
  - **Mitigation:** Dual-write verification, reconciliation script, and sampled consistency checks.
- **Risk:** Performance regressions.
  - **Mitigation:** Add query timing metrics and index review before full cutover.
- **Risk:** Failed migrations in production.
  - **Mitigation:** Preflight migration in staging clone + rollback docs.

## Dependencies
- Postgres environment availability and credentials.
- CI access to install Prisma CLI/client packages.
- Team decision on feature flag source (env var vs config service).

## Suggested Labels
`backend`, `database`, `prisma`, `postgres`, `migration`, `tech-debt`

## Suggested Priority
High

## Owner
TBD
