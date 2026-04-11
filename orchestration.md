# Orchestration Plan — PantryIQ Test Coverage Implementation

> Generated: April 2026
> Prerequisites: `testing-coverage.md` (gap analysis), `scripts/generate-test-csv-faker.ts` (CSV generator), `tests/unit/csv-import-pipeline.test.ts` (178 pipeline tests)
>
> **Objective:** Close every gap identified in `testing-coverage.md`, fix known production bugs, generate test fixture files, clean up dead-weight tests, and wire up infrastructure — then verify with a full green test suite.

---

## Table of Contents

1. [Execution Summary](#execution-summary)
2. [Phase 0 — Infrastructure & Cleanup](#phase-0--infrastructure--cleanup)
3. [Phase 1 — Production Bug Fixes](#phase-1--production-bug-fixes)
4. [Phase 2 — CSV Import Critical Path](#phase-2--csv-import-critical-path)
5. [Phase 3 — API Route Unit Tests](#phase-3--api-route-unit-tests)
6. [Phase 4 — Library Module Tests](#phase-4--library-module-tests)
7. [Phase 5 — Component Tests](#phase-5--component-tests)
8. [Phase 6 — Integration & E2E Expansion](#phase-6--integration--e2e-expansion)
9. [Phase 7 — Final Verification](#phase-7--final-verification)
10. [Appendix — File Manifest](#appendix--file-manifest)

---

## Execution Summary

| Phase | Tasks | Parallelizable | Depends On |
|-------|-------|----------------|------------|
| 0 | 5 | 4 parallel + 1 sequential | — |
| 1 | 3 | All 3 parallel | Phase 0 |
| 2 | 5 | 3 parallel + 2 sequential | Phase 1 |
| 3 | 5 | All 5 parallel | Phase 0 |
| 4 | 5 | All 5 parallel | Phase 0 |
| 5 | 3 | All 3 parallel | Phase 0 |
| 6 | 3 | 2 parallel + 1 sequential | Phases 1–5 |
| 7 | 2 | Sequential | All |

**Total: 31 tasks, estimated 11 sub-agent dispatches (batched by parallelism)**

---

## Phase 0 — Infrastructure & Cleanup

> **Goal:** Fix test infrastructure so all subsequent phases build on a solid foundation.
> **Parallelism:** Tasks 0A–0D run in parallel. Task 0E runs after all complete.

### Task 0A — Wire `tests/setup.ts` into Vitest Config

**File:** `vitest.config.ts`
**Change:** Add `setupFiles: ['./tests/setup.ts']` inside the `test` block.

```ts
test: {
  environment: 'jsdom',
  globals: true,
  setupFiles: ['./tests/setup.ts'],
  include: ['tests/unit/**/*.test.ts', 'tests/unit/**/*.test.tsx'],
  exclude: ['tests/e2e/**/*', 'node_modules'],
},
```

**Why:** `tests/setup.ts` exists but is never loaded. All subsequent test files may depend on global setup (afterEach cleanup, mock resets, custom matchers).

### Task 0B — Add Vitest Coverage Configuration

**File:** `vitest.config.ts`
**Change:** Add coverage block for `@vitest/coverage-v8`.

```ts
test: {
  // ... existing config
  coverage: {
    provider: 'v8',
    reporter: ['text', 'html', 'lcov'],
    include: ['lib/**/*.ts', 'app/api/**/*.ts', 'components/**/*.tsx'],
    exclude: ['**/*.test.ts', '**/*.spec.ts', 'tests/**', 'node_modules/**'],
    thresholds: {
      lines: 50,       // Start conservative, raise as coverage grows
      functions: 50,
      branches: 40,
      statements: 50,
    },
  },
},
```

**Also install:** `npm install -D @vitest/coverage-v8`
**Also add script:** `"test:coverage": "vitest run --coverage"` in `package.json`

### Task 0C — Delete Placeholder Tests

**Delete:**
- `tests/unit/placeholder.test.ts` (7 lines — `expect(true).toBe(true)`)
- `tests/e2e/example.spec.ts` (6 lines — `expect(true).toBe(true)`)

**Why:** Dead weight. They inflate test counts and pass even if the entire codebase is deleted.

### Task 0D — Generate Fixture CSV Files

**Command:** `npx ts-node scripts/generate-test-csv-faker.ts --all --output tests/fixtures/generated/`

**Creates 21 CSV files** in `tests/fixtures/generated/`:
- `square-pos.csv`, `toast-pos.csv`, `clover-pos.csv`, `quickbooks.csv`
- `excel-manual.csv`, `vendor-invoice.csv`, `inventory-count.csv`
- `european-format.csv`, `unicode-menu.csv`, `minimal-valid.csv`
- `missing-columns.csv`, `duplicate-headers.csv`, `empty-rows.csv`
- `huge-columns.csv`, `currency-symbols.csv`, `mixed-dates.csv`
- `negative-values.csv`, `semicolon-delim.csv`, `tab-delim.csv`
- `headers-only.csv`, `single-row.csv`

**Why:** E2E and integration tests need real files on disk. Unit tests use programmatic generation, but integration tests benefit from static fixtures.

### Task 0E — Verify Infrastructure (Sequential — after 0A–0D)

**Command:** `npm run test:unit`

**Acceptance:** All existing tests still pass (430+ tests, excluding the 2 pre-existing `places-client.test.ts` failures).

---

## Phase 1 — Production Bug Fixes

> **Goal:** Fix the 3 known bugs discovered during test development. Each fix is independent.
> **Parallelism:** All 3 tasks run in parallel.
> **Depends on:** Phase 0 (infrastructure is clean)

### Task 1A — Fix Dead Ternary in Import Status

**File:** `app/api/csv/field-mapping/route.ts` (line 251)
**Bug:** `const finalStatus = errors.length === 0 ? 'complete' : 'complete'` — always sets `'complete'` even when ALL rows fail.
**Fix:**

```ts
const finalStatus = errors.length === 0
  ? 'complete'
  : validInserts > 0
    ? 'complete'       // Partial success — some rows imported
    : 'error'          // Total failure — zero rows imported
```

**Test update:** Update the assertion in `csv-import-pipeline.test.ts` (line 873 area) from documenting the bug to asserting the fix. The import state machine tests should now expect `'error'` when all rows fail.

**Verify:** `npx vitest run tests/unit/csv-import-pipeline.test.ts`

### Task 1B — Fix Greedy Substring Pattern Matching

**File:** `lib/csv/field-mapper.ts` (line 107)
**Bug:** `normalized.includes(pattern) || pattern.includes(normalized)` — bidirectional substring match is too aggressive. `"Discount Amount"` matches `"amount"` → qty; `"Server Name"` matches `"name"` → item; `"Tax Amount"` matches `"amount"` → qty.
**Fix:** Remove the reverse direction (`pattern.includes(normalized)`) and require the pattern to appear as a word boundary in the header:

```ts
function findFallbackMapping(header: string): StandardField | null {
  const normalized = normalizeHeader(header)

  // Exact match
  if (FALLBACK_PATTERNS[normalized]) {
    return FALLBACK_PATTERNS[normalized]
  }

  // Word-boundary substring match: only match if the pattern appears
  // as a complete word segment in the header (not as a substring of
  // an unrelated word). Check that the pattern is preceded and followed
  // by a word boundary (start/end, space, underscore, hyphen).
  for (const [pattern, field] of Object.entries(FALLBACK_PATTERNS)) {
    const regex = new RegExp(`(?:^|[\\s_-])${escapeRegex(pattern)}(?:$|[\\s_-])`)
    if (regex.test(normalized)) {
      return field
    }
  }

  return null
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
```

**Test update:** Update `csv-import-pipeline.test.ts` huge-columns assertion from `expect(mappedCount).toBeGreaterThan(STANDARD_FIELDS.length)` back to `expect(mappedCount).toBeLessThanOrEqual(STANDARD_FIELDS.length)` now that the bug is fixed.

**Verify:** `npx vitest run tests/unit/csv-import-pipeline.test.ts`

### Task 1C — Fix Duplicate Target Field Overwrite

**File:** `lib/csv/field-mapper.ts` — `fallbackMappings()` function (line 211)
**Bug:** Multiple columns can map to the same target field (e.g., `Date` → date AND `Time` → date). `applyMapping()` iterates entries and the last one wins, silently discarding the correct value.
**Fix:** In `fallbackMappings()`, track which target fields have been assigned and skip duplicates (first-match-wins):

```ts
function fallbackMappings(headers: string[]): FieldMapping {
  const mapping: FieldMapping = {}
  const assignedTargets = new Set<StandardField>()

  for (const header of headers) {
    const target = findFallbackMapping(header)
    if (target && !assignedTargets.has(target)) {
      mapping[header] = target
      assignedTargets.add(target)
    } else {
      mapping[header] = target && assignedTargets.has(target) ? null : target
    }
  }

  return mapping
}
```

**Test update:** Update `csv-import-pipeline.test.ts` Square POS pipeline test — remove the "KNOWN BUG" documentation block and assert that `validRows.length > 0` now that `Date` is preserved and `Time` is unmapped.

**Verify:** `npx vitest run tests/unit/csv-import-pipeline.test.ts`

---

## Phase 2 — CSV Import Critical Path

> **Goal:** Complete unit test coverage for the business-critical CSV import pipeline.
> **Parallelism:** Tasks 2A, 2B, 2C run in parallel. Then 2D and 2E run sequentially.
> **Depends on:** Phase 1 (bugs are fixed, so tests assert correct behavior)

### Task 2A — CSV Storage Layer Tests

**Create:** `tests/unit/csv-storage.test.ts`
**Tests for:** `lib/csv/storage.ts` — `ensureUploadDir()`, `writeCSVFile()`, `readCSVFile()`, `deleteCSVFile()`, `getUploadFilePath()`
**Coverage:**
- Creates upload dir if it doesn't exist
- Writes file content and reads it back (roundtrip)
- Deletes file and confirms it's gone
- `readCSVFile()` throws/returns null for non-existent file
- `deleteCSVFile()` is idempotent (no error on missing file)
- `getUploadFilePath()` returns path inside upload dir
- Path traversal protection (filenames like `../../etc/passwd` are rejected or sanitized)
- Concurrent writes to different files don't interfere

**Strategy:** Use a temp dir (via `os.tmpdir()` + random suffix) per test to avoid interference. Clean up in `afterAll`.

**Verify:** `npx vitest run tests/unit/csv-storage.test.ts`

### Task 2B — CSV Upload Route Handler Tests

**Create:** `tests/unit/csv-upload-route.test.ts`
**Tests for:** `app/api/csv/upload/route.ts` — POST handler
**Coverage:**
- Returns 401 when not authenticated (mock session to null)
- Returns 400 when no file attached
- Returns 400 when no `location_id` in form data
- Returns 400 for non-CSV file extension (e.g., `.exe`, `.json`)
- Returns 413 for files exceeding 50MB size limit
- Successful upload returns `{ uploadId, filename, rowCount, headers, previewRows, status: 'pending' }`
- Creates a `csv_uploads` database record (mock `db.insert`)
- Writes the raw file to disk (mock storage functions)
- Preview rows are limited to 10 (even if file has 1000 rows)

**Strategy:** Mock `getServerSession` from `lib/auth`, mock `db` from Drizzle, mock `fs/promises` for file operations. Test the handler function directly by constructing `NextRequest` objects with `FormData`.

**Verify:** `npx vitest run tests/unit/csv-upload-route.test.ts`

### Task 2C — Field Mapping Route Handler Tests

**Create:** `tests/unit/csv-field-mapping-route.test.ts`
**Tests for:** `app/api/csv/field-mapping/route.ts` — POST (suggest + confirm) and GET
**Coverage:**

**POST without `confirmedMapping` (suggest mode):**
- Returns 401 when not authenticated
- Returns 400 when `uploadId` missing
- Returns 404 when upload record doesn't exist
- Returns 403 when upload belongs to different user
- Returns suggested mapping with all headers as keys
- Sets upload status to `'mapping'`
- Falls back to pattern matching when no LLM keys configured

**POST with `confirmedMapping` (import mode):**
- Returns 400 when mapping fails validation (no `item` mapped)
- Reads CSV file from disk, parses all rows
- Applies mapping and validates each row (item, date, qty required)
- Inserts valid rows into `transactions` table
- Collects errors for invalid rows (with row number and message)
- Returns `{ status, totalRows, importedRows, errors }`
- Sets upload status to `'complete'` on success
- Sets upload status to `'error'` when ALL rows fail (after Task 1A fix)
- Deletes temp CSV file after import (success or failure)
- Stores confirmed mapping as JSON in upload record

**GET handler:**
- Returns 401 when not authenticated
- Returns 400 when `uploadId` query param missing
- Returns existing mapping if already confirmed
- Returns 404 if upload not found

**Strategy:** Same mocking approach as 2B. For the import loop, provide a mock CSV file content that includes some valid and some invalid rows to test partial failure behavior.

**Verify:** `npx vitest run tests/unit/csv-field-mapping-route.test.ts`

### Task 2D — Expand Pipeline Test Coverage (Sequential — after 2A–2C)

**Modify:** `tests/unit/csv-import-pipeline.test.ts`
**Add tests for gaps identified in `testing-coverage.md`:**

**Encoding tests:**
- UTF-8 BOM (prepend `\xEF\xBB\xBF` to buffer)
- UTF-16 LE (iconv-lite encode to `utf16le`)
- ISO-8859-1 (Latin-1 characters like café, naïve)

**Numeric normalization edge cases:**
- Currency symbols: `$99.99`, `€50.00`, `£30.50` → should strip symbol and parse
- Thousands separators: `1,000.00` → 1000
- European decimals: `1.000,00` → 1000 (if locale detection is added)
- Negative numbers: `-5`, `(5)` (accounting format)
- Whitespace-only values: `"   "` → null
- Percentage values: `15%` → 15 or null (document decision)

**Date edge cases:**
- ISO 8601: `2025-01-15T14:30:00Z` → `2025-01-15`
- US format: `01/15/2025` → `2025-01-15`
- European format: `15/01/2025` → should parse correctly (currently may swap month/day)
- Long format: `January 15, 2025` → should parse or document as unsupported
- Future dates: `2030-01-01` → should still be valid

**Verify:** `npx vitest run tests/unit/csv-import-pipeline.test.ts`

### Task 2E — Generate Final Fixture Files (Sequential — after 2D)

**Command:** `npx ts-node scripts/generate-test-csv-faker.ts --all --output tests/fixtures/generated/ --records 50`

Regenerate all 21 fixture files with 50 records each now that the generator has been validated. These files will be used by integration and E2E tests in later phases.

**Verify:** Check that all 21 files exist and have correct row counts.

---

## Phase 3 — API Route Unit Tests

> **Goal:** Add unit tests for every API route handler. Currently 0/16 routes have unit tests.
> **Parallelism:** All 5 tasks run in parallel (independent route groups).
> **Depends on:** Phase 0 (infrastructure)

### Task 3A — Auth Route Tests

**Create:** `tests/unit/auth-route.test.ts`
**Tests for:** `app/api/auth/[...all]/route.ts`
**Coverage:**
- Delegates to Better Auth handler (verify `toNextJsHandler()` is called)
- GET and POST both route through the handler
- Note: Deep auth logic (signup, login, session) is tested by Better Auth itself and E2E; this just verifies our route wiring.

**Verify:** `npx vitest run tests/unit/auth-route.test.ts`

### Task 3B — Locations Route Tests

**Create:** `tests/unit/locations-route.test.ts`
**Tests for:** `app/api/locations/route.ts` and `app/api/locations/[id]/route.ts`
**Coverage:**
- `GET /api/locations` — returns user's locations (auth required)
- `POST /api/locations` — creates location (auth required, validates name)
- `GET /api/locations/[id]` — returns single location (auth + ownership required)
- `PUT /api/locations/[id]` — updates location (auth + ownership)
- `DELETE /api/locations/[id]` — deletes location and cascades (auth + ownership)
- 401 for unauthenticated, 403 for wrong user, 404 for missing location
- Error responses follow `{ error, code }` format

**Strategy:** Mock `getServerSession`, mock Drizzle `db.select/insert/update/delete`. Test handlers directly with `NextRequest` construction.

**Also:** Delete or gut `tests/unit/locations-api.test.ts` (assertion-of-constants anti-pattern — 295 lines of tests that never import production code).

**Verify:** `npx vitest run tests/unit/locations-route.test.ts`

### Task 3C — Conversations & Message Route Tests

**Create:** `tests/unit/conversations-route.test.ts`
**Tests for:** `app/api/conversations/route.ts`, `app/api/conversations/[id]/route.ts`, `app/api/conversations/[id]/history/route.ts`, `app/api/conversations/[id]/message/route.ts`
**Coverage:**
- `GET /api/conversations` — list conversations (auth required)
- `POST /api/conversations` — create conversation (auth + locationId required)
- `GET /api/conversations/[id]` — get single (auth + ownership)
- `PATCH /api/conversations/[id]` — update title (auth + ownership)
- `DELETE /api/conversations/[id]` — delete (auth + ownership)
- `GET /api/conversations/[id]/history` — get messages (auth + ownership)
- `POST /api/conversations/[id]/message` — send message, stream LLM response (mock AI SDK)
- Verify streaming response format
- 401, 403, 404 error paths

**Also:** Delete or gut `tests/unit/conversation-api.test.ts` (assertion-of-constants anti-pattern).

**Verify:** `npx vitest run tests/unit/conversations-route.test.ts`

### Task 3D — Dashboard, Subscribe, Weather, Places Route Tests

**Create:** `tests/unit/misc-routes.test.ts`
**Tests for:** `app/api/dashboard/route.ts`, `app/api/subscribe/route.ts`, `app/api/weather/[location]/route.ts`, `app/api/places/[location]/route.ts`
**Coverage:**
- `GET /api/dashboard` — returns aggregated analytics (auth required)
- `POST /api/subscribe` — validates email, creates waitlist record, returns success
- `GET /api/weather/[location]` — returns weather data (auth required, mock OpenWeatherMap)
- `GET /api/places/[location]` — returns nearby places (auth required, mock Google Places)
- Error paths: missing params, invalid email, API failures

**Verify:** `npx vitest run tests/unit/misc-routes.test.ts`

### Task 3E — Square Routes Tests

**Create:** `tests/unit/square-routes.test.ts`
**Tests for:** `app/api/square/connect/route.ts`, `app/api/square/callback/route.ts`, `app/api/square/sync/route.ts`
**Coverage:**
- `POST /api/square/connect` — generates OAuth URL with correct params (auth required)
- `GET /api/square/callback` — exchanges code for token, encrypts + stores (mock Square API)
- `POST /api/square/sync` — triggers sync, returns results (auth required, mock sync manager)
- CSRF: state parameter validation on callback
- Error paths: missing code, invalid state, Square API failure

**Verify:** `npx vitest run tests/unit/square-routes.test.ts`

---

## Phase 4 — Library Module Tests

> **Goal:** Add unit tests for every untested `lib/` module.
> **Parallelism:** All 5 tasks run in parallel (independent modules).
> **Depends on:** Phase 0 (infrastructure)

### Task 4A — API Error & Utils Tests

**Create:** `tests/unit/api-error.test.ts`
**Tests for:** `lib/api-error.ts`, `lib/utils.ts`
**Coverage:**
- `ApiError.badRequest()` returns 400 with `{ error, code }` JSON body
- `ApiError.unauthorized()` returns 401
- `ApiError.forbidden()` returns 403
- `ApiError.notFound()` returns 404
- `ApiError.internalServerError()` returns 500
- `ApiError.conflict()` returns 409
- `ApiError.unprocessable()` returns 422
- `logErrorSafely()` returns generic message, does not include stack trace in return value
- `logErrorSafely()` handles `Error`, string, null, and object inputs
- `cn()` merges Tailwind classes correctly (e.g., conflicting `p-4` and `p-2`)

**Verify:** `npx vitest run tests/unit/api-error.test.ts`

### Task 4B — AI Module Tests

**Create:** `tests/unit/ai-modules.test.ts`
**Tests for:** `lib/ai/context-builder.ts`, `lib/ai/stream-handler.ts`, `lib/ai/providers.ts`
**Coverage:**
- `buildContextData()` aggregates transactions, weather, places into structured context
- `buildContextData()` handles empty data sets gracefully
- `persistStreamedMessage()` saves assistant messages to database (mock db)
- `persistUserMessage()` saves user messages to database (mock db)
- `initializeProviders()` returns correct providers based on env keys
- `initializeProviders()` returns empty when no keys set
- Provider priority: Anthropic > OpenAI > Google

**Strategy:** Mock database operations and environment variables.

**Verify:** `npx vitest run tests/unit/ai-modules.test.ts`

### Task 4C — Square Module Tests

**Create:** `tests/unit/square-modules.test.ts`
**Tests for:** `lib/square/sync.ts`, `lib/square/encryption.ts`
**Coverage:**
- `SquareSyncManager` — fetches transactions from Square API (mock HTTP)
- `SquareSyncManager` — deduplicates by `sourceId`
- `SquareSyncManager` — inserts only new transactions
- `SquareSyncManager` — handles API pagination
- `encrypt()` → `decrypt()` roundtrip preserves plaintext
- `encrypt()` produces different ciphertext each call (random IV)
- `decrypt()` with wrong key throws

**Note:** `tests/unit/square-client.test.ts` (250 lines) already exists for `lib/square/client.ts`. This task covers the **untested** modules.

**Verify:** `npx vitest run tests/unit/square-modules.test.ts`

### Task 4D — Zero Module Tests

**Create:** `tests/unit/zero-modules.test.ts`
**Tests for:** `lib/zero/schema.ts`, `lib/zero/permissions.ts`
**Coverage:**
- Schema defines all expected tables with correct column types
- `getLocationPermissionFilter()` returns filter scoped to user's ID
- `getConversationPermissionFilter()` returns filter scoped to user's locations
- Filters handle edge case: user has no locations → returns empty/deny filter

**Note:** `tests/unit/zero-permissions.test.ts` (234 lines) already exists. Review it first — extend if it covers permissions but not schema.

**Verify:** `npx vitest run tests/unit/zero-modules.test.ts`

### Task 4E — Analytics & PostHog Tests

**Create:** `tests/unit/analytics.test.ts`
**Tests for:** `lib/analytics-utils.ts`, `lib/posthog-server.ts`
**Coverage:**
- `hashLocationId()` returns consistent SHA-256 hash for same input
- `hashLocationId()` returns different hashes for different inputs
- `captureAnalyticsEvent()` calls PostHog in production, is no-op otherwise
- `getPostHogClient()` returns singleton (same instance on repeated calls)
- `shutdownPostHog()` calls `client.shutdown()` and resets singleton

**Strategy:** Mock `process.env.NODE_ENV` and PostHog client.

**Verify:** `npx vitest run tests/unit/analytics.test.ts`

---

## Phase 5 — Component Tests

> **Goal:** Add React component unit tests using `@testing-library/react` (already installed but unused).
> **Parallelism:** All 3 tasks run in parallel.
> **Depends on:** Phase 0 (infrastructure)

### Task 5A — Import Component Tests

**Create:** `tests/unit/components/csv-upload.test.tsx`
**Tests for:** `components/import/csv-upload.tsx`
**Coverage:**
- Renders file drop zone with correct accept attribute (`.csv`, `.tsv`)
- Displays "drag and drop" instruction text
- Shows error message for invalid file type (mock)
- Shows upload progress indicator during upload
- Calls `onUploadComplete` callback with upload response
- Disables drop zone when `disabled` prop is true
- Shows file name after successful selection

**Create:** `tests/unit/components/field-mapping-ui.test.tsx`
**Tests for:** `components/import/field-mapping-ui.tsx`
**Coverage:**
- Renders header-to-field mapping dropdowns for each CSV column
- Pre-selects suggested mappings
- Allows user to change mapping via dropdown
- "Confirm" button is disabled until `item` is mapped
- Shows preview table with sample data
- Calls `onConfirm` with final mapping

**Verify:** `npx vitest run tests/unit/components/`

### Task 5B — Auth Component Tests

**Create:** `tests/unit/components/auth-forms.test.tsx`
**Tests for:** `components/auth/signup-form.tsx`, `components/auth/login-form.tsx`
**Coverage:**
- Signup form renders email, password, confirm password fields
- Signup form validates matching passwords
- Signup form shows error for invalid email
- Login form renders email and password fields
- Login form calls signIn on submit (mock auth client)
- Both forms show loading state during submission
- Both forms display server error messages

**Verify:** `npx vitest run tests/unit/components/auth-forms.test.tsx`

### Task 5C — Dashboard Component Tests

**Create:** `tests/unit/components/dashboard-cards.test.tsx`
**Tests for:** `components/dashboard/import-status-card.tsx`, `components/dashboard/location-overview-card.tsx`, `components/dashboard/quick-actions-card.tsx`
**Coverage:**
- Import status card shows correct status badge for each state
- Location overview card renders location name and transaction count
- Quick actions card renders action buttons with correct links
- All cards handle empty/loading states gracefully

**Verify:** `npx vitest run tests/unit/components/dashboard-cards.test.tsx`

---

## Phase 6 — Integration & E2E Expansion

> **Goal:** Add integration tests that span multiple modules, and expand E2E coverage.
> **Parallelism:** Tasks 6A and 6B run in parallel. Task 6C runs after both.
> **Depends on:** Phases 1–5 (all unit tests and bug fixes complete)

### Task 6A — CSV Import Integration Tests

**Create:** `tests/unit/csv-import-integration.test.ts`
**Tests for:** Full pipeline with mocked database layer.
**Coverage:**
- Upload → Parse → Map → Insert → Query cycle with mock DB
- Verify `transactions` table receives correct column values (`date` as text, `qty` as string-from-number, etc.)
- Cascade delete: deleting a location's uploads removes associated transactions
- Idempotency check: importing the same CSV twice creates duplicates (documenting the bug)
- Partial failure: 100-row file where 30 rows fail — verify 70 inserted, 30 errors returned
- Large file behavior: 10,000-row file completes without timeout (performance baseline)
- Concurrent imports: two uploads for the same location don't interfere

**Strategy:** Use faker-generated fixtures from `tests/fixtures/generated/`. Mock only the database layer; exercise real parser, mapper, and normalizer.

**Verify:** `npx vitest run tests/unit/csv-import-integration.test.ts`

### Task 6B — Rewrite Anti-Pattern Tests

**Rewrite or replace:**
1. `tests/unit/locations-api.test.ts` (295 lines) — Currently tests hardcoded mock objects. Rewrite to test the actual `GET/POST /api/locations` route handlers using mocked DB/session, or delete entirely if Phase 3 Task 3B already covers it fully (in which case just delete).
2. `tests/unit/conversation-api.test.ts` (363 lines) — Same situation. Rewrite or delete in favor of Phase 3 Task 3C.
3. `tests/unit/auth.test.ts` (164 lines) — Tests regex patterns against strings it constructs. Rewrite to test actual auth logic, or delete in favor of Phase 3 Task 3A + existing E2E coverage.

**Decision rule:** If the Phase 3 route test file for that area has ≥80% of the assertions the anti-pattern file had, delete the anti-pattern file. Otherwise, extract any unique test cases into the new file.

**Verify:** `npx vitest run`

### Task 6C — Update `testing-coverage.md` (Sequential — after 6A, 6B)

**Modify:** `testing-coverage.md`
**Changes:**
- Update all coverage percentages and counts to reflect new tests
- Move closed gaps from "Gap Analysis" to "Covered" section
- Update "Existing Test Inventory" table with new file list
- Mark fixed bugs in the "Risk Assessment" matrix
- Add a "Changes Since Initial Report" section at the bottom

**Verify:** Manual review.

---

## Phase 7 — Final Verification

> **Goal:** Ensure everything works end-to-end.
> **Sequential:** Must run after all prior phases.

### Task 7A — Full Unit Test Suite

**Command:** `npm run test:unit`
**Acceptance:** All tests pass. Zero failures (the 2 pre-existing `places-client.test.ts` failures should also be fixed if Phase 4 touched that area, or documented as known).

### Task 7B — Coverage Report

**Command:** `npm run test:coverage`
**Acceptance:**
- `lib/csv/` — ≥90% line coverage
- `lib/ai/` — ≥70% line coverage
- `lib/square/` — ≥70% line coverage
- `app/api/csv/` — ≥80% line coverage
- `app/api/locations/` — ≥80% line coverage
- `app/api/conversations/` — ≥70% line coverage
- Overall — ≥50% line coverage (up from current ~0% measured)

---

## Appendix — File Manifest

### Files to CREATE

| File | Phase | Lines (est.) |
|------|-------|-------------|
| `tests/unit/csv-storage.test.ts` | 2A | ~120 |
| `tests/unit/csv-upload-route.test.ts` | 2B | ~200 |
| `tests/unit/csv-field-mapping-route.test.ts` | 2C | ~350 |
| `tests/unit/auth-route.test.ts` | 3A | ~60 |
| `tests/unit/locations-route.test.ts` | 3B | ~250 |
| `tests/unit/conversations-route.test.ts` | 3C | ~400 |
| `tests/unit/misc-routes.test.ts` | 3D | ~250 |
| `tests/unit/square-routes.test.ts` | 3E | ~200 |
| `tests/unit/api-error.test.ts` | 4A | ~150 |
| `tests/unit/ai-modules.test.ts` | 4B | ~200 |
| `tests/unit/square-modules.test.ts` | 4C | ~200 |
| `tests/unit/zero-modules.test.ts` | 4D | ~100 |
| `tests/unit/analytics.test.ts` | 4E | ~80 |
| `tests/unit/components/csv-upload.test.tsx` | 5A | ~150 |
| `tests/unit/components/field-mapping-ui.test.tsx` | 5A | ~200 |
| `tests/unit/components/auth-forms.test.tsx` | 5B | ~200 |
| `tests/unit/components/dashboard-cards.test.tsx` | 5C | ~150 |
| `tests/unit/csv-import-integration.test.ts` | 6A | ~300 |
| `tests/fixtures/generated/` (21 CSV files) | 0D | ~1,050 |

### Files to MODIFY

| File | Phase | Change |
|------|-------|--------|
| `vitest.config.ts` | 0A, 0B | Add `setupFiles`, `coverage` config |
| `package.json` | 0B | Add `test:coverage` script, `@vitest/coverage-v8` dep |
| `app/api/csv/field-mapping/route.ts` | 1A | Fix dead ternary (line 251) |
| `lib/csv/field-mapper.ts` | 1B, 1C | Fix greedy patterns + duplicate targets |
| `tests/unit/csv-import-pipeline.test.ts` | 1A, 1B, 1C, 2D | Update assertions for fixed bugs + add encoding/edge case tests |
| `testing-coverage.md` | 6C | Update coverage numbers |

### Files to DELETE

| File | Phase | Reason |
|------|-------|--------|
| `tests/unit/placeholder.test.ts` | 0C | Dead weight |
| `tests/e2e/example.spec.ts` | 0C | Dead weight |
| `tests/unit/locations-api.test.ts` | 6B | Anti-pattern (replaced by 3B) |
| `tests/unit/conversation-api.test.ts` | 6B | Anti-pattern (replaced by 3C) |
| `tests/unit/auth.test.ts` | 6B | Anti-pattern (replaced by 3A) |

---

## Sub-Agent Dispatch Plan

Below is the optimal batching of sub-agents to maximize parallelism while respecting dependencies.

### Dispatch 1 — Phase 0 (4 parallel agents)

| Agent | Task | Description |
|-------|------|-------------|
| Agent 1 | 0A | Wire `tests/setup.ts` into vitest config |
| Agent 2 | 0B | Add coverage config + install `@vitest/coverage-v8` |
| Agent 3 | 0C | Delete placeholder tests |
| Agent 4 | 0D | Generate 21 fixture CSV files |

### Dispatch 2 — Phase 0E (1 sequential agent)

| Agent | Task | Description |
|-------|------|-------------|
| Agent 5 | 0E | Run `npm run test:unit`, verify green |

### Dispatch 3 — Phase 1 (3 parallel agents)

| Agent | Task | Description |
|-------|------|-------------|
| Agent 6 | 1A | Fix dead ternary + update test assertions |
| Agent 7 | 1B | Fix greedy pattern matching + update test assertions |
| Agent 8 | 1C | Fix duplicate target field + update test assertions |

### Dispatch 4 — Phases 2A-C + 3 + 4 + 5 (16 parallel agents)

> After Phase 1, all Phase 2 parallel tasks, all Phase 3, all Phase 4, and all Phase 5 tasks are independent. Maximum parallelism.

| Agent | Task | Description |
|-------|------|-------------|
| Agent 9 | 2A | CSV storage layer tests |
| Agent 10 | 2B | CSV upload route tests |
| Agent 11 | 2C | CSV field mapping route tests |
| Agent 12 | 3A | Auth route tests |
| Agent 13 | 3B | Locations route tests |
| Agent 14 | 3C | Conversations route tests |
| Agent 15 | 3D | Dashboard/subscribe/weather/places route tests |
| Agent 16 | 3E | Square route tests |
| Agent 17 | 4A | API error & utils tests |
| Agent 18 | 4B | AI module tests |
| Agent 19 | 4C | Square module tests |
| Agent 20 | 4D | Zero module tests |
| Agent 21 | 4E | Analytics tests |
| Agent 22 | 5A | Import component tests |
| Agent 23 | 5B | Auth component tests |
| Agent 24 | 5C | Dashboard component tests |

### Dispatch 5 — Phase 2D-E (sequential)

| Agent | Task | Description |
|-------|------|-------------|
| Agent 25 | 2D | Expand pipeline test coverage (encoding, edge cases) |
| Agent 26 | 2E | Regenerate fixture files |

### Dispatch 6 — Phase 6 (2 parallel + 1 sequential)

| Agent | Task | Description |
|-------|------|-------------|
| Agent 27 | 6A | CSV import integration tests |
| Agent 28 | 6B | Rewrite/delete anti-pattern tests |
| Agent 29 | 6C | Update `testing-coverage.md` (after 6A + 6B) |

### Dispatch 7 — Phase 7 (sequential)

| Agent | Task | Description |
|-------|------|-------------|
| Agent 30 | 7A | Full unit test suite verification |
| Agent 31 | 7B | Coverage report generation |

**Total sub-agent dispatches: 7 rounds, 31 agent invocations**
**Maximum concurrency: 16 agents (Dispatch 4)**
