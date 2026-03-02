<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# SecurePulse

## Run locally

**Prerequisites:** Node.js

1. Install dependencies: `npm install`
2. Set `GEMINI_API_KEY` in `.env.local`
3. Start the app: `npm run dev`

## SQLite relational integrity in local dev

- SecurePulse enables `PRAGMA foreign_keys = ON` during SQLite initialization.
- App startup asserts this setting remains enabled and logs: `[startup] SQLite foreign key enforcement confirmed active.`
- If SQLite cannot enforce foreign keys, startup fails fast to avoid accepting inconsistent relational data.

## Secret handling policy

- `GEMINI_API_KEY` is **server-only** and must never be injected into Vite client bundles.
- Frontend code must never call Gemini SDKs or Gemini endpoints directly.
- All Gemini interactions must occur in backend code paths (Express API routes under `server.ts` + `server/lib/*`).
- Browser code may call only internal backend endpoints (for example `/api/brief`).
- Build artifacts must be scanned in CI/dev with `npm run scan:bundle-secrets` to detect accidental leaks.
- If `GEMINI_API_KEY` is missing, `/api/brief` returns `503 GEMINI_NOT_CONFIGURED` (expected fail-safe behavior, not a browser-side secret leak).

## Security validation commands

- Build app: `npm run build`
- Scan built assets for secret patterns: `npm run scan:bundle-secrets`
- Type/lint check: `npm run lint`
