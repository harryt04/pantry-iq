# PantryIQ -- Technical Requirements Document (MVP)

**Version:** 1.0 (Draft 1)
**Date:** 2026-04-10
**Author:** OpenCode AI + Harry (CTO)
**Status:** Draft -- Awaiting Review
**Branch:** `mvp`
**Source PRD:** `.agents/spec/PRD-FINAL.md`

---

## 0. Document Purpose

This TRD translates the PRD-FINAL into actionable, parallelizable work units for an orchestration agent dispatching sub-agents. Each work unit is self-contained with: files to create/modify, dependencies on other work units, acceptance criteria, and test requirements.

**Scope:** Code to be written in this repository (`pantry-iq-landing`) to transform it from a landing page into the full PantryIQ monolith. Infrastructure setup (Postgres, Coolify, DNS, etc.) is tracked separately in `human-todo.md`.

---

## 1. Technology Decisions

| Layer             | Choice               | Version            | Notes                                                                          |
| ----------------- | -------------------- | ------------------ | ------------------------------------------------------------------------------ |
| **Framework**     | Next.js              | 16.x               | Already in repo. App Router, SSR.                                              |
| **Language**      | TypeScript           | 5.x                | Strict mode. Already configured.                                               |
| **Styling**       | Tailwind CSS         | v4                 | PostCSS-based. Already configured.                                             |
| **UI Components** | shadcn/ui            | Latest             | New York style. Already configured.                                            |
| **Auth**          | Better Auth          | Latest             | Email/password, Drizzle adapter, Next.js App Router handler.                   |
| **ORM**           | Drizzle ORM          | Latest             | Type-safe, SQL-like. `drizzle-kit` for migrations. Postgres dialect.           |
| **Database**      | PostgreSQL           | 18                 | Dockerized. Drizzle manages schema.                                            |
| **Sync Layer**    | Zero (Rocicorp)      | Latest             | Self-hosted cache server. Client-side ZQL queries.                             |
| **LLM SDK**       | Vercel AI SDK (`ai`) | Latest             | Provider-agnostic. `useChat` hook. Streaming. No Vercel deployment dependency. |
| **Analytics**     | PostHog              | Already configured | Client + server. Reverse-proxied via `/ph`.                                    |
| **Testing**       | Playwright + Vitest  | Latest             | E2E (Playwright) + Unit/Integration (Vitest).                                  |
| **Node.js**       | 20+                  | Already configured | Per `engines` in package.json.                                                 |

### Key Library Additions (to install)

```
# Production dependencies
npm install better-auth drizzle-orm postgres @zero-sync/client ai @ai-sdk/openai @ai-sdk/anthropic @ai-sdk/google

# Dev dependencies
npm install -D drizzle-kit @playwright/test vitest @testing-library/react @vitejs/plugin-react jsdom
```

> **Note:** Exact Zero client package name may vary -- verify against https://zero.rocicorp.dev/docs before installing.

---

## 2. Project Structure (Target)

```
pantry-iq-landing/
├── .agents/spec/           # PRD, TRD, cost analysis (existing)
├── app/
│   ├── (marketing)/        # Route group: landing, pricing (unauthenticated)
│   │   ├── layout.tsx
│   │   ├── page.tsx        # Landing page (move existing)
│   │   └── pricing/
│   │       └── page.tsx
│   ├── (auth)/             # Route group: login, signup (unauthenticated)
│   │   ├── layout.tsx
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── signup/
│   │       └── page.tsx
│   ├── (app)/              # Route group: authenticated app
│   │   ├── layout.tsx      # Auth-guarded layout, sidebar/nav
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── import/
│   │   │   └── page.tsx
│   │   ├── conversations/
│   │   │   ├── page.tsx    # List
│   │   │   └── [id]/
│   │   │       └── page.tsx # Chat UI
│   │   └── settings/
│   │       └── page.tsx
│   ├── api/
│   │   ├── auth/
│   │   │   └── [...all]/
│   │   │       └── route.ts  # Better Auth catch-all handler
│   │   ├── subscribe/
│   │   │   └── route.ts      # Existing waitlist endpoint
│   │   ├── square/
│   │   │   ├── connect/
│   │   │   │   └── route.ts
│   │   │   └── callback/
│   │   │       └── route.ts
│   │   ├── csv/
│   │   │   ├── upload/
│   │   │   │   └── route.ts
│   │   │   └── field-mapping/
│   │   │       └── route.ts
│   │   ├── conversations/
│   │   │   ├── route.ts            # POST: create conversation
│   │   │   └── [id]/
│   │   │       ├── message/
│   │   │       │   └── route.ts    # POST: send message (LLM call)
│   │   │       └── history/
│   │   │           └── route.ts    # GET: load history
│   │   ├── locations/
│   │   │   └── [id]/
│   │   │       └── model/
│   │   │           └── route.ts
│   │   ├── weather/
│   │   │   └── [location]/
│   │   │       └── route.ts
│   │   └── places/
│   │       └── [location]/
│   │           └── route.ts
│   ├── globals.css          # Existing
│   ├── layout.tsx           # Root layout (existing, extend)
│   ├── page.tsx             # Will redirect or be replaced by (marketing) group
│   └── sitemap.ts           # Existing
├── components/
│   ├── landing-page.tsx     # Existing
│   ├── ui/                  # Existing shadcn components
│   ├── auth/                # Login/signup forms
│   ├── chat/                # Chat UI components
│   ├── import/              # CSV upload, field mapping, Square connect
│   ├── dashboard/           # Dashboard widgets
│   └── layout/              # App shell: sidebar, nav, header
├── db/
│   ├── index.ts             # Drizzle client instance
│   ├── schema/
│   │   ├── users.ts         # Better Auth managed + extensions
│   │   ├── locations.ts
│   │   ├── pos-connections.ts
│   │   ├── csv-uploads.ts
│   │   ├── transactions.ts
│   │   ├── weather.ts
│   │   ├── places-cache.ts
│   │   ├── conversations.ts
│   │   ├── messages.ts
│   │   └── index.ts         # Re-export all schemas
│   └── migrations/          # Drizzle-kit generated migrations
├── lib/
│   ├── auth.ts              # Better Auth server instance
│   ├── auth-client.ts       # Better Auth client instance
│   ├── ai/
│   │   ├── providers.ts     # LLM provider configs (OpenAI, Anthropic, Google)
│   │   ├── models.ts        # Model registry: tiers, cost metadata
│   │   └── prompts.ts       # System prompts, context builders
│   ├── csv/
│   │   ├── parser.ts        # CSV parsing + validation
│   │   └── field-mapper.ts  # AI-assisted field mapping
│   ├── weather/
│   │   └── client.ts        # OpenWeatherMap API client + caching logic
│   ├── places/
│   │   └── client.ts        # Google Places API client + caching logic
│   ├── square/
│   │   └── client.ts        # Square OAuth + transaction sync
│   ├── posthog-server.ts    # Existing
│   └── utils.ts             # Existing
├── middleware.ts             # Route protection, auth redirects
├── providers/
│   ├── posthogProvider.tsx   # Existing
│   └── zero-provider.tsx    # Zero sync provider (wraps app)
├── scripts/
│   └── generate-test-csv.ts # CSV test data generator utility
├── tests/
│   ├── e2e/                 # Playwright tests
│   │   ├── auth.spec.ts
│   │   ├── csv-import.spec.ts
│   │   ├── chat.spec.ts
│   │   └── landing.spec.ts
│   ├── unit/                # Vitest unit tests
│   │   ├── csv-parser.test.ts
│   │   ├── field-mapper.test.ts
│   │   ├── models.test.ts
│   │   └── weather-client.test.ts
│   └── fixtures/            # Test data (sample CSVs, mock responses)
├── docker-compose.yml        # Local dev: Next.js + Postgres + Zero cache
├── Dockerfile                # Production build
├── drizzle.config.ts         # Drizzle-kit configuration
├── playwright.config.ts      # Playwright configuration
├── vitest.config.ts          # Vitest configuration
└── human-todo.md             # Manual tasks for Harry
```

---

## 3. Database Schema (Drizzle)

All tables defined in `db/schema/`. Better Auth manages its own tables (user, session, account, verification) via its Drizzle adapter. Application tables extend from there.

### 3.1 Better Auth Tables (auto-managed)

Better Auth creates and manages: `user`, `session`, `account`, `verification`. We do NOT manually define these -- Better Auth's CLI generates them. We reference `user.id` as a foreign key in our application tables.

### 3.2 Application Tables

```sql
-- db/schema/locations.ts
locations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       text NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  name          text NOT NULL,
  timezone      text NOT NULL DEFAULT 'America/New_York',
  address       text,
  zip_code      text NOT NULL,
  type          text NOT NULL DEFAULT 'restaurant',  -- 'restaurant' | 'food_truck'
  created_at    timestamp NOT NULL DEFAULT now()
)

-- db/schema/pos-connections.ts
pos_connections (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id   uuid NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  provider      text NOT NULL DEFAULT 'square',
  oauth_token   text NOT NULL,            -- encrypted at rest
  refresh_token text,
  sync_state    text NOT NULL DEFAULT 'pending',  -- 'pending' | 'syncing' | 'synced' | 'error'
  last_sync     timestamp,
  created_at    timestamp NOT NULL DEFAULT now()
)

-- db/schema/csv-uploads.ts
csv_uploads (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id   uuid NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  filename      text NOT NULL,
  row_count     integer,
  status        text NOT NULL DEFAULT 'pending',  -- 'pending' | 'mapping' | 'importing' | 'complete' | 'error'
  error_details text,
  field_mapping jsonb,                     -- stored confirmed mapping
  uploaded_at   timestamp NOT NULL DEFAULT now()
)

-- db/schema/transactions.ts
transactions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id   uuid NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  date          date NOT NULL,
  item          text NOT NULL,
  qty           numeric NOT NULL,
  revenue       numeric,
  cost          numeric,
  source        text NOT NULL,             -- 'square' | 'csv'
  source_id     text,                      -- reference to csv_uploads.id or square txn id
  created_at    timestamp NOT NULL DEFAULT now()
)
-- INDEX: (location_id, date)

-- db/schema/weather.ts
weather_data (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id   uuid NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  date          date NOT NULL,
  temperature   numeric,
  conditions    text,
  precipitation numeric,
  cached_at     timestamp NOT NULL DEFAULT now(),
  UNIQUE(location_id, date)
)

-- db/schema/places-cache.ts
places_cache (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id   uuid NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  org_name      text NOT NULL,
  address       text,
  phone         text,
  hours         text,
  types         text[],                    -- what they accept
  cached_at     timestamp NOT NULL DEFAULT now()
)

-- db/schema/conversations.ts
conversations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id   uuid NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  default_model text NOT NULL DEFAULT 'gemini-2.0-flash-lite',
  created_at    timestamp NOT NULL DEFAULT now()
)

-- db/schema/messages.ts
messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role            text NOT NULL,           -- 'user' | 'assistant' | 'system'
  content         text NOT NULL,
  model_used      text,                    -- null for user messages
  tokens_in       integer,
  tokens_out      integer,
  created_at      timestamp NOT NULL DEFAULT now()
)

-- waitlist_signups already exists via the /api/subscribe endpoint.
-- If not yet in DB, add:
waitlist_signups (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text NOT NULL UNIQUE,
  created_at    timestamp NOT NULL DEFAULT now()
)
```

---

## 4. Work Units

Work units are organized by dependency layer. Units within the same layer can be executed in parallel. Units in later layers depend on earlier layers completing first.

### Layer 0: Foundation (No dependencies -- fully parallel)

---

#### WU-0.1: Project Scaffolding & Dev Tooling

**Priority:** P0 (Blocks everything)
**Estimated effort:** Small
**Parallel group:** Layer 0

**Description:** Install all new dependencies, configure build tooling, set up Docker Compose for local dev, configure Vitest and Playwright.

**Files to create:**

- `docker-compose.yml` -- Postgres 18 + Zero cache server containers
- `Dockerfile` -- Production multi-stage build (Node 20 + Next.js standalone output)
- `.dockerignore`
- `vitest.config.ts` -- Vitest config with React testing lib, jsdom env
- `playwright.config.ts` -- Playwright config targeting localhost:3000
- `drizzle.config.ts` -- Drizzle-kit config pointing to Postgres

**Files to modify:**

- `package.json` -- Add all new dependencies (see Section 1), add scripts: `db:generate`, `db:migrate`, `db:push`, `db:studio`, `test`, `test:e2e`, `test:unit`
- `tsconfig.json` -- Add path alias `@/db/*` if not already covered by `@/*`
- `.env.sample` -- Add all new env vars (see human-todo.md for list)
- `.gitignore` -- Add `test-results/`, `playwright-report/`, drizzle artifacts

**Acceptance criteria:**

- [ ] `docker compose up` starts Postgres 18 + Zero cache server
- [ ] `npm run db:generate` generates migration files from schema
- [ ] `npm run db:push` applies schema to local Postgres
- [ ] `npx vitest --run` exits cleanly (no tests yet, but config loads)
- [ ] `npx playwright test` exits cleanly (no tests yet, but config loads)
- [ ] `npm run build` still succeeds (no regressions to existing landing page)

**Tests:** None specific -- this is infrastructure. Validated by acceptance criteria.

---

#### WU-0.2: Database Schema (Drizzle)

**Priority:** P0 (Blocks auth, import, chatbot)
**Estimated effort:** Medium
**Parallel group:** Layer 0

**Description:** Define all Drizzle schema files and create the database client instance. Run Better Auth CLI to generate auth tables.

**Files to create:**

- `db/index.ts` -- Drizzle client instance (`drizzle(postgres(...))`)
- `db/schema/index.ts` -- Re-export all schema modules
- `db/schema/locations.ts`
- `db/schema/pos-connections.ts`
- `db/schema/csv-uploads.ts`
- `db/schema/transactions.ts`
- `db/schema/weather.ts`
- `db/schema/places-cache.ts`
- `db/schema/conversations.ts`
- `db/schema/messages.ts`
- `db/schema/waitlist-signups.ts`

**Acceptance criteria:**

- [ ] `npm run db:generate` produces a clean migration
- [ ] `npm run db:push` applies to local Postgres without errors
- [ ] All tables visible in `drizzle-kit studio`
- [ ] Foreign key relationships enforced (cascade deletes work)
- [ ] All column types match PRD data model

**Tests:**

- `tests/unit/schema.test.ts` -- Validate schema exports, ensure all tables are defined, check FK relationships exist in the schema object

---

#### WU-0.3: App Route Groups & Layout Restructure

**Priority:** P0 (Blocks all page work)
**Estimated effort:** Medium
**Parallel group:** Layer 0

**Description:** Restructure `app/` directory into route groups: `(marketing)`, `(auth)`, `(app)`. Move existing landing page into `(marketing)`. Create placeholder pages for all authenticated routes. Create app shell layout (sidebar, nav).

**Files to create:**

- `app/(marketing)/layout.tsx` -- Marketing layout (minimal, maybe different nav)
- `app/(marketing)/page.tsx` -- Move/import from existing `app/page.tsx`
- `app/(marketing)/pricing/page.tsx` -- Pricing page (can extract from landing-page.tsx or link)
- `app/(auth)/layout.tsx` -- Centered auth layout
- `app/(auth)/login/page.tsx` -- Placeholder login form
- `app/(auth)/signup/page.tsx` -- Placeholder signup form
- `app/(app)/layout.tsx` -- Authenticated app layout with sidebar
- `app/(app)/dashboard/page.tsx` -- Placeholder
- `app/(app)/import/page.tsx` -- Placeholder
- `app/(app)/conversations/page.tsx` -- Placeholder
- `app/(app)/conversations/[id]/page.tsx` -- Placeholder
- `app/(app)/settings/page.tsx` -- Placeholder
- `components/layout/app-sidebar.tsx` -- App sidebar navigation
- `components/layout/app-header.tsx` -- App header with user menu

**Files to modify:**

- `app/layout.tsx` -- Keep as root layout, ensure providers wrap all groups
- `app/page.tsx` -- Redirect to `(marketing)` or remove if route group handles it

**Acceptance criteria:**

- [ ] `/` renders the existing landing page (no visual regressions)
- [ ] `/pricing` renders a pricing page
- [ ] `/login` and `/signup` render placeholder auth forms
- [ ] `/dashboard`, `/import`, `/conversations`, `/settings` render placeholder pages
- [ ] App shell (sidebar + header) visible on all `(app)` routes
- [ ] `npm run build` succeeds

**Tests:**

- `tests/e2e/landing.spec.ts` -- Landing page loads, has expected heading text, CTA button visible
- `tests/e2e/navigation.spec.ts` -- All routes return 200 (or redirect appropriately)

---

### Layer 1: Auth (Depends on WU-0.1, WU-0.2)

---

#### WU-1.1: Better Auth Setup

**Priority:** P0 (Blocks all authenticated features)
**Estimated effort:** Medium
**Parallel group:** Layer 1

**Description:** Configure Better Auth with Drizzle adapter for Postgres. Set up server instance, client instance, API route handler, and middleware for route protection.

**Files to create:**

- `lib/auth.ts` -- Better Auth server instance with Drizzle adapter, email/password enabled
- `lib/auth-client.ts` -- Better Auth React client (`createAuthClient` from `better-auth/react`)
- `app/api/auth/[...all]/route.ts` -- Catch-all route handler (`toNextJsHandler(auth)`)
- `middleware.ts` -- Next.js middleware: redirect unauthenticated users from `(app)` routes to `/login`, redirect authenticated users from `(auth)` routes to `/dashboard`

**Files to modify:**

- `app/(app)/layout.tsx` -- Wrap with auth session check, redirect if not authenticated
- `.env.sample` -- Add `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `DATABASE_URL`

**Acceptance criteria:**

- [ ] `POST /api/auth/sign-up/email` creates a user in Postgres
- [ ] `POST /api/auth/sign-in/email` returns a session cookie
- [ ] `GET /api/auth/get-session` returns the current user when authenticated
- [ ] Visiting `/dashboard` while logged out redirects to `/login`
- [ ] Visiting `/login` while logged in redirects to `/dashboard`
- [ ] Password hashing uses bcrypt/argon2 (Better Auth default)
- [ ] Session cookies are HttpOnly, Secure, SameSite=Lax

**Tests:**

- `tests/e2e/auth.spec.ts`:
  - Sign up with email/password, verify redirect to dashboard
  - Sign in with existing credentials
  - Sign out, verify redirect to login
  - Access protected route while logged out, verify redirect
  - Sign up with invalid email, verify error
  - Sign up with weak password, verify error (if Better Auth enforces)
- `tests/unit/auth.test.ts`:
  - Middleware redirect logic (unit test the matcher/redirect rules)

---

#### WU-1.2: Auth UI (Login/Signup Forms)

**Priority:** P0
**Estimated effort:** Medium
**Parallel group:** Layer 1 (can parallel with WU-1.1 if interfaces agreed)

**Description:** Build login and signup form components using shadcn/ui. Wire to Better Auth client.

**Files to create:**

- `components/auth/login-form.tsx` -- Email + password fields, submit, error display, link to signup
- `components/auth/signup-form.tsx` -- Email + password + confirm password, submit, error display, link to login

**Files to modify:**

- `app/(auth)/login/page.tsx` -- Render LoginForm
- `app/(auth)/signup/page.tsx` -- Render SignupForm
- `app/(auth)/layout.tsx` -- Centered card layout for auth pages

**Acceptance criteria:**

- [ ] Login form submits to Better Auth, shows loading state, handles errors
- [ ] Signup form validates password match, submits, shows loading state
- [ ] Error messages displayed for: invalid credentials, email already taken, server errors
- [ ] Forms use shadcn/ui Input, Button, Label, Card components
- [ ] Responsive on mobile and desktop

**Tests:** Covered by WU-1.1 e2e tests.

---

### Layer 2: Core Data Features (Depends on Layer 1)

---

#### WU-2.1: Location Management

**Priority:** P0 (Blocks import, chatbot, weather, places)
**Estimated effort:** Small
**Parallel group:** Layer 2

**Description:** CRUD for restaurant locations. Users must create at least one location before importing data or chatting.

**Files to create:**

- `app/(app)/settings/page.tsx` -- Settings page with location management
- `components/settings/location-form.tsx` -- Create/edit location form (name, timezone, address, zip, type)
- `components/settings/location-list.tsx` -- List locations with edit/delete
- `app/api/locations/route.ts` -- GET (list), POST (create) for current user
- `app/api/locations/[id]/route.ts` -- GET, PUT, DELETE for specific location

**Acceptance criteria:**

- [ ] User can create a location (name, zip code required)
- [ ] User can list their locations
- [ ] User can edit a location
- [ ] User can delete a location (cascades to all related data)
- [ ] Location type (restaurant/food_truck) selectable
- [ ] User cannot access other users' locations

**Tests:**

- `tests/unit/locations-api.test.ts` -- CRUD operations, auth checks, validation
- `tests/e2e/locations.spec.ts` -- Create location flow, verify it appears in list

---

#### WU-2.2: CSV Import -- Parsing & Upload

**Priority:** P0
**Estimated effort:** Large
**Parallel group:** Layer 2

**Description:** CSV file upload endpoint, parsing logic, and upload UI. Files are parsed and stored; field mapping is a separate step (WU-2.3).

**Files to create:**

- `lib/csv/parser.ts` -- Parse CSV buffer to rows, detect delimiters, handle encoding, validate structure
- `app/api/csv/upload/route.ts` -- Accept multipart file upload, parse, store in `csv_uploads`, return row preview
- `components/import/csv-upload.tsx` -- File drop zone, upload progress, error display

**Files to modify:**

- `app/(app)/import/page.tsx` -- Render CSV upload component

**Acceptance criteria:**

- [ ] Accepts .csv and .tsv files up to 50MB
- [ ] Parses CSV correctly (handles quoted fields, commas in values, different encodings)
- [ ] Returns first 10 rows as preview after upload
- [ ] Creates `csv_uploads` record with status='pending'
- [ ] Rejects files > 50MB with clear error message
- [ ] Rejects non-CSV files with clear error message
- [ ] Associates upload with correct location

**Tests:**

- `tests/unit/csv-parser.test.ts`:
  - Parse standard CSV
  - Parse CSV with quoted fields containing commas
  - Parse TSV (tab-delimited)
  - Handle empty rows
  - Handle malformed CSV (return error, not crash)
  - Enforce file size limit
- `tests/fixtures/` -- Sample CSV files for tests

---

#### WU-2.3: CSV Import -- AI Field Mapping

**Priority:** P0
**Estimated effort:** Large
**Parallel group:** Layer 2 (depends on WU-2.2 parser)

**Description:** AI-assisted field mapping. Uses LLM to analyze column headers and sample data, recommends mappings to standard fields. User confirms or corrects before import proceeds.

**Files to create:**

- `lib/csv/field-mapper.ts` -- Send headers + sample rows to LLM, parse structured response into mapping suggestions
- `app/api/csv/field-mapping/route.ts` -- POST: accept confirmed mappings, normalize data, insert into `transactions` table
- `components/import/field-mapping-ui.tsx` -- Display AI-suggested mappings, allow user to change via dropdowns, confirm button

**Files to modify:**

- `app/(app)/import/page.tsx` -- Show field mapping UI after upload

**Acceptance criteria:**

- [ ] AI correctly maps common column names (Date, Item, Quantity, Price, Cost) in >80% of cases
- [ ] User can override any mapping via dropdown
- [ ] Standard target fields: date, item, qty, revenue, cost, location
- [ ] After confirmation, data is normalized and inserted into `transactions`
- [ ] `csv_uploads` status updated through lifecycle: pending -> mapping -> importing -> complete/error
- [ ] Import errors surface clearly (which rows failed, why)

**Tests:**

- `tests/unit/field-mapper.test.ts`:
  - Mock LLM responses, verify mapping extraction
  - Handle ambiguous columns (graceful fallback)
  - Handle missing required columns (date, item)
- `tests/e2e/csv-import.spec.ts`:
  - Upload CSV, see preview
  - See AI-suggested mappings
  - Confirm mappings, see import complete
  - Verify transactions appear in database

---

#### WU-2.4: Square OAuth Integration

**Priority:** P0
**Estimated effort:** Large
**Parallel group:** Layer 2

**Description:** Square POS OAuth flow: initiate, callback, token storage, initial transaction sync.

**Files to create:**

- `lib/square/client.ts` -- Square API client: OAuth URL builder, token exchange, transaction list API
- `app/api/square/connect/route.ts` -- POST: generate OAuth URL, redirect user to Square
- `app/api/square/callback/route.ts` -- GET: handle OAuth callback, exchange code for tokens, store in `pos_connections`
- `components/import/square-connect.tsx` -- "Connect Square" button, connection status display

**Files to modify:**

- `app/(app)/import/page.tsx` -- Render Square connect component alongside CSV upload

**Acceptance criteria:**

- [ ] User can initiate Square OAuth flow
- [ ] OAuth callback exchanges code for access token + refresh token
- [ ] Tokens stored encrypted in `pos_connections`
- [ ] After connection, initial transaction sync begins (items, quantities, timestamps, revenue)
- [ ] Transactions normalized and inserted into `transactions` table with source='square'
- [ ] Connection status visible in import UI (pending/syncing/synced/error)
- [ ] Incremental sync supported (last_sync timestamp tracks progress)

**Tests:**

- `tests/unit/square-client.test.ts`:
  - OAuth URL generation (correct scopes, redirect URI)
  - Token exchange (mock Square API response)
  - Transaction normalization
- `tests/e2e/square-import.spec.ts` (limited -- requires Square sandbox):
  - Connect button renders
  - Verify OAuth redirect URL format

---

### Layer 3: AI & Intelligence Features (Depends on Layer 2)

---

#### WU-3.1: LLM Provider Configuration & Model Registry

**Priority:** P0
**Estimated effort:** Medium
**Parallel group:** Layer 3

**Description:** Configure Vercel AI SDK providers, build model registry with tier metadata, define system prompts.

**Files to create:**

- `lib/ai/providers.ts` -- Initialize OpenAI, Anthropic, Google providers via AI SDK
- `lib/ai/models.ts` -- Model registry: id, display name, tier (budget/mid), provider, cost metadata, context window
- `lib/ai/prompts.ts` -- System prompt templates: base restaurant analyst prompt, context injection helpers (transaction summary, weather data, places data)

**Acceptance criteria:**

- [ ] All supported models enumerated with correct provider mapping:
  - Budget: Gemini 2.0 Flash Lite, Gemini 2.0 Flash, Claude Haiku 3 (legacy), GPT-5.4 nano
  - Mid: GPT-5.4 mini, Claude Haiku 4.5, Gemini 2.5 Flash
- [ ] Each model has: id, displayName, tier, costPerInputToken, costPerOutputToken
- [ ] System prompt includes: role definition, data context injection points, hallucination guardrails, donation awareness
- [ ] Provider instances created only when API key is present (graceful degradation)

**Tests:**

- `tests/unit/models.test.ts`:
  - All models have required metadata fields
  - Model lookup by ID works
  - Tier filtering works (get budget models, get mid-tier models)
  - Cost calculation function (given tokens, return cost)
- `tests/unit/prompts.test.ts`:
  - System prompt includes expected sections
  - Context injection with mock data produces valid prompt

---

#### WU-3.2: Chatbot API & Streaming

**Priority:** P0
**Estimated effort:** Large
**Parallel group:** Layer 3

**Description:** Conversation CRUD endpoints and the core message endpoint that calls LLMs via Vercel AI SDK with streaming responses.

**Files to create:**

- `app/api/conversations/route.ts` -- POST: create conversation (requires location_id, optional model)
- `app/api/conversations/[id]/message/route.ts` -- POST: send user message, build context from transaction data + weather + places, stream LLM response, persist both messages
- `app/api/conversations/[id]/history/route.ts` -- GET: return all messages for conversation

**Acceptance criteria:**

- [ ] Creating a conversation sets default model (budget tier)
- [ ] Sending a message:
  1. Persists user message to `messages` table
  2. Builds context: recent transaction summary for location, weather data, places data
  3. Calls LLM via AI SDK with conversation history + system prompt + context
  4. Streams response tokens to client
  5. After stream completes, persists assistant message with `model_used`, `tokens_in`, `tokens_out`
- [ ] Conversation history returns messages in chronological order
- [ ] Auth check: user can only access conversations for their own locations
- [ ] Model selection: user can specify model per conversation
- [ ] If data is insufficient to answer, LLM should say so (enforced via system prompt)
- [ ] Token usage tracked per message

**Tests:**

- `tests/unit/conversation-api.test.ts`:
  - Create conversation (valid/invalid location)
  - Auth checks (can't access other user's conversations)
  - Context builder produces expected format
- `tests/e2e/chat.spec.ts`:
  - Create conversation, send message, receive streaming response
  - Conversation history persists across page reloads
  - Model selector works

---

#### WU-3.3: Chat UI

**Priority:** P0
**Estimated effort:** Large
**Parallel group:** Layer 3 (can parallel with WU-3.2 if API contract agreed)

**Description:** Conversation list page and chat interface using Vercel AI SDK's `useChat` hook for streaming.

**Files to create:**

- `components/chat/conversation-list.tsx` -- List of conversations for current location, "New conversation" button
- `components/chat/chat-interface.tsx` -- Message thread (user/assistant bubbles), input box, send button, streaming indicator
- `components/chat/model-selector.tsx` -- Dropdown showing budget/mid-tier models with cost indicators
- `components/chat/message-bubble.tsx` -- Individual message display (markdown rendering)

**Files to modify:**

- `app/(app)/conversations/page.tsx` -- Render conversation list
- `app/(app)/conversations/[id]/page.tsx` -- Render chat interface

**Acceptance criteria:**

- [ ] Conversation list shows all conversations for the selected location
- [ ] "New conversation" creates a conversation and navigates to it
- [ ] Chat input sends message, shows streaming response in real-time
- [ ] Model selector shows tier with cost/quality labels
- [ ] Mid-tier model selection shows cost warning
- [ ] Messages render markdown (bold, lists, tables)
- [ ] Scroll-to-bottom on new message
- [ ] Loading/disabled states while waiting for response
- [ ] Empty state when no conversations exist

**Tests:** Covered by WU-3.2 e2e tests.

---

#### WU-3.4: Weather Data Integration

**Priority:** P1
**Estimated effort:** Medium
**Parallel group:** Layer 3

**Description:** Weather API client with caching in Postgres. Historical + forecast data per location. Injected into AI context.

**Files to create:**

- `lib/weather/client.ts` -- OpenWeatherMap API: fetch historical by date+location, fetch forecast, cache results in `weather_data` table
- `app/api/weather/[location]/route.ts` -- GET: fetch/return weather for location (from cache or API)

**Acceptance criteria:**

- [ ] Historical weather: fetch once per (location, date) pair, store in `weather_data`, never re-fetch
- [ ] Forecast weather: fetch once per day per location, overwrite previous forecast
- [ ] Cache hit returns data from Postgres without API call
- [ ] Weather data format: temperature, conditions (rain/snow/clear/etc.), precipitation amount
- [ ] Graceful handling of API errors (don't crash, log, return partial data)
- [ ] Rate limiting respected (OpenWeatherMap free tier limits)
- [ ] Weather data available to AI context builder (WU-3.2 dependency)

**Tests:**

- `tests/unit/weather-client.test.ts`:
  - Cache hit returns stored data (mock DB)
  - Cache miss calls API and stores result (mock API)
  - API error handled gracefully
  - Forecast refresh logic (only once/day)

---

#### WU-3.5: Places (Donation Intelligence) Integration

**Priority:** P1
**Estimated effort:** Medium
**Parallel group:** Layer 3

**Description:** Google Places API client for discovering local food banks, soup kitchens, charities. Cached 30 days per location.

**Files to create:**

- `lib/places/client.ts` -- Google Places API: search for food banks/soup kitchens near ZIP code, cache results in `places_cache`
- `app/api/places/[location]/route.ts` -- GET: fetch/return places for location

**Acceptance criteria:**

- [ ] Searches for: "food bank", "soup kitchen", "food pantry" near location's ZIP code
- [ ] Returns: org name, address, phone, hours, types (what they accept)
- [ ] Cache TTL: 30 days per location (check `cached_at` before re-fetching)
- [ ] Typically 2-3 API calls per month per location
- [ ] Results stored in `places_cache` table
- [ ] Graceful handling of API errors or no results
- [ ] Places data available to AI context builder (WU-3.2 dependency)

**Tests:**

- `tests/unit/places-client.test.ts`:
  - Cache hit returns stored data (mock DB)
  - Cache miss calls API and stores results (mock API)
  - Cache expiry triggers refresh (30-day TTL)
  - API error handled gracefully

---

### Layer 4: Dashboard & Polish (Depends on Layers 2-3)

---

#### WU-4.1: Dashboard Page

**Priority:** P1
**Estimated effort:** Medium
**Parallel group:** Layer 4

**Description:** Minimal dashboard showing import status, connected accounts, location overview. Not a full analytics dashboard.

**Files to create:**

- `components/dashboard/import-status-card.tsx` -- Shows CSV uploads and their status, Square connection status
- `components/dashboard/location-overview-card.tsx` -- Location name, type, transaction count, last import date
- `components/dashboard/quick-actions-card.tsx` -- Links to: import data, start conversation, manage settings

**Files to modify:**

- `app/(app)/dashboard/page.tsx` -- Compose dashboard from cards

**Acceptance criteria:**

- [ ] Shows each location with: name, type, transaction count
- [ ] Shows import status: connected POS accounts, recent CSV uploads with status
- [ ] Quick action links navigate to correct pages
- [ ] Empty state when no locations exist (prompt to create one)
- [ ] Data loads correctly for the authenticated user only

**Tests:**

- `tests/e2e/dashboard.spec.ts`:
  - Dashboard loads for authenticated user
  - Shows location info
  - Quick action links work
  - Empty state renders correctly

---

#### WU-4.2: Zero Sync Integration

**Priority:** P1
**Estimated effort:** Large
**Parallel group:** Layer 4

**Description:** Integrate Zero (Rocicorp) for client-side sync. Conversations, messages, and dashboard data sync instantly via ZQL.

**Files to create:**

- `providers/zero-provider.tsx` -- Zero client initialization and context provider
- `lib/zero/schema.ts` -- ZQL query definitions for conversations, messages, locations, transactions
- `lib/zero/permissions.ts` -- Row-level security: users can only see data for their own locations

**Files to modify:**

- `app/(app)/layout.tsx` -- Wrap with ZeroProvider
- `components/chat/conversation-list.tsx` -- Use ZQL queries instead of fetch
- `components/chat/chat-interface.tsx` -- Use ZQL queries for message history
- `components/dashboard/*` -- Use ZQL queries for dashboard data
- `docker-compose.yml` -- Ensure Zero cache server container is included (may already be from WU-0.1)

**Acceptance criteria:**

- [ ] Zero cache server connects to Postgres and creates read-only replica
- [ ] Client-side queries resolve from local cache (< 100ms)
- [ ] New messages appear instantly in chat without polling
- [ ] Dashboard data updates reactively when imports complete
- [ ] Row-level security: users only see their own data
- [ ] Zero client initializes only for authenticated users
- [ ] Graceful fallback if Zero cache server is unavailable

**Tests:**

- `tests/unit/zero-permissions.test.ts`:
  - User A cannot query User B's locations
  - User A cannot query User B's conversations
- `tests/e2e/sync.spec.ts` (if feasible):
  - Send message, verify it appears without page reload
  - Create data via API, verify dashboard updates

---

#### WU-4.3: CSV Test Data Generator

**Priority:** P1
**Estimated effort:** Small
**Parallel group:** Layer 4 (no dependencies, can be done anytime)

**Description:** Script to generate realistic sample CSV files for testing and QA.

**Files to create:**

- `scripts/generate-test-csv.ts` -- CLI script that generates sample CSVs
- `tests/fixtures/sample-transactions.csv` -- Pre-generated fixture
- `tests/fixtures/sample-inventory.csv` -- Pre-generated fixture
- `tests/fixtures/sample-vendor-invoices.csv` -- Pre-generated fixture

**Acceptance criteria:**

- [ ] Script accepts parameters: --records (count), --start-date, --end-date, --type (transactions|inventory|invoices)
- [ ] Generates realistic restaurant data (menu items, prices, quantities)
- [ ] No PII or sensitive data
- [ ] Output CSV is valid and parseable by WU-2.2 parser
- [ ] Documented in README or script `--help`

**Tests:**

- `tests/unit/generate-test-csv.test.ts`:
  - Generated CSV is valid
  - Correct number of records
  - Date range respected
  - All required columns present

---

### Layer 5: Integration & Cross-Cutting (Depends on all above)

---

#### WU-5.1: PostHog Event Tracking Expansion

**Priority:** P2
**Estimated effort:** Small
**Parallel group:** Layer 5

**Description:** Extend PostHog tracking to cover the full user journey: signup -> first location -> first import -> first question.

**Files to modify:**

- `app/api/auth/[...all]/route.ts` or auth hooks -- Track: `user-signed-up`, `user-logged-in`
- `components/import/csv-upload.tsx` -- Track: `csv-upload-started`, `csv-upload-completed`
- `components/import/square-connect.tsx` -- Track: `square-connected`
- `components/chat/chat-interface.tsx` -- Track: `first-question-asked`, `conversation-started`
- `components/settings/location-form.tsx` -- Track: `location-created`

**Acceptance criteria:**

- [ ] Events fire only in production (NODE_ENV check)
- [ ] Events include relevant properties (location type, model selected, etc.)
- [ ] No PII in event properties (no email, no message content)

**Tests:** Manual verification in PostHog dashboard. No automated tests required.

---

#### WU-5.2: Error Handling & Loading States

**Priority:** P1
**Estimated effort:** Medium
**Parallel group:** Layer 5

**Description:** Consistent error boundaries, loading skeletons, and error states across all pages.

**Files to create:**

- `app/(app)/error.tsx` -- App-level error boundary
- `app/(app)/loading.tsx` -- App-level loading skeleton
- `components/ui/error-message.tsx` -- Reusable error display component
- `components/ui/loading-skeleton.tsx` -- Reusable skeleton component (or use shadcn Skeleton)

**Files to modify:**

- All page components -- Add loading states, error states
- All API routes -- Consistent error response format: `{ error: string, details?: string }`

**Acceptance criteria:**

- [ ] Unhandled errors caught by error boundary, show user-friendly message
- [ ] Loading states shown while data fetches
- [ ] API errors return consistent JSON format with appropriate HTTP status codes
- [ ] No raw error messages exposed to users (stack traces, SQL errors, etc.)

**Tests:**

- `tests/e2e/error-handling.spec.ts`:
  - API returns 401 for unauthenticated requests
  - API returns 404 for non-existent resources
  - Error boundary renders for broken pages

---

#### WU-5.3: Update AGENTS.md

**Priority:** P2
**Estimated effort:** Small
**Parallel group:** Layer 5

**Description:** Update AGENTS.md to reflect the new monolith structure: new routes, commands, architecture, constraints.

**Files to modify:**

- `AGENTS.md` -- Rewrite to cover full monolith (not just landing page)

**Acceptance criteria:**

- [ ] Documents all new routes (marketing, auth, app)
- [ ] Documents all new npm scripts (db:\*, test, test:e2e)
- [ ] Documents docker-compose dev workflow
- [ ] Documents env vars needed
- [ ] Documents key architectural decisions (Better Auth, Drizzle, Vercel AI SDK, Zero)
- [ ] Preserves existing PostHog and Next.js config notes

**Tests:** None -- documentation.

---

## 5. Dependency Graph

```
Layer 0 (parallel):
  WU-0.1 (Scaffolding)
  WU-0.2 (DB Schema)
  WU-0.3 (Route Groups)

Layer 1 (depends on Layer 0):
  WU-1.1 (Better Auth Setup)     → depends on WU-0.1, WU-0.2
  WU-1.2 (Auth UI)               → depends on WU-0.3, WU-1.1

Layer 2 (depends on Layer 1):
  WU-2.1 (Location Management)   → depends on WU-1.1
  WU-2.2 (CSV Parsing)           → depends on WU-0.2
  WU-2.3 (CSV Field Mapping)     → depends on WU-2.2, WU-3.1 (needs LLM)
  WU-2.4 (Square OAuth)          → depends on WU-1.1, WU-0.2

Layer 3 (depends on Layer 2):
  WU-3.1 (LLM Config)            → depends on WU-0.1 (packages installed)
  WU-3.2 (Chatbot API)           → depends on WU-3.1, WU-2.1
  WU-3.3 (Chat UI)               → depends on WU-0.3, WU-3.2
  WU-3.4 (Weather)               → depends on WU-0.2
  WU-3.5 (Places)                → depends on WU-0.2

Layer 4 (depends on Layers 2-3):
  WU-4.1 (Dashboard)             → depends on WU-2.1, WU-2.2, WU-2.4
  WU-4.2 (Zero Sync)             → depends on WU-0.1, WU-3.2
  WU-4.3 (Test Data Generator)   → no strict dependency

Layer 5 (depends on all):
  WU-5.1 (PostHog Events)        → depends on WU-1.1, WU-2.2, WU-3.3
  WU-5.2 (Error Handling)        → depends on all routes/pages existing
  WU-5.3 (Update AGENTS.md)      → depends on all features complete
```

### Maximum Parallelism Schedule

| Phase | Work Units                                             | Can Parallelize            |
| ----- | ------------------------------------------------------ | -------------------------- |
| 1     | WU-0.1, WU-0.2, WU-0.3                                 | All 3                      |
| 2     | WU-1.1, WU-1.2                                         | Both (if interface agreed) |
| 3     | WU-2.1, WU-2.2, WU-2.4, WU-3.1, WU-3.4, WU-3.5, WU-4.3 | All 7                      |
| 4     | WU-2.3, WU-3.2, WU-3.3                                 | All 3                      |
| 5     | WU-4.1, WU-4.2, WU-5.1, WU-5.2                         | All 4                      |
| 6     | WU-5.3                                                 | 1 (final)                  |

---

## 6. Environment Variables

Complete list of env vars the application requires (see `human-todo.md` for which Harry must supply):

```bash
# Existing
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com

# Database
DATABASE_URL=postgres://postgres:password@localhost:5432/pantryiq

# Better Auth
BETTER_AUTH_SECRET=                      # min 32 chars, high entropy
BETTER_AUTH_URL=http://localhost:3000     # base URL of the app

# Square OAuth
SQUARE_APP_ID=
SQUARE_APP_SECRET=
SQUARE_ENVIRONMENT=sandbox               # 'sandbox' | 'production'

# LLM Providers (at least one required)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_GENERATIVE_AI_API_KEY=

# Weather
OPENWEATHERMAP_API_KEY=

# Google Places
GOOGLE_PLACES_API_KEY=

# Zero Sync
ZERO_UPSTREAM_DB=postgres://postgres:password@localhost:5432/pantryiq
ZERO_PORT=8001
```

---

## 7. Testing Strategy

### Unit Tests (Vitest)

- Location: `tests/unit/`
- Scope: Pure functions, parsers, mappers, model registry, API route handlers (isolated)
- Mocking: External APIs (LLM, Square, Weather, Places) mocked in all unit tests
- Run: `npm run test:unit` or `npx vitest --run`

### E2E Tests (Playwright)

- Location: `tests/e2e/`
- Scope: Full user flows through the browser
- Environment: Requires running Next.js dev server + Postgres (via docker-compose)
- Seed data: Playwright fixtures or test setup scripts
- Run: `npm run test:e2e` or `npx playwright test`

### Test Coverage Priorities

| Area                                | Test Type            | Priority |
| ----------------------------------- | -------------------- | -------- |
| Auth (signup/login/logout/redirect) | E2E                  | P0       |
| CSV parsing                         | Unit                 | P0       |
| CSV field mapping                   | Unit                 | P0       |
| AI model registry                   | Unit                 | P0       |
| Chat message flow                   | E2E                  | P0       |
| Weather/Places caching              | Unit                 | P1       |
| Dashboard rendering                 | E2E                  | P1       |
| Error boundaries                    | E2E                  | P1       |
| Zero sync permissions               | Unit                 | P1       |
| Square OAuth flow                   | Unit + E2E (limited) | P2       |

---

## 8. Migration Notes

### Existing Code to Preserve

- `components/landing-page.tsx` -- Move into `(marketing)` route group, do not modify
- `app/api/subscribe/route.ts` -- Keep as-is (waitlist endpoint)
- `providers/posthogProvider.tsx` -- Keep as-is
- `lib/posthog-server.ts` -- Keep as-is
- `instrumentation-client.ts` -- Keep as-is
- All files in `public/` -- Keep as-is
- `next.config.ts` -- Only add new rewrites if needed (e.g., Zero proxy). Do NOT modify existing PostHog or favicon rewrites.

### Breaking Changes to Watch For

- Moving `app/page.tsx` to `app/(marketing)/page.tsx` -- must verify landing page still renders at `/`
- Adding `middleware.ts` -- must not interfere with PostHog rewrites (`/ph/*`, `/ingest/*`) or API routes
- `docker-compose.yml` ports -- ensure no conflicts with existing local services

---

**Document prepared:** 2026-04-10
**Prepared by:** OpenCode AI
**Status:** Draft 1 -- Review with Harry before implementation begins
