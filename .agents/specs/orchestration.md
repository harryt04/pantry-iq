# PantryIQ PR #2 -- Orchestration Plan

**Version:** 1.0  
**Date:** 2026-04-18  
**Purpose:** Fix all open review comments from GitHub Copilot on PR #2  
**Source:** PR https://github.com/harryt04/pantry-iq/pull/2  
**Status:** Ready for orchestration

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Execution Phases](#execution-phases)
4. [Work Units (Agent Prompts)](#work-units-agent-prompts)

---

## Overview

This plan addresses 9 distinct concerns raised by GitHub Copilot across 6 files in PR #2. All work units in Phase 1 are fully independent and can run in parallel. Phase 2 (unit tests for `field-mapper.ts`) must wait for Phase 1 to complete since it needs the final state of `field-mapper.ts`.

**Orchestration strategy:**

1. Orchestrator reads this file and the companion `memory.md`
2. Dispatches all Phase 1 work units in parallel via concurrent `task()` calls
3. Waits for all Phase 1 units to complete
4. Dispatches Phase 2 (WU-1.1)
5. Updates status checkboxes as units complete or fail
6. If a unit fails, halt and surface the error; human decides to retry or skip

---

## Prerequisites

- [ ] **Repo cloned locally** at `/Users/harry/Documents/git/pantry-iq` (confirmed — this is the working directory)
- [ ] **On the correct branch** — confirm with `git branch --show-current` before starting
- [ ] **`npm install` completed** — all dependencies available

---

## Execution Phases

| Phase | Layer | Work Units | Can Parallelize | Status |
|-------|-------|------------|-----------------|--------|
| 1 | 0 | WU-0.1, WU-0.2, WU-0.3, WU-0.4, WU-0.5, WU-0.6 | ✅ All | [ ] Pending |
| 2 | 1 | WU-1.1 | N/A (solo) | [ ] Pending |

---

## Work Units (Agent Prompts)

---

### Phase 1: Independent Fixes (Layer 0) — All Parallel

---

#### WU-0.1: Migration Squash Safety

**Status:** [ ] Pending | [ ] In Progress | [ ] Complete | [ ] Failed

**Priority:** P0  
**Effort:** Medium  
**Dependencies:** None  
**Parallel group:** Layer 0

### Prompt

You are a database engineer working on a Next.js + Drizzle ORM + PostgreSQL project at `/Users/harry/Documents/git/pantry-iq`.

Read `/Users/harry/Documents/git/pantry-iq/.agents/spec/memory.md` first to understand project state.

**Context:** A PR squashed three historical migrations (0001, 0002, 0003) into a single `0000_consolidated_schema` migration. The concern is that existing databases that already ran 0001/0002/0003 will fail when `db:migrate` tries to apply `0000_consolidated_schema` because all SQL uses unconditional `CREATE TABLE`. We need to be maximally defensive.

**Your task:** Make every `CREATE TABLE`, `CREATE INDEX`, `CREATE TYPE`, and `CREATE SEQUENCE` statement in the consolidated migration SQL file use `IF NOT EXISTS` so that running it against a database that already has those objects is safe and idempotent.

**Files to Modify:**

1. `db/migrations/0000_consolidated_schema.sql` — Read this file first to understand its full contents. For every DDL statement:
   - Change `CREATE TABLE` → `CREATE TABLE IF NOT EXISTS`
   - Change `CREATE INDEX` → `CREATE INDEX IF NOT EXISTS`
   - Change `CREATE UNIQUE INDEX` → `CREATE UNIQUE INDEX IF NOT EXISTS`
   - Change `CREATE TYPE` → use a DO block pattern for enums since PostgreSQL doesn't support `CREATE TYPE IF NOT EXISTS` directly:
     ```sql
     DO $$ BEGIN
       CREATE TYPE "your_type_name" AS ENUM ('val1', 'val2');
     EXCEPTION WHEN duplicate_object THEN null;
     END $$;
     ```
   - Change `CREATE SEQUENCE` → `CREATE SEQUENCE IF NOT EXISTS`
   - For `ALTER TABLE ... ADD COLUMN` statements, wrap them defensively:
     ```sql
     ALTER TABLE "table_name" ADD COLUMN IF NOT EXISTS "column_name" type;
     ```
   - Leave `INSERT`, `UPDATE`, `DELETE`, `DROP`, and constraint definitions unchanged unless they would also fail on re-run (use judgment).

**Acceptance Criteria:**

- Every `CREATE TABLE` in the file uses `IF NOT EXISTS`
- Every `CREATE INDEX` / `CREATE UNIQUE INDEX` uses `IF NOT EXISTS`
- Every enum type creation uses the `DO $$ BEGIN ... EXCEPTION` pattern
- Every `CREATE SEQUENCE` uses `IF NOT EXISTS`
- Every `ALTER TABLE ADD COLUMN` uses `IF NOT EXISTS`
- The SQL remains syntactically valid (no broken statements)
- `db/migrations/meta/_journal.json` still references `0000_consolidated_schema` correctly (do not change the journal)

**Notes:**

- Do NOT run `db:migrate` — just edit the SQL file
- Do NOT modify `db/migrations/meta/_journal.json`
- Read the full SQL file before making any edits to understand all DDL present
- Update `/Users/harry/Documents/git/pantry-iq/.agents/spec/memory.md` when done

---

#### WU-0.2: Zero Connection Timeout — Make Configurable

**Status:** [ ] Pending | [ ] In Progress | [ ] Complete | [ ] Failed

**Priority:** P1  
**Effort:** Small  
**Dependencies:** None  
**Parallel group:** Layer 0

### Prompt

You are a TypeScript engineer working on a Next.js project at `/Users/harry/Documents/git/pantry-iq`.

Read `/Users/harry/Documents/git/pantry-iq/.agents/spec/memory.md` first.

**Context:** In `lib/zero/index.ts`, the Zero connection timeout was hardcoded from 10000ms to 2000ms with a comment "Reduced to 2s for CI compatibility and faster startup". The reviewer correctly flagged that 2s is too aggressive for production — cold starts and slower networks will cause false timeouts.

**Your task:** Make the timeout configurable via an environment variable, defaulting to 10000ms in production but allowing CI to override it to 2000ms.

**Files to Modify:**

1. `lib/zero/index.ts` — Find the line:
   ```typescript
   }, 2000) // Reduced to 2s for CI compatibility and faster startup
   ```
   Replace it with:
   ```typescript
   }, parseInt(process.env.ZERO_CONNECTION_TIMEOUT ?? '10000')) // Configurable; set ZERO_CONNECTION_TIMEOUT=2000 in CI
   ```

2. `.env.sample` — Add this line in an appropriate section (near other ZERO_ vars):
   ```
   ZERO_CONNECTION_TIMEOUT=10000   # Lower to 2000 in CI for faster timeouts
   ```

**Acceptance Criteria:**

- `lib/zero/index.ts` uses `process.env.ZERO_CONNECTION_TIMEOUT` with a default of `'10000'`
- `.env.sample` documents the new variable
- No other files changed

**Notes:**

- Do NOT add `ZERO_CONNECTION_TIMEOUT` to `.env` (only `.env.sample`)
- Update `/Users/harry/Documents/git/pantry-iq/.agents/spec/memory.md` when done

---

#### WU-0.3: Fix `useLocations` / `useConversations` Breaking Signature Changes

**Status:** [ ] Pending | [ ] In Progress | [ ] Complete | [ ] Failed

**Priority:** P1  
**Effort:** Small  
**Dependencies:** None  
**Parallel group:** Layer 0

### Prompt

You are a TypeScript/React engineer working on a Next.js project at `/Users/harry/Documents/git/pantry-iq`.

Read `/Users/harry/Documents/git/pantry-iq/.agents/spec/memory.md` first.

**Context:** The PR removed all parameters from `useLocations()` and `useConversations()` in `lib/zero/index.ts`. These are stub hooks that don't use their params yet, but removing them is a breaking API change for any callers that currently pass arguments.

**Your task:**

1. First, search the entire codebase for all callers of `useLocations(` and `useConversations(` to see if any pass arguments:
   ```bash
   grep -rn "useLocations(" /Users/harry/Documents/git/pantry-iq/app /Users/harry/Documents/git/pantry-iq/components
   grep -rn "useConversations(" /Users/harry/Documents/git/pantry-iq/app /Users/harry/Documents/git/pantry-iq/components
   ```

2. **If no callers pass arguments:** The signatures are fine as-is — no change needed. Update memory.md noting "no callers found, WU-0.3 complete with no changes".

3. **If callers DO pass arguments:** Restore the parameters as optional (with `?`) so existing callers aren't broken. The params were previously:
   - `useLocations(client: Zero<Schema> | null | undefined, enabled: boolean = true)`
   - `useConversations(client: Zero<Schema> | null | undefined, locationId: string | null, enabled: boolean = true)`

   Make them optional no-ops:
   ```typescript
   export function useLocations(
     _client?: Zero<Schema> | null,
     _enabled: boolean = true,
   ) {
     const [locations] = useState<Location[]>([])
     return { locations, isLoading: false, error: null }
   }
   ```
   (prefix with `_` to signal intentionally unused params, suppressing TS warnings)

**Acceptance Criteria:**

- Codebase searched for callers
- If callers exist with args: params restored as optional no-ops with `_` prefix
- If no callers: no code changes needed
- TypeScript compiles without errors (run `npx tsc --noEmit` to verify)

**Notes:**

- Update `/Users/harry/Documents/git/pantry-iq/.agents/spec/memory.md` with finding when done

---

#### WU-0.4: Fix PostHog `shutdownPostHog()` in Request Handler

**Status:** [ ] Pending | [ ] In Progress | [ ] Complete | [ ] Failed

**Priority:** P1  
**Effort:** Small  
**Dependencies:** None  
**Parallel group:** Layer 0

### Prompt

You are a TypeScript engineer working on a Next.js project at `/Users/harry/Documents/git/pantry-iq`.

Read `/Users/harry/Documents/git/pantry-iq/.agents/spec/memory.md` first.

**Context:** In `app/api/subscribe/route.ts`, the code calls `shutdownPostHog()` inside a request handler. If `getPostHogClient()` returns a shared singleton (which it does), shutting it down mid-request races with other concurrent requests that may be capturing/flushing. This can silently drop analytics events.

**Your task:**

1. Read `app/api/subscribe/route.ts` and `lib/analytics-utils.ts` (or wherever `getPostHogClient` and `shutdownPostHog` are defined) to understand the current implementation.

2. Remove the `shutdownPostHog()` call from the request handler. Replace it with `posthog.flush()` if a flush method is available, OR simply remove it if the PostHog client is configured with `flushAt`/`flushInterval` (meaning it auto-flushes).

3. The corrected block should look like:
   ```typescript
   if (posthog) {
     posthog.identify({ ... })
     posthog.capture({ ... })
     // Do NOT call shutdownPostHog() here — singleton is shared across requests
     // PostHog client flushes automatically via flushAt/flushInterval config
   }
   ```
   If the PostHog client has a `flush()` method, use `await posthog.flush()` instead of the shutdown call.

**Acceptance Criteria:**

- `shutdownPostHog()` is NOT called inside the `POST` handler in `app/api/subscribe/route.ts`
- The `posthog.identify()` and `posthog.capture()` calls remain intact
- The import of `shutdownPostHog` is removed from `app/api/subscribe/route.ts` if it's no longer used anywhere in that file
- TypeScript compiles without errors

**Notes:**

- Do NOT change the PostHog client initialization or the singleton pattern itself
- Update `/Users/harry/Documents/git/pantry-iq/.agents/spec/memory.md` when done

---

#### WU-0.5: Fix E2E Test Issues in `sync.spec.ts`

**Status:** [ ] Pending | [ ] In Progress | [ ] Complete | [ ] Failed

**Priority:** P1  
**Effort:** Small  
**Dependencies:** None  
**Parallel group:** Layer 0

### Prompt

You are a Playwright/TypeScript test engineer working on a Next.js project at `/Users/harry/Documents/git/pantry-iq`.

Read `/Users/harry/Documents/git/pantry-iq/.agents/spec/memory.md` first.

**Context:** `tests/e2e/sync.spec.ts` has two issues flagged in review:
1. Hard-coded `http://localhost:3000` URLs — should use relative paths so Playwright's `baseURL` config controls the host
2. `waitForTimeout(2000)` fixed delays — should use deterministic Playwright waits

Additionally, the reviewer noted a `signUpUser()` helper already exists in `tests/e2e/helpers.ts` that should be used instead of duplicating signup logic inline.

**Your task:**

1. Read `tests/e2e/sync.spec.ts` in full.
2. Read `tests/e2e/helpers.ts` to understand the `signUpUser()` helper signature.
3. Read `playwright.config.ts` to confirm `baseURL` is set.

4. Make these changes to `tests/e2e/sync.spec.ts`:
   - Replace every `http://localhost:3000/` URL with a relative path (e.g., `http://localhost:3000/signup` → `/signup`)
   - Replace every `await page.waitForTimeout(N)` with a deterministic Playwright assertion:
     - If waiting for navigation: `await page.waitForURL('/expected-path')`
     - If waiting for an element: `await expect(page.locator('selector')).toBeVisible()`
     - If waiting for load state: `await page.waitForLoadState('networkidle')` (use sparingly — prefer element-based waits)
   - If the inline signup logic in `beforeEach` duplicates what `signUpUser()` does, refactor it to use `signUpUser()` from helpers. Keep the `testEmail`/`testPassword` pattern if `signUpUser()` requires passing those values.

**Acceptance Criteria:**

- No occurrences of `http://localhost:3000` remain in `tests/e2e/sync.spec.ts`
- No occurrences of `waitForTimeout` remain in `tests/e2e/sync.spec.ts`
- The `signUpUser()` helper is used for signup if it covers the same flow
- Tests still make logical sense (don't remove assertions, just replace waits)
- Run `npx tsc --noEmit` to verify no TypeScript errors

**Notes:**

- Do NOT change `playwright.config.ts` or `tests/e2e/helpers.ts` (unless you need to add an export, but prefer not to)
- Update `/Users/harry/Documents/git/pantry-iq/.agents/spec/memory.md` when done

---

#### WU-0.6: Fix CI Workflow — E2E Job DB Setup + DST-Safe Date Arithmetic

**Status:** [ ] Pending | [ ] In Progress | [ ] Complete | [ ] Failed

**Priority:** P1  
**Effort:** Small  
**Dependencies:** None  
**Parallel group:** Layer 0

### Prompt

You are a DevOps/TypeScript engineer working on a Next.js project at `/Users/harry/Documents/git/pantry-iq`.

Read `/Users/harry/Documents/git/pantry-iq/.agents/spec/memory.md` first.

**This work unit covers two independent fixes:**

---

**Fix A: CI Workflow — E2E job missing DB setup**

`File: .github/workflows/ci.yml`

The `e2e` job runs on a separate GitHub Actions runner than the `ci` job. Each runner starts with a clean environment, so the `e2e` job cannot rely on the DB schema/migrations applied in `ci`. The `e2e` job needs its own DB setup steps before running Playwright.

Read `.github/workflows/ci.yml` in full first.

Add the following steps to the `e2e` job, **before** the "E2E tests" step (after "Build"):

```yaml
- name: Setup CI database schema
  run: npx tsx scripts/ci-setup-db.ts

- name: Run database migrations
  run: npm run db:migrate
```

Make sure the `e2e` job has the same required env vars as the `ci` job for DB access (it likely already does based on the existing env block — verify and add any missing ones).

---

**Fix B: DST-Safe Date Arithmetic in generate-test-csv.ts**

`File: scripts/generate-test-csv.ts`

The end date calculation uses millisecond arithmetic which is incorrect across Daylight Saving Time transitions (days can be 23 or 25 hours):

```typescript
// CURRENT (incorrect across DST):
options.endDate = new Date(endDate.getTime() + 24 * 60 * 60 * 1000)
```

Replace with calendar-aware date increment:

```typescript
// CORRECT:
const endDate = new Date(args[i + 1])
endDate.setDate(endDate.getDate() + 1)
options.endDate = endDate
```

---

**Acceptance Criteria:**

- `.github/workflows/ci.yml`: the `e2e` job has `ci-setup-db.ts` and `db:migrate` steps before Playwright runs
- `scripts/generate-test-csv.ts`: end date uses `setDate(getDate() + 1)` instead of millisecond addition
- Both files are syntactically valid (YAML and TypeScript respectively)
- Run `npx tsc --noEmit` to verify no TypeScript errors in `scripts/generate-test-csv.ts`

**Notes:**

- Do NOT change CI trigger conditions, concurrency settings, or the `ci` job steps
- Update `/Users/harry/Documents/git/pantry-iq/.agents/spec/memory.md` when done

---

### Phase 2: Unit Tests for Field Mapper (Layer 1) — Depends on Phase 1

---

#### WU-1.1: Add Unit Tests for `field-mapper.ts` Changes

**Status:** [ ] Pending | [ ] In Progress | [ ] Complete | [ ] Failed

**Priority:** P1  
**Effort:** Medium  
**Dependencies:** WU-0.1, WU-0.2, WU-0.3, WU-0.4, WU-0.5, WU-0.6 (wait for Phase 1 to complete first)  
**Parallel group:** Layer 1 (solo)

### Prompt

You are a TypeScript test engineer working on a Next.js project at `/Users/harry/Documents/git/pantry-iq`.

Read `/Users/harry/Documents/git/pantry-iq/.agents/spec/memory.md` first.

**Context:** PR #2 introduced significant new behavior to `lib/csv/field-mapper.ts`:
1. Word-boundary substring matching (instead of simple `includes()`)
2. API key validity gating (`isValidApiKey()` — rejects stub/short keys)
3. Duplicate target field deduplication (`assignedTargets` Set — first-match-wins)
4. Regex character escaping (`escapeRegex()`)

The reviewer flagged that these behavioral changes lack unit test coverage.

**Your task:** Add unit tests for the four scenarios described below.

**Step 1:** Read the following files to understand current test patterns and the code under test:
- `lib/csv/field-mapper.ts` — the full file
- `tests/unit/` directory — find any existing field-mapper tests to understand test style and framework (likely Vitest or Jest)
- `package.json` — check the test script and framework

**Step 2:** Find the correct test file. If `tests/unit/field-mapper.test.ts` (or similar) already exists, add to it. If not, create it following the same pattern as other unit tests.

**Step 3:** Add tests for these four scenarios:

**A. Word-boundary matching — generic words should NOT match**
```
Test: header 'Server Name' should NOT map to 'item'
Reason: 'name' appears in 'Server Name' but is a common word — the new word-boundary regex should prevent this false positive. Verify that 'Server Name' returns null or maps to something other than 'item'.
```

**B. Duplicate target deduplication — first-match-wins**
```
Test: headers ['Sale Date', 'Transaction Time'] — if both would match 'date', only the FIRST header ('Sale Date') should be assigned 'date'. 'Transaction Time' should be assigned a different field or left unmapped.
Test: verify the assignedTargets Set prevents overwriting an already-mapped target.
```

**C. Stub API key gating — fallback even when env var present**
```
Test: when OPENAI_API_KEY (or whichever key gates AI mapping) is set to 'stub', the field mapper should use the fallback pattern matching instead of AI mapping.
Test: when key is 'test', same behavior.
Test: when key is a short string (< 20 chars), same behavior.
Test: when key is a real-looking key (>= 20 chars, no stub/test), AI path should be attempted.
Note: you may need to mock the AI call — check how existing tests handle this.
```

**D. Regex escaping — meta-characters in headers are safe**
```
Test: header with regex meta-characters like 'Item (Count)' or 'Price [USD]' or 'Date+Time' should not throw and should be handled gracefully (either mapped or returned as null, but no exception thrown).
```

**Acceptance Criteria:**

- All four scenario groups have at least one test each
- Tests follow the same framework and style as existing unit tests in `tests/unit/`
- All tests pass: run `npm run test:unit` to verify
- No existing tests are broken

**Notes:**

- If the AI mapping path is hard to test (requires mocking HTTP), focus tests on the fallback (`fallbackMappings`) function directly — it is exported or can be tested via the public `mapFields` function with stub keys
- Update `/Users/harry/Documents/git/pantry-iq/.agents/spec/memory.md` when done
