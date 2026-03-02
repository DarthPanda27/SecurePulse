# SecurePulse — Planned Fixes

Below is every recommended fix, ordered by priority, each with a description of the problem, the exact change needed, and a ready-to-use coding-agent prompt.

---

## FIX 1 · CRITICAL — API Key Exposed in Browser Bundle

**File:** `vite.config.ts`

**Problem:**
The Vite `define` block injects `GEMINI_API_KEY` directly into the client-side JavaScript bundle at build time. Any visitor can read it by opening DevTools → Network or viewing the source map. This allows unauthorized use of the API key, potential billing fraud, and quota exhaustion.

```ts
// INSECURE — currently in vite.config.ts
define: {
  'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
},
```

**Fix:**
Remove the `define` block entirely. The key must only live in `process.env` on the server. Move all Gemini API calls to backend Express routes; never import `ai.ts` from any file under `src/` that gets bundled for the browser.

**Coding-Agent Prompt:**
```
In vite.config.ts, remove the entire `define` block that injects GEMINI_API_KEY into the client bundle:

  define: {
    'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
  },

Also remove the `loadEnv` import and the `mode` parameter from the `defineConfig` callback since they are only used for the key injection.

The result should be a simple `defineConfig({...})` (not a function) with only `plugins`, `resolve`, and `server` keys.
```

---

## FIX 2 · HIGH — No Backend Endpoint for AI Generation

**File:** `server.ts`

**Problem:**
The AI module (`src/lib/ai.ts`) is a Node.js-only file (it uses `dotenv`, reads `process.env`, and calls the Gemini API), but there is no Express route wired up to expose its functionality. Additionally, `startServer()` has no `.catch()`, so an unhandled promise rejection will crash the process silently in older Node versions.

**Fix:**
1. Add a `POST /api/generate-brief` route that accepts `{ intelItems: IntelItem[] }` in the request body, calls `generateBriefCard`, and returns the structured card as JSON.
2. Add error handling on the `startServer()` call.
3. Add a catch-all SPA route for production so React Router links don't 404.

**Coding-Agent Prompt:**
```
In server.ts, make the following three changes:

1. Import `generateBriefCard` from `./src/lib/ai`.

2. Add a POST route at `/api/generate-brief` between the health check and the Vite middleware block:

   app.post("/api/generate-brief", async (req, res) => {
     try {
       const { intelItems } = req.body;
       if (!Array.isArray(intelItems)) {
         return res.status(400).json({ error: "intelItems must be an array" });
       }
       const card = await generateBriefCard(intelItems);
       res.json(card);
     } catch (err) {
       console.error("Failed to generate brief card:", err);
       res.status(500).json({ error: "Failed to generate brief card" });
     }
   });

3. Change the bare `startServer();` call at the bottom to:

   startServer().catch((err) => {
     console.error("Failed to start server:", err);
     process.exit(1);
   });
```

---

## FIX 3 · HIGH — Unsafe `JSON.parse` with Silent Empty-Object Fallback

**File:** `src/lib/ai.ts` · line 61

**Problem:**
```ts
return JSON.parse(response.text || "{}");
```
If `response.text` is empty or malformed, `JSON.parse("{}")` silently returns `{}`. This propagates as a valid-looking card object with all required fields missing, which can cause confusing runtime errors downstream rather than a clear failure at the source.

**Fix:**
Validate that `response.text` is non-empty before parsing, and throw a descriptive error if parsing fails.

**Coding-Agent Prompt:**
```
In src/lib/ai.ts, replace the final return statement:

  return JSON.parse(response.text || "{}");

with:

  const raw = response.text;
  if (!raw) {
    throw new Error("Gemini returned an empty response");
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`Failed to parse Gemini response as JSON: ${raw.slice(0, 200)}`);
  }
```

---

## FIX 4 · HIGH — `any[]` Parameter Defeats Type Safety

**File:** `src/lib/ai.ts` · line 35

**Problem:**
```ts
export async function generateBriefCard(intelItems: any[])
```
Using `any[]` removes all compile-time type checking. Callers can pass arbitrary data without TypeScript catching mistakes. This is especially dangerous when the data is being serialized into an AI prompt.

**Fix:**
Define an `IntelItem` interface that mirrors the `intel_items` database schema and use it as the parameter type.

**Coding-Agent Prompt:**
```
In src/lib/ai.ts, add the following interface before the `generateBriefCard` function:

  export interface IntelItem {
    id: string;
    source: string;
    external_id: string;
    title: string;
    content: string;
    url?: string;
    published_at: string;
  }

Then change the function signature from:

  export async function generateBriefCard(intelItems: any[])

to:

  export async function generateBriefCard(intelItems: IntelItem[])
```

---

## FIX 5 · MEDIUM — Wrong/Unverified Gemini Model Name

**File:** `src/lib/ai.ts` · line 52

**Problem:**
```ts
model: "gemini-3-flash-preview",
```
`gemini-3-flash-preview` does not match any documented Gemini model identifier. The original prompt specified `gemini-3-flash` (likely a forward-looking placeholder). Using an invalid model name will cause a runtime API error on every generation attempt.

**Fix:**
Change to `gemini-2.0-flash`, a stable, widely available model with comparable performance and cost characteristics.

**Coding-Agent Prompt:**
```
In src/lib/ai.ts, change the model name on line 52 from:

  model: "gemini-3-flash-preview",

to:

  model: "gemini-2.0-flash",
```

---

## FIX 6 · MEDIUM — SQLite Foreign Keys Not Enforced

**File:** `src/lib/db.ts`

**Problem:**
SQLite does not enforce `FOREIGN KEY` constraints by default — they must be enabled per-connection with `PRAGMA foreign_keys = ON`. Without it, inserting a `brief_cards` row with a non-existent `brief_id` succeeds silently, violating referential integrity.

**Fix:**
Execute `PRAGMA foreign_keys = ON` immediately after opening the database connection and before running the schema initialization.

**Coding-Agent Prompt:**
```
In src/lib/db.ts, after the line:

  const db = new Database(dbPath);

and before the `db.exec(...)` schema block, add:

  db.pragma('foreign_keys = ON');
```

---

## FIX 7 · LOW — `App.tsx` References Non-Existent Model Name

**File:** `src/App.tsx` · line 34

**Problem:**
```tsx
<p className="text-slate-500">Generated by Gemini 3 Flash • {new Date().toLocaleDateString()}</p>
```
This hardcodes the incorrect model name in the UI. It will be wrong once the model name is corrected in `ai.ts`.

**Fix:**
Update the display string to match the corrected model identifier.

**Coding-Agent Prompt:**
```
In src/App.tsx, change line 34 from:

  <p className="text-slate-500">Generated by Gemini 3 Flash • {new Date().toLocaleDateString()}</p>

to:

  <p className="text-slate-500">Generated by Gemini 2.0 Flash • {new Date().toLocaleDateString()}</p>
```

---

## Recommendations (Require Larger Scope — Not Auto-Fixed)

These issues are real but require architectural decisions or significant new code. They are recorded here for the team to prioritize.

| # | Area | Issue | Recommendation |
|---|------|-------|----------------|
| R1 | Security | No user authentication | Add Auth.js or Clerk before any production exposure |
| R2 | Security | No rate limiting on `/api/generate-brief` | Add `express-rate-limit` to prevent API key exhaustion |
| R3 | Security | No CORS policy configured | Add `cors` middleware with explicit origin allowlist |
| R4 | Code Quality | `App.tsx` has hardcoded example cards | Replace with real API-driven data fetched from backend |
| R5 | Code Quality | No database CRUD operations | Implement `POST /api/intel-items` and `GET /api/briefs` endpoints |
| R6 | Reliability | No logging | Add `pino` or `winston` for structured server-side logging |
| R7 | Testing | Zero test coverage | Add Vitest + supertest; target >70% coverage on AI/DB modules |
| R8 | CI/CD | No pipeline | Add GitHub Actions workflow: lint → build → test on every PR |
| R9 | PWA | No service worker or manifest | Implement PWA requirements per original spec |
| R10 | Ops | `data/` dir path uses `process.cwd()` | Use `import.meta.dirname` for reliable path resolution in ESM |
