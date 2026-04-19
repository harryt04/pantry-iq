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
