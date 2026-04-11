# Markdown Audit & Consolidation Plan

## Objective

Audit all 33 `*.md` files in the repository, delete stale completion reports and finished todo lists, consolidate useful reference content into `AGENTS.md`, and leave a clean, minimal set of markdown files that serve AI agents working in this codebase.

---

## Audit Results Summary

| Verdict       | Count | Action                                              |
| ------------- | ----- | --------------------------------------------------- |
| **DELETE**     | 16    | Remove — stale reports, completed todos, duplicates |
| **KEEP**       | 12    | Leave as-is — active reference, specs, skills       |
| **CONSOLIDATE**| 5     | Extract useful content into AGENTS.md, then delete  |

---

## Phase 1: Delete Stale Files (parallel sub-agents)

These files are completed task reports, finished orchestration plans, or duplicates with no ongoing value. Git history preserves them if ever needed.

### Sub-Agent 1A: Delete root completion reports

Delete the following files:

- `ORCHESTRATION_COMPLETION.md` — completed testing orchestration report
- `PHASE_3E_SUMMARY.md` — completed Phase 3E sub-report (redundant)
- `TASK_2C_COMPLETION.md` — completed CSV field mapping report
- `TEST_RESULTS_FIELD_MAPPING.md` — duplicate of TASK_2C_COMPLETION
- `ZERO_INTEGRATION_SUMMARY.md` — completed Zero integration report
- `IMPLEMENTATION_SUMMARY.md` — completed error handling report (content in AGENTS.md)
- `ERROR_HANDLING_TEST_VALIDATION.md` — completed test validation report (content in AGENTS.md)
- `ERROR_HANDLING_IMPLEMENTATION.md` — completed error handling guide (content in AGENTS.md)
- `testing-coverage.md` — completed testing coverage report
- `posthog-setup-report.md` — completed PostHog setup report

### Sub-Agent 1B: Delete completed orchestration/todo files

Delete the following files:

- `orchestration.md` — completed testing orchestration plan (all phases done)
- `.agents/ORCHESTRATION.md` — completed MVP orchestration plan (all WUs done)
- `.agents/SETUP-CHECKLIST.md` — completed one-time setup checklist (superseded by AGENTS.md)

**Parallel execution**: Sub-agents 1A and 1B run simultaneously.

---

## Phase 2: Consolidate Useful Content into AGENTS.md (parallel sub-agents)

Extract valuable reference material from 5 files, merge it into AGENTS.md, then delete the source files. Each sub-agent handles one consolidation to avoid conflicts.

### Sub-Agent 2A: Consolidate Zero Integration Reference

**Source**: `ZERO_INTEGRATION.md`
**Target**: `AGENTS.md` — expand the existing "Real-Time Sync (Zero by Rocicorp)" section

Content to extract and merge:
- Architecture diagram (client → Zero cache → Postgres)
- Docker Compose `wal_level=logical` requirement
- Code structure (`lib/zero/schema.ts`, `permissions.ts`, `index.ts`, `providers/zero-provider.tsx`)
- Read vs Write path explanation (reads from Zero cache, writes through REST API)
- Row-level security hierarchy (User → Locations → Conversations → Messages)
- Graceful fallback pattern (Zero unavailable → REST API)
- Troubleshooting checklist (WAL level, replication slots, permission denied)

After merging, delete `ZERO_INTEGRATION.md`.

### Sub-Agent 2B: Consolidate Database Schema Reference

**Source**: `SCHEMA_IMPLEMENTATION.md`, `DATABASE_AGENT_REFERENCE.md`
**Target**: `AGENTS.md` — add a new "Database Schema Reference" section

Content to extract and merge:
- Complete table definitions (13 tables: locations, pos_connections, csv_uploads, transactions, weather, places_cache, conversations, messages, waitlist_signups, + Better Auth tables)
- Foreign key dependency tree and cascade behavior
- Performance indexes (8 custom indexes)
- Zero sync schema definitions and timestamp conventions
- Common Drizzle ORM query patterns (select, insert, update, delete, joins)
- Better Auth note: user/session/account tables are managed by Better Auth, not in `db/schema/`
- Verification checklist for agents modifying database code

After merging, delete `SCHEMA_IMPLEMENTATION.md` and `DATABASE_AGENT_REFERENCE.md`.

### Sub-Agent 2C: Consolidate PostHog Event Catalog

**Source**: `POSTHOG_IMPLEMENTATION.md`
**Target**: `AGENTS.md` — expand the existing "PostHog Integration" section

Content to extract and merge:
- Complete event catalog with trigger file locations (user-signed-up, csv-upload-started, etc.)
- Event properties reference (what each event captures)
- PII rules (no emails, no message content, hashed location IDs)
- `captureAnalyticsEvent()` and `hashLocationId()` utility documentation

After merging, delete `POSTHOG_IMPLEMENTATION.md`.

### Sub-Agent 2D: Consolidate Testing Patterns & Test Data

**Source**: `SQUARE_ROUTES_TEST_FIX.md`, `TEST-DATA-GENERATION.md`
**Target**: `AGENTS.md` — expand the existing "Testing" section

Content to extract and merge:

From `SQUARE_ROUTES_TEST_FIX.md`:
- Drizzle query chain thenable mocking pattern (`createMockDatabaseChain()`)
- Constructor function mocking pattern for `new` operator
- Sequential database call mocking (`mockDatabaseMultipleResults()`)

From `TEST-DATA-GENERATION.md`:
- CLI usage: `npm run generate:test-csv -- --records N --type T --output FILE`
- Three data types: transactions, inventory, invoices
- Pre-generated fixture file locations: `tests/fixtures/sample-*.csv`
- Related files: `scripts/generate-test-csv.ts`, `lib/csv-parser.ts`

After merging, delete `SQUARE_ROUTES_TEST_FIX.md` and `TEST-DATA-GENERATION.md`.

### Sub-Agent 2E: Consolidate Product Vision from PantryIQ Outline

**Source**: `.agents/spec/PantryIQ Outline.md`
**Target**: `.agents/spec/PRD-FINAL.md` — prepend a "Founding Vision" section, OR create a brief `VISION.md` at `.agents/spec/VISION.md`

Content to extract and merge:
- Harry's founding vision (restaurant food waste + charitable mission)
- V2 wishlist / future roadmap items (Oracle Micros, Ziosk, MCP server, tokei.app, Dinetap)
- Example AI prompts that define product scope (staffing, inventory, menu, donations)

After merging, delete `.agents/spec/PantryIQ Outline.md`.

**Execution**: Sub-agents 2A through 2E can run in parallel since they each target different sections of AGENTS.md. However, since 2A-2D all modify AGENTS.md, they should each produce their content block as output, and a final coordinator agent should merge all blocks into AGENTS.md in one pass to avoid edit conflicts.

**Alternative (safer)**: Run 2A-2D sequentially against AGENTS.md, or have each sub-agent return its content block and run a single final merge agent.

### Recommended approach: Two-step Phase 2

1. **Step 2.1** (parallel): Sub-agents 2A, 2B, 2C, 2D, 2E each READ their source files and produce the consolidated content block as output (research only, no file writes).
2. **Step 2.2** (sequential): A single merge agent takes all 5 content blocks and inserts them into the appropriate sections of AGENTS.md in one pass. Then deletes all 7 source files.

---

## Phase 3: Consolidate TRD (sequential)

### Sub-Agent 3A: Slim down TRD

**Source**: `.agents/spec/TRD.md`
**Action**: Edit in-place to remove completed work unit breakdowns (execution artifacts), keeping only:
- Technology decisions table (Section 1)
- Database schema SQL definitions (Section 3)
- Testing strategy and coverage priorities (Section 7)
- Migration notes / breaking changes (Section 8)

This reduces the TRD from ~1200 lines to a focused technical reference.

---

## Phase 4: Update AGENTS.md Cross-References

### Sub-Agent 4A: Fix stale references in AGENTS.md

After all deletions and consolidations, update AGENTS.md:
- Remove references to deleted files (e.g., `compaction.md` if it no longer exists)
- Update the "Spec References" section to reflect surviving files
- Verify all file paths mentioned in AGENTS.md still exist

---

## Files to KEEP (no action needed)

These files remain untouched:

| File | Reason |
| ---- | ------ |
| `AGENTS.md` | Primary agent instruction file (will be updated with consolidated content) |
| `README.md` | Standard project README, well-structured and current |
| `human-todo.md` | Active personal launch checklist for CTO (all items unchecked) |
| `.agents/spec/PRD-FINAL.md` | Canonical product spec, actively referenced |
| `.agents/spec/cost-analysis.md` | LLM cost analysis, actively referenced by PRD |
| `.claude/skills/.../SKILL.md` | PostHog skill definition (part of cohesive skill unit) |
| `.claude/skills/.../references/EXAMPLE.md` | PostHog example project reference |
| `.claude/skills/.../references/next-js.md` | PostHog Next.js docs reference |
| `.claude/skills/.../references/identify-users.md` | PostHog user identification docs |
| `.claude/skills/.../references/basic-integration-1.0-begin.md` | PostHog skill phase 1 |
| `.claude/skills/.../references/basic-integration-1.1-edit.md` | PostHog skill phase 2 |
| `.claude/skills/.../references/basic-integration-1.2-revise.md` | PostHog skill phase 3 |
| `.claude/skills/.../references/basic-integration-1.3-conclude.md` | PostHog skill phase 4 |

---

## Execution Order

```
Phase 1 ─── 1A (delete 10 files) ───┐
         └── 1B (delete 3 files)  ───┤ parallel
                                     ▼
Phase 2 ─── Step 2.1 ───────────────────────────────────────────┐
         │   ├── 2A: extract Zero content (read only)           │
         │   ├── 2B: extract DB schema content (read only)      │ parallel
         │   ├── 2C: extract PostHog content (read only)        │
         │   ├── 2D: extract Testing content (read only)        │
         │   └── 2E: extract Vision content (read only)         │
         │                                                      ▼
         └── Step 2.2: merge all blocks into AGENTS.md ─── sequential
              then delete 7 source files
                                     │
                                     ▼
Phase 3 ─── 3A: slim down TRD ────── sequential
                                     │
                                     ▼
Phase 4 ─── 4A: fix AGENTS.md refs ─ sequential
```

---

## Expected Final State

After execution, the repository will contain exactly these markdown files:

```
AGENTS.md                          ← expanded with consolidated content
README.md                          ← unchanged
human-todo.md                      ← unchanged
.agents/spec/PRD-FINAL.md          ← unchanged (or with prepended vision section)
.agents/spec/TRD.md                ← slimmed down (execution artifacts removed)
.agents/spec/cost-analysis.md      ← unchanged
.claude/skills/posthog-*/SKILL.md  ← unchanged (8 skill files)
```

**16 files deleted**, **5 consolidated**, **~14 files remaining** (down from 33).

AGENTS.md gains these new/expanded sections:
- Zero Integration Reference (architecture, troubleshooting, fallback patterns)
- Database Schema Reference (13 tables, indexes, query patterns, RLS)
- PostHog Event Catalog (all events, properties, PII rules)
- Testing Patterns (Drizzle mocking, test data generation CLI)
