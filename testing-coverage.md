# PantryIQ Testing Coverage Report

> Generated: April 2026
> Scope: Full-stack monolith (marketing, auth, app, API, database)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Existing Test Inventory](#existing-test-inventory)
3. [Coverage Matrix by Layer](#coverage-matrix-by-layer)
4. [Gap Analysis](#gap-analysis)
5. [CSV Import Pipeline - Critical Path](#csv-import-pipeline---critical-path)
6. [Risk Assessment](#risk-assessment)
7. [Recommended Test Plan](#recommended-test-plan)
8. [Test Infrastructure Issues](#test-infrastructure-issues)

---

## Executive Summary

| Metric | Value |
|---|---|
| Unit test files | 14 (12 substantive + 2 placeholders) |
| E2E test files | 10 (9 substantive + 1 placeholder) |
| Total `it()`/`test()` blocks | ~220+ |
| Test fixture files | 7 CSV/TSV files |
| Library modules with unit tests | 10 / 25 (40%) |
| API routes with direct unit tests | 0 / 16 (0%) |
| React components with unit tests | 0 / 36 (0%) |
| Pages with E2E coverage | 9 / 9 (100%) |
| Critical path (CSV import) unit coverage | **Partial** -- parser and mapper tested; storage, route handlers, and DB insertion untested |

### Verdict

The project has **solid E2E breadth** (every page is visited) and **strong unit tests for utility libraries** (CSV parser, field mapper, AI prompts, weather/places/square clients, Zero permissions). However, there are **critical structural gaps**:

1. **Zero API route handler unit tests** -- all 16 route files are only validated through E2E
2. **Zero React component unit tests** -- despite `@testing-library/react` being installed
3. **Three unit test files use an "assertion-of-constants" anti-pattern** that tests hardcoded values instead of production code
4. **The CSV import storage layer (`lib/csv/storage.ts`) has no tests**
5. **The CSV-to-database insertion logic** (the most business-critical path) has no isolated unit test

---

## Existing Test Inventory

### Unit Tests (`tests/unit/`)

| File | Lines | Tests | What It Tests | Quality |
|---|---|---|---|---|
| `placeholder.test.ts` | 7 | 1 | `true === true` | **Dead weight** -- remove |
| `csv-parser.test.ts` | 156 | 10 | `lib/csv/parser.ts` (parseCSV, validateCSVStructure) | **Good** -- real fixtures, encoding, delimiters |
| `field-mapper.test.ts` | 232 | 16 | `lib/csv/field-mapper.ts` (validate, normalize, apply, suggest) | **Good** -- covers mapping logic |
| `schema.test.ts` | 64 | 9 | `db/schema/index.ts` barrel export | **Adequate** -- verifies 9 table exports |
| `prompts.test.ts` | 291 | 20+ | `lib/ai/prompts.ts` (system prompt, injection, sanitization) | **Strong** -- security-focused |
| `models.test.ts` | 232 | 15+ | `lib/ai/models.ts` (registry, cost calc, stats) | **Strong** -- thorough cost math |
| `weather-client.test.ts` | 344 | 20+ | `lib/weather/client.ts` (fetch, cache, rate limit) | **Strong** -- mocked fetch |
| `places-client.test.ts` | 372 | 20+ | `lib/places/client.ts` (search, cache hit/miss/expiry) | **Strong** -- mocked DB + fetch |
| `square-client.test.ts` | 250 | 15+ | `lib/square/client.ts` + `encryption.ts` | **Good** -- OAuth, encryption |
| `zero-permissions.test.ts` | 234 | 15+ | `lib/zero/permissions.ts` (RLS filters) | **Good** -- row-level security |
| `locations-api.test.ts` | 295 | 20+ | Location API "patterns" | **Poor** -- assertion-of-constants |
| `conversation-api.test.ts` | 363 | 20+ | Conversation API "patterns" | **Poor** -- assertion-of-constants |
| `auth.test.ts` | 164 | 10+ | Auth patterns (cookies, env vars, email rules) | **Poor** -- assertion-of-constants |
| `generate-test-csv.test.ts` | 422 | 25+ | `scripts/generate-test-csv.ts` + `lib/csv-parser.ts` | **Good** -- CLI + fixture validation |

### E2E Tests (`tests/e2e/`)

| File | Lines | Tests | What It Tests | Quality |
|---|---|---|---|---|
| `example.spec.ts` | 6 | 1 | `true === true` | **Dead weight** -- remove |
| `auth.spec.ts` | 193 | 6 | Signup, signin, redirects, session, signout | **Good** |
| `dashboard.spec.ts` | 190 | 6 | Auth guard, stats, locations, quick actions, empty state | **Good** |
| `navigation.spec.ts` | 121 | 6 | Page routing, CTA buttons, app shell | **Good** |
| `locations.spec.ts` | 124 | 5 | CRUD locations via UI | **Good** |
| `chat.spec.ts` | 262 | 8 | Conversations, messages, streaming, model selection | **Good** -- some conditional fragility |
| `csv-import.spec.ts` | 173 | 6 | Upload, AI mapping, manual mapping, validation, import | **Good** -- but uses conditional logic |
| `square-import.spec.ts` | 120 | 6 | Square OAuth flow, connect/disconnect, sync | **Good** |
| `sync.spec.ts` | 280 | 10 | Zero sync, offline support, RLS, REST fallback | **Good** |
| `error-handling.spec.ts` | 292 | 20+ | API errors, status codes, stack trace suppression | **Strong** |

### Test Fixtures (`tests/fixtures/`)

| File | Rows | Columns | Purpose |
|---|---|---|---|
| `sample-basic.csv` | 5 | 3 (Name, Email, Age) | Basic parsing |
| `sample-quoted.csv` | 4 | 3 (ID, Name, Description) | Quoted fields with commas |
| `sample-tsv.tsv` | 5 | 4 (Product, Quantity, Price, Category) | Tab delimiter |
| `sample-large.csv` | 20 | 4 (Name, Email, Age, Department) | Pagination test |
| `sample-transactions.csv` | 150 | 10 (Date through Location) | Transaction format |
| `sample-inventory.csv` | 120 | 9 (SKU through Last Restock) | Inventory format |
| `sample-vendor-invoices.csv` | 100 | 9 (Invoice Number through Status) | Invoice format |

---

## Coverage Matrix by Layer

### Library Code (`lib/`)

| Module | File | Unit Test | E2E Test | Coverage Notes |
|---|---|---|---|---|
| CSV Parser | `lib/csv/parser.ts` | **YES** | **YES** | Well covered: encoding, delimiter, edge cases |
| CSV Field Mapper | `lib/csv/field-mapper.ts` | **YES** | **YES** | Well covered: mapping, normalization, LLM fallback |
| CSV Storage | `lib/csv/storage.ts` | **NO** | Indirect | **GAP** -- no direct test for read/write/delete |
| Legacy CSV Parser | `lib/csv-parser.ts` | **YES** | NO | Test utility only |
| AI Prompts | `lib/ai/prompts.ts` | **YES** | NO | Strong: injection defense, sanitization |
| AI Models | `lib/ai/models.ts` | **YES** | NO | Strong: registry, cost calculation |
| AI Providers | `lib/ai/providers.ts` | **NO** | Indirect | **GAP** -- provider initialization |
| AI Stream Handler | `lib/ai/stream-handler.ts` | **NO** | Indirect | **GAP** -- message persistence |
| AI Context Builder | `lib/ai/context-builder.ts` | **NO** | **NO** | **GAP** -- no test at all |
| Weather Client | `lib/weather/client.ts` | **YES** | NO | Strong: rate limiting, concurrency |
| Places Client | `lib/places/client.ts` | **YES** | NO | Strong: cache, errors |
| Square Client | `lib/square/client.ts` | **YES** | NO | Good: OAuth, tokens |
| Square Encryption | `lib/square/encryption.ts` | **YES** | NO | Good: encrypt/decrypt |
| Square Sync | `lib/square/sync.ts` | **NO** | Indirect | **GAP** -- sync dedup logic |
| Zero Permissions | `lib/zero/permissions.ts` | **YES** | **YES** | Well covered |
| Zero Client | `lib/zero/index.ts` | **NO** | Indirect | **GAP** -- client init, hooks |
| Zero Schema | `lib/zero/schema.ts` | **NO** | **NO** | **GAP** -- schema definition |
| API Error | `lib/api-error.ts` | **NO** | **YES** | Only E2E validates |
| Auth Server | `lib/auth.ts` | **NO** | **YES** | Only E2E validates |
| Auth Client | `lib/auth-client.ts` | **NO** | Indirect | **GAP** |
| Utils | `lib/utils.ts` | **NO** | Indirect | **GAP** -- `cn()` utility |
| Analytics Utils | `lib/analytics-utils.ts` | **NO** | **NO** | **GAP** |
| PostHog Server | `lib/posthog-server.ts` | **NO** | **NO** | **GAP** |

### API Routes (`app/api/`)

| Route | Method(s) | Unit Test | E2E Test | Notes |
|---|---|---|---|---|
| `/api/auth/[...all]` | GET, POST | NO | **YES** | Better Auth handler |
| `/api/subscribe` | POST | NO | **YES** | Validation only via E2E |
| `/api/dashboard` | GET | NO | **NO** | **GAP** -- completely untested |
| `/api/locations` | GET, POST | NO | **YES** | `locations-api.test.ts` is assertion-of-constants |
| `/api/locations/[id]` | GET, PUT, DELETE | NO | **YES** | Same caveat |
| `/api/conversations` | GET, POST | NO | **YES** | `conversation-api.test.ts` is assertion-of-constants |
| `/api/conversations/[id]` | GET, PATCH, DELETE | NO | **YES** | Same caveat |
| `/api/conversations/[id]/message` | POST | NO | **YES** | Streaming, LLM call |
| `/api/conversations/[id]/history` | GET | NO | **YES** | |
| `/api/csv/upload` | POST | NO | **YES** | **Critical path -- needs unit tests** |
| `/api/csv/field-mapping` | GET, POST | NO | **YES** | **Critical path -- needs unit tests** |
| `/api/square/connect` | POST | NO | **YES** | |
| `/api/square/callback` | GET | NO | **YES** | |
| `/api/square/sync` | POST | NO | **YES** | |
| `/api/weather/[location]` | GET | NO | **NO** | **GAP** -- completely untested |
| `/api/places/[location]` | GET | NO | **NO** | **GAP** -- completely untested |

### React Components

| Component Group | Files | Unit Tests | E2E Coverage |
|---|---|---|---|
| `components/import/` | 4 files | 0 | **YES** (csv-import.spec.ts, square-import.spec.ts) |
| `components/auth/` | 3 files | 0 | **YES** (auth.spec.ts) |
| `components/dashboard/` | 3 files | 0 | **YES** (dashboard.spec.ts) |
| `components/chat/` | 7 files | 0 | **YES** (chat.spec.ts) |
| `components/settings/` | 2 files | 0 | **YES** (locations.spec.ts) |
| `components/layout/` | 2 files | 0 | **YES** (navigation.spec.ts) |
| `components/ui/` | 13 files | 0 | Indirect |
| `components/landing-page.tsx` | 1 file | 0 | **YES** (navigation.spec.ts) |

### Database Schema (`db/schema/`)

| Schema | Unit Test | Notes |
|---|---|---|
| `index.ts` (barrel) | **YES** | Verifies 9 exports |
| `auth.ts` | NO | 4 tables, relations |
| `locations.ts` | NO | Root tenant table |
| `conversations.ts` | NO | FK to locations |
| `messages.ts` | NO | FK to conversations |
| `transactions.ts` | NO | **Critical** -- FK to locations, composite index |
| `csv-uploads.ts` | NO | **Critical** -- FK to locations |
| `pos-connections.ts` | NO | FK to locations |
| `weather.ts` | NO | Unique index (locationId, date) |
| `places-cache.ts` | NO | FK to locations |
| `waitlist-signups.ts` | NO | Unique email constraint |

---

## Gap Analysis

### Critical Gaps (Business Impact: HIGH)

1. **CSV Import Route Handlers** (`app/api/csv/upload/route.ts`, `app/api/csv/field-mapping/route.ts`)
   - No unit tests for the actual route handler functions
   - No test for file size rejection (413)
   - No test for file type validation (.csv/.tsv only)
   - No test for database insertion of `csv_uploads` records
   - No test for the row-by-row import loop with error collection
   - No test for temp file write/read/delete lifecycle
   - No test for the `status` state machine (pending -> mapping -> importing -> complete/error)

2. **CSV Storage Layer** (`lib/csv/storage.ts`)
   - No test for `ensureUploadDir()`, `writeCSVFile()`, `readCSVFile()`, `deleteCSVFile()`
   - File system operations are untested

3. **Transaction Database Insertion**
   - No test validates that `applyMapping()` output correctly matches the `transactions` table schema
   - No test for the `qty`/`revenue`/`cost` type coercion (`String()` calls in route handler)
   - No test for cascade delete behavior (location deleted -> transactions deleted)

4. **Data Integrity Under Real Customer Scenarios**
   - No tests for: duplicate column headers, Unicode item names, negative quantities, zero-cost items, future dates, date-only vs datetime formats, currency symbols in numeric fields, percentage signs, thousands separators (1,000.00), European number formats (1.000,00)

### Moderate Gaps (Business Impact: MEDIUM)

5. **Dashboard API** (`/api/dashboard`) -- completely untested
6. **Weather API Route** (`/api/weather/[location]`) -- completely untested
7. **Places API Route** (`/api/places/[location]`) -- completely untested
8. **AI Context Builder** (`lib/ai/context-builder.ts`) -- aggregates transaction data for LLM context; no tests
9. **AI Stream Handler** (`lib/ai/stream-handler.ts`) -- persists LLM messages; no tests
10. **Square Sync Logic** (`lib/square/sync.ts`) -- incremental sync with dedup; no tests

### Low-Priority Gaps (Business Impact: LOW)

11. **Placeholder tests** -- `placeholder.test.ts` and `example.spec.ts` should be removed
12. **Setup file not wired** -- `tests/setup.ts` is not in vitest config's `setupFiles`
13. **PostHog/Analytics utilities** -- no tests (analytics is non-critical)
14. **`lib/utils.ts`** -- single `cn()` function (Tailwind class merge)

### Anti-Pattern: Assertion-of-Constants

Three test files test hardcoded values rather than importing production code:

- **`locations-api.test.ts`** (295 lines) -- defines its own mock objects and asserts their properties. Never imports from `app/api/locations/`.
- **`conversation-api.test.ts`** (363 lines) -- same pattern. Tests interface shapes, not behavior.
- **`auth.test.ts`** (164 lines) -- tests regex patterns against strings it constructs itself.

These provide **false confidence** and ~660 lines of tests that would pass even if the production code were deleted. They should be rewritten to test actual route handlers or removed.

---

## CSV Import Pipeline - Critical Path

This is the **revenue-critical flow**. If a customer cannot import their data, the product is unusable and triggers a refund.

### Pipeline Stages & Test Status

```
Stage 1: File Upload
  User -> CSVUpload component -> POST /api/csv/upload
  ├── File type validation (.csv, .tsv)          [E2E only]
  ├── File size validation (50MB limit)           [UNTESTED]
  ├── Encoding detection (UTF-8, UTF-16 LE/BE)   [Unit tested]
  ├── Delimiter detection (comma, tab, semicolon) [Unit tested]
  ├── Parse preview rows (first 10)               [Unit tested]
  ├── INSERT csv_uploads (status: pending)        [UNTESTED]
  └── Write temp file to /tmp/csv-uploads/<id>    [UNTESTED]

Stage 2: Field Mapping Suggestion
  FieldMappingUI -> POST /api/csv/field-mapping (no confirmedMapping)
  ├── UPDATE csv_uploads status -> "mapping"      [UNTESTED]
  ├── Read temp file                              [UNTESTED]
  ├── suggestMappings() via LLM or fallback       [Unit tested]
  │   ├── Anthropic (Claude 3.5 Haiku)            [Mocked in test]
  │   ├── OpenAI (GPT-4o-mini)                    [Mocked in test]
  │   ├── Google (Gemini 2.0 Flash Lite)          [Mocked in test]
  │   └── Pattern matching fallback               [Unit tested]
  └── Return suggestedMapping                     [E2E only]

Stage 3: Import Execution
  FieldMappingUI -> POST /api/csv/field-mapping (with confirmedMapping)
  ├── validateMapping() (requires 'item')         [Unit tested]
  ├── UPDATE csv_uploads status -> "importing"    [UNTESTED]
  ├── Read temp file                              [UNTESTED]
  ├── parseCSV(buffer, { fullParse: true })        [Unit tested]
  ├── For each row:                               [UNTESTED]
  │   ├── applyMapping()                          [Unit tested]
  │   ├── normalizeValue() per field              [Unit tested]
  │   ├── Validate required: item, date, qty      [UNTESTED]
  │   ├── INSERT transactions                     [UNTESTED]
  │   └── Collect errors per row                  [UNTESTED]
  ├── UPDATE csv_uploads status -> "complete"     [UNTESTED]
  ├── Delete temp file                            [UNTESTED]
  └── Return { rowsImported, errors }             [E2E only]

Stage 4: Query & Display
  Dashboard -> GET /api/dashboard
  ├── Query csv_uploads by location               [UNTESTED]
  ├── Query transactions for analytics            [UNTESTED]
  └── Display in ImportStatusCard                 [E2E only]

Stage 5: Deletion
  Location delete -> CASCADE to transactions      [UNTESTED]
  CSV upload delete -> orphan cleanup?            [UNTESTED]
```

### Schema Mapping Reference

The import pipeline maps CSV columns to the `transactions` table:

| CSV Standard Field | Transaction Column | Type | Required | Notes |
|---|---|---|---|---|
| `item` | `item` | text | **YES** | Not null in schema |
| `date` | `date` | text | **YES** | Stored as text (ISO format expected) |
| `qty` | `qty` | numeric | **YES** | Stored as numeric (passed as `String()`) |
| `revenue` | `revenue` | numeric | NO | Nullable |
| `cost` | `cost` | numeric | NO | Nullable |
| `location` | *(ignored)* | -- | -- | Location determined by `locationId` FK |
| `source` | `source` | text | YES | Hardcoded to `'csv'` during import |
| -- | `sourceId` | text | NO | Set to `uploadId` |
| -- | `locationId` | uuid | YES | From upload record |
| -- | `createdAt` | timestamp | YES | Auto `defaultNow()` |

### Real-World Customer CSV Formats to Test

Based on the target market (restaurants, food service, small retail), customers will upload:

1. **Square POS exports** -- Date, Time, Item, Category, Qty, Gross Sales, Discounts, Net Sales, Tax
2. **Toast POS exports** -- Order Date, Item, Qty, Price, Modifier, Tax, Tip, Total
3. **Clover POS exports** -- Date, Time, Order ID, Item, Qty, Amount, Tax, Payment Type
4. **QuickBooks exports** -- Date, Type, Name, Memo, Account, Amount
5. **Excel/Google Sheets manual** -- any column order, mixed date formats, currency symbols
6. **Sysco/US Foods invoices** -- Invoice #, Date, Item Code, Description, Qty, Price, Extended
7. **Handwritten ledger digitized** -- messy data, inconsistent formatting, missing values

---

## Risk Assessment

| Risk | Impact | Likelihood | Current Mitigation |
|---|---|---|---|
| Customer CSV has unmappable columns | Refund | High | LLM + fallback patterns |
| Date format not recognized | Data loss (null dates, skipped rows) | High | Only ISO and MM/DD/YYYY tested |
| Numeric fields contain currency symbols ($, EUR) | Import errors | High | **NONE** -- `parseFloat("$99.99")` returns NaN |
| Duplicate column headers in CSV | Silent data loss | Medium | **NONE** -- `csv-parse` uses last value |
| File encoding not detected | Garbled item names | Medium | UTF-8/16 BOM detection exists |
| Import partially fails mid-way | Inconsistent state | Medium | Errors collected but all inserts are individual |
| Temp file not cleaned up on error | Disk space leak | Low | `deleteCSVFile` in finally block |
| 50MB file with 500K+ rows | Timeout / OOM | Medium | **NONE** -- no streaming, full parse to memory |

---

## Recommended Test Plan

### Priority 1: CSV Import Unit Tests (NEW)

These tests should be added in `tests/unit/csv-import-pipeline.test.ts`:

1. **File validation tests** -- extension, size limit, missing file, missing location_id
2. **Encoding tests** -- UTF-8, UTF-8 BOM, UTF-16 LE, UTF-16 BE, ISO-8859-1 (Latin-1)
3. **Delimiter edge cases** -- mixed delimiters in quoted fields, trailing delimiters
4. **Mapping suggestion with real-world headers** -- Square, Toast, Clover, QuickBooks formats
5. **normalizeValue edge cases** -- currency symbols (`$99.99`), thousands separators (`1,000`), European decimals (`1.000,00`), negative numbers, whitespace-only
6. **applyMapping -> transaction schema compatibility** -- verify output matches `INSERT` requirements
7. **Row validation logic** -- missing item, missing date, missing qty, null qty vs "0", invalid date string
8. **Import state machine** -- pending -> mapping -> importing -> complete, pending -> mapping -> importing -> error
9. **Error collection** -- partial failures (some rows succeed, some fail), all rows fail, all rows succeed

### Priority 2: Faker-Based CSV Generation (NEW)

A new script `scripts/generate-test-csv-faker.ts` using `@faker-js/faker` to produce:

1. **Restaurant transaction exports** -- realistic POS data with menu items, modifiers, tips
2. **Grocery/retail inventory** -- SKUs, barcodes, shelf locations, reorder points
3. **Vendor invoices** -- purchase orders, line items, tax calculations
4. **Intentionally messy data** -- mixed date formats, currency symbols, Unicode, missing values
5. **Edge case files** -- empty file, headers only, 1 row, max columns, duplicate headers
6. **Various POS format simulations** -- Square, Toast, Clover, QuickBooks header patterns

### Priority 3: Integration Tests (NEW)

Tests that validate the full pipeline without a browser:

1. **Upload -> Parse -> Map -> Insert -> Query** with mocked database
2. **Cascade deletion** -- verify transactions deleted when location deleted
3. **Concurrent imports** -- two uploads for the same location simultaneously
4. **Idempotency** -- same file uploaded twice should not create duplicate transactions (currently it does)

### Priority 4: Cleanup Existing Tests

1. Delete `tests/unit/placeholder.test.ts` and `tests/e2e/example.spec.ts`
2. Rewrite `locations-api.test.ts` to test actual route handlers (or delete)
3. Rewrite `conversation-api.test.ts` to test actual route handlers (or delete)
4. Rewrite `auth.test.ts` to test actual auth logic (or delete)
5. Wire `tests/setup.ts` into `vitest.config.ts` `setupFiles`

### Priority 5: Missing Route/Component Tests

1. Unit tests for `GET /api/dashboard`
2. Unit tests for `GET /api/weather/[location]`
3. Unit tests for `GET /api/places/[location]`
4. Component tests for `CSVUpload` (render states, drag-drop, error display)
5. Component tests for `FieldMappingUI` (mapping selection, preview, confirm flow)

---

## Test Infrastructure Issues

### 1. Setup File Not Wired

`tests/setup.ts` exists but is not referenced in `vitest.config.ts`:

```typescript
// vitest.config.ts -- MISSING:
test: {
  setupFiles: ['./tests/setup.ts'],
}
```

### 2. No Test Database Configuration

No test database setup exists. Integration tests for CSV import will need:
- A test PostgreSQL instance (or in-memory mock)
- Schema migration for test DB
- Transaction rollback between tests
- Seed data for locations (required FK for transactions)

### 3. E2E Conditional Logic Fragility

Several E2E tests use `if (await element.isVisible())` patterns that silently pass when features are missing or selectors break. These should use explicit assertions.

### 4. No CI/CD Test Configuration

No `.github/workflows/` or CI config detected. Test commands exist in `package.json` but may not run automatically on push/PR.

### 5. No Code Coverage Reporting

No coverage configuration in `vitest.config.ts`:

```typescript
// Recommended addition:
test: {
  coverage: {
    provider: 'v8',
    reporter: ['text', 'html', 'lcov'],
    include: ['lib/**', 'app/api/**', 'components/**'],
    exclude: ['**/*.test.ts', '**/*.spec.ts', 'tests/**'],
  },
}
```

---

## Appendix: File Inventory

### All Source Files Requiring Tests

<details>
<summary>25 Library Files (`lib/`)</summary>

| # | File | Lines | Has Unit Test |
|---|---|---|---|
| 1 | `lib/csv/parser.ts` | 140 | YES |
| 2 | `lib/csv/field-mapper.ts` | 342 | YES |
| 3 | `lib/csv/storage.ts` | 65 | NO |
| 4 | `lib/csv-parser.ts` | 177 | YES |
| 5 | `lib/ai/models.ts` | 182 | YES |
| 6 | `lib/ai/prompts.ts` | 229 | YES |
| 7 | `lib/ai/providers.ts` | 90 | NO |
| 8 | `lib/ai/stream-handler.ts` | 74 | NO |
| 9 | `lib/ai/context-builder.ts` | 185 | NO |
| 10 | `lib/weather/client.ts` | 435 | YES |
| 11 | `lib/weather/types.ts` | 64 | N/A (types) |
| 12 | `lib/places/client.ts` | 156 | YES |
| 13 | `lib/square/client.ts` | 245 | YES |
| 14 | `lib/square/encryption.ts` | 70 | YES |
| 15 | `lib/square/sync.ts` | 151 | NO |
| 16 | `lib/square/types.ts` | 78 | N/A (types) |
| 17 | `lib/zero/index.ts` | 235 | NO |
| 18 | `lib/zero/permissions.ts` | 149 | YES |
| 19 | `lib/zero/schema.ts` | 211 | NO |
| 20 | `lib/api-error.ts` | 81 | NO |
| 21 | `lib/auth.ts` | 20 | NO |
| 22 | `lib/auth-client.ts` | 9 | NO |
| 23 | `lib/utils.ts` | 6 | NO |
| 24 | `lib/analytics-utils.ts` | 48 | NO |
| 25 | `lib/posthog-server.ts` | 20 | NO |

</details>

<details>
<summary>16 API Route Files (`app/api/`)</summary>

| # | File | Lines | Has Unit Test | Has E2E Test |
|---|---|---|---|---|
| 1 | `app/api/auth/[...all]/route.ts` | 4 | NO | YES |
| 2 | `app/api/subscribe/route.ts` | 66 | NO | YES |
| 3 | `app/api/dashboard/route.ts` | 195 | NO | NO |
| 4 | `app/api/locations/route.ts` | 91 | NO | YES |
| 5 | `app/api/locations/[id]/route.ts` | 182 | NO | YES |
| 6 | `app/api/conversations/route.ts` | 122 | NO | YES |
| 7 | `app/api/conversations/[id]/route.ts` | 196 | NO | YES |
| 8 | `app/api/conversations/[id]/message/route.ts` | 214 | NO | YES |
| 9 | `app/api/conversations/[id]/history/route.ts` | 72 | NO | YES |
| 10 | `app/api/csv/upload/route.ts` | 154 | NO | YES |
| 11 | `app/api/csv/field-mapping/route.ts` | 342 | NO | YES |
| 12 | `app/api/square/connect/route.ts` | 88 | NO | YES |
| 13 | `app/api/square/callback/route.ts` | 164 | NO | YES |
| 14 | `app/api/square/sync/route.ts` | 97 | NO | YES |
| 15 | `app/api/weather/[location]/route.ts` | 107 | NO | NO |
| 16 | `app/api/places/[location]/route.ts` | 52 | NO | NO |

</details>

<details>
<summary>36 React Component Files</summary>

| Group | Files | Unit Tests |
|---|---|---|
| `components/import/` | csv-upload.tsx, field-mapping-ui.tsx, location-selector.tsx, square-connect.tsx | 0 |
| `components/auth/` | signup-form.tsx, login-form.tsx, beta-notice.tsx | 0 |
| `components/dashboard/` | import-status-card.tsx, location-overview-card.tsx, quick-actions-card.tsx | 0 |
| `components/chat/` | 7 files | 0 |
| `components/settings/` | location-list.tsx, location-form.tsx | 0 |
| `components/layout/` | app-header.tsx, app-sidebar.tsx | 0 |
| `components/ui/` | 13 files (shadcn) | 0 |
| `components/` | landing-page.tsx | 0 |

</details>
