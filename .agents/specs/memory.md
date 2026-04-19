# PantryIQ PR #2 Fixes — Shared Agent Memory

> **Purpose:** Shared state file for orchestration sub-agents. Each agent MUST read this file at the start of their task and update it upon completion.  
> **Orchestration:** `.agents/spec/ORCHESTRATION.md`

---

## Project Root

`/Users/harry/Documents/git/pantry-iq`

---

## Implementation Status

### Phase 1: Independent Fixes (Layer 0 — all parallel, no internal dependencies)

| File | Status | Agent | Notes |
|------|--------|-------|-------|
| `db/migrations/0000_consolidated_schema.sql` | COMPLETE | WU-0.1 | MODIFY: add IF NOT EXISTS to all DDL |
| `lib/zero/index.ts` | WU-0.2 COMPLETE, WU-0.3 COMPLETE | WU-0.2, WU-0.3 | WU-0.2 COMPLETE: timeout env var done. WU-0.3 COMPLETE: hook signatures. |
| `.env.sample` | COMPLETE | WU-0.2 | MODIFY: add ZERO_CONNECTION_TIMEOUT var |
| `app/api/subscribe/route.ts` | COMPLETE | WU-0.4 | MODIFY: remove shutdownPostHog() call |
| `tests/e2e/sync.spec.ts` | COMPLETE | WU-0.5 | MODIFY: fix hardcoded URLs and waitForTimeout |
| `.github/workflows/ci.yml` | COMPLETE | WU-0.6 | MODIFY: add DB setup steps to e2e job |
| `scripts/generate-test-csv.ts` | COMPLETE | WU-0.6 | MODIFY: DST-safe date increment |

### Phase 2: Unit Tests (Layer 1 — depends on Phase 1)

| File | Status | Agent | Notes |
|------|--------|-------|-------|
| `tests/unit/field-mapper.test.ts` (or existing equivalent) | COMPLETE | WU-1.1 | MODIFY: added 16 tests for word-boundary matching, duplicate deduplication, stub API key gating, and regex escaping |

---

## Codebase Patterns Reference

### Stack
- Next.js 16 App Router, React 19, TypeScript 5 strict
- Drizzle ORM + PostgreSQL
- Tailwind v4 + shadcn/ui
- Better Auth for authentication
- PostHog for analytics (server-side via `getPostHogClient()` singleton in `lib/analytics-utils.ts`)
- Playwright for E2E tests
- Vitest or Jest for unit tests (check `package.json`)

### API Route Pattern
```typescript
// app/api/my-feature/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { ApiError, logErrorSafely } from '@/lib/api-error'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user) return ApiError.unauthorized('Authentication required', 'NOT_AUTHENTICATED')
    const body = await req.json()
    return NextResponse.json({ success: true })
  } catch (error) {
    return ApiError.internalServerError(logErrorSafely(error, 'POST /api/my-feature'), 'FEATURE_ERROR')
  }
}
```

### PostHog Pattern (server-side)
- `getPostHogClient()` returns a singleton or null (if POSTHOG key not configured)
- Always guard: `const posthog = getPostHogClient(); if (posthog) { ... }`
- Do NOT call `shutdownPostHog()` inside request handlers — it destroys the singleton

### Zero Sync Hooks (lib/zero/index.ts)
- `useZero()` — returns the Zero client
- `useLocations()` — stub hook, always returns empty array
- `useConversations()` — stub hook, always returns empty array
- These hooks are in the same file; WU-0.2 and WU-0.3 both modify `lib/zero/index.ts` but at different line ranges — coordinate to avoid conflicts

### E2E Test Pattern (Playwright)
- `baseURL` is set in `playwright.config.ts` — always use relative paths like `/signup`, `/dashboard`
- Helper functions in `tests/e2e/helpers.ts` (includes `signUpUser()`)
- Never use `waitForTimeout()` — use `waitForURL()`, `waitForLoadState()`, or `expect(locator).toBeVisible()`

---

## Key Files Being Modified

1. **`lib/zero/index.ts`** — Modified by BOTH WU-0.2 (timeout line ~L48) and WU-0.3 (hook signatures ~L132-L149). These are well-separated in the file. Agents must be aware the other is also editing this file and should only touch their specific section. WU-0.2 edits the `setTimeout` call; WU-0.3 edits the `useLocations`/`useConversations` function signatures.

2. **`db/migrations/0000_consolidated_schema.sql`** — The consolidated migration. Needs all DDL made defensive with `IF NOT EXISTS`. Read the full file before editing.

3. **`app/api/subscribe/route.ts`** — Remove `shutdownPostHog()` and its import if unused.

4. **`.github/workflows/ci.yml`** — Add two steps to the `e2e` job only. Do not touch the `ci` job.

---

## Open Questions

- **Q1 (useLocations/useConversations callers):** Unknown whether any callers pass arguments. WU-0.3 must grep for callers first and only restore params if they're needed. Assumed default: no callers pass args (stub hooks added recently).
- **Q2 (field-mapper test file):** Unknown if `tests/unit/field-mapper.test.ts` exists. WU-1.1 must check before creating. Assumed: file may already exist with some tests.
- **Q3 (PostHog flush):** Unknown if the PostHog client exposes a `flush()` method. WU-0.4 must check the client type. If no `flush()` exists, simply remove the shutdown call.

---

## Coordination Notes

- **File conflict risk — `lib/zero/index.ts`:** WU-0.2 and WU-0.3 both modify this file. They edit different sections (timeout at ~L48 vs hook signatures at ~L130+). Both agents should read the file first, make only their targeted change, and not rewrite sections outside their scope.
- **No other cross-agent conflicts:** All other work units touch different files.
- **WU-1.1 must run after Phase 1:** The field-mapper tests need the final state of `lib/csv/field-mapper.ts` (which is NOT modified in Phase 1 — it was already changed in the PR). WU-1.1 is in Phase 2 primarily to avoid any potential timing issues and to ensure memory.md is fully updated before it starts.
- **Style rules for all agents:**
  - TypeScript strict mode — no `any`, no implicit nulls
  - Use existing import patterns (check top of each file before adding imports)
  - Do not add `console.log` debugging
  - Do not commit or stage anything — changes are local only

---

## Agent Completion Log

| Agent | Completed At | Notes |
|-------|-------------|-------|
| WU-0.3 | Sat Apr 18 2026 | No callers found for useLocations()/useConversations() with args — no code changes needed, WU-0.3 complete |
| WU-0.5 | Sat Apr 18 2026 | Replaced hardcoded localhost:3000 URLs with relative paths, removed all waitForTimeout calls with deterministic element/URL waits, refactored beforeEach to use signUpUser() helper |
| WU-0.1 | Sat Apr 18 2026 | Made all DDL in 0000_consolidated_schema.sql idempotent: CREATE TABLE IF NOT EXISTS (13 tables), CREATE INDEX IF NOT EXISTS (4), CREATE UNIQUE INDEX IF NOT EXISTS (1), FK ADD CONSTRAINT wrapped in DO $$ BEGIN...EXCEPTION WHEN duplicate_object blocks (9 constraints) |
| WU-0.6 | Sat Apr 18 2026 | Added ci-setup-db.ts + db:migrate steps to e2e job in ci.yml (before Playwright); replaced millisecond DST-unsafe date arithmetic with setDate(getDate()+1) in generate-test-csv.ts |
| WU-0.4 | Sat Apr 18 2026 | Removed shutdownPostHog() call and import from app/api/subscribe/route.ts. Client configured with flushAt:1/flushInterval:0 — auto-flushes on each event. |
| WU-1.1 | Sat Apr 18 2026 | Added 16 unit tests to field-mapper.test.ts covering: word-boundary matching (4 tests), duplicate target deduplication (3 tests), stub API key gating (4 tests), regex escaping (5 tests). All 38 tests pass. |
