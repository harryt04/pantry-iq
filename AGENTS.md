# AGENTS.md – PantryIQ Monolith

**This is now a full-stack monolith application** combining marketing landing page, authentication, app dashboard, and backend services. Previously separated repos (`pantry-iq-landing` and `pantry-iq-app`) have been consolidated.

---

## Quick Reference

| Task                    | Command                                                |
| ----------------------- | ------------------------------------------------------ |
| **Install deps**        | `npm install`                                          |
| **Dev server**          | `npm run dev` (http://localhost:3000)                  |
| **Start docker stack**  | `docker-compose up -d` (PostgreSQL + Zero sync engine) |
| **Stop docker stack**   | `docker-compose down`                                  |
| **View postgres logs**  | `docker-compose logs postgres`                         |
| **Database migrate**    | `npm run db:migrate`                                   |
| **Database push**       | `npm run db:push`                                      |
| **Database studio**     | `npm run db:studio` (Drizzle web UI)                   |
| **Generate migrations** | `npm run db:generate`                                  |
| **Build**               | `npm run build`                                        |
| **Lint**                | `npm run lint`                                         |
| **Format**              | `npm run prettify`                                     |
| **Unit tests**          | `npm run test:unit` (Vitest)                           |
| **E2E tests**           | `npm run test:e2e` (Playwright)                        |
| **Run all tests**       | `npm run test` (unit + e2e)                            |
| **Generate test data**  | `npm run generate:test-csv`                            |
| **Docker build image**  | `npm run docker:build`                                 |

---

## Project Structure

### Root-Level Routes (via Next.js App Router groups)

- **`app/(marketing)/`** – Public landing page and pricing (`/`, `/pricing`)
- **`app/(auth)/`** – Authentication pages (`/signup`, `/login`)
- **`app/(app)/`** – Protected app routes (require auth)
  - `/dashboard` – Main dashboard
  - `/conversations` – Chat history
  - `/conversations/[id]` – Individual conversation thread
  - `/import` – CSV import page
  - `/settings` – User settings
- **`app/api/`** – Backend routes (REST API)

### API Routes

#### Authentication

- `POST /api/auth/[...all]` – Better Auth handler (all auth endpoints)

#### Core Features

- `GET|POST /api/locations` – Location CRUD
- `GET|DELETE /api/locations/[id]` – Single location
- `POST /api/conversations` – Create conversation (Zero sync)
- `GET /api/conversations/[id]` – Fetch conversation thread
- `POST /api/conversations/[id]/message` – Send message (LLM call)
- `GET /api/conversations/[id]/history` – Conversation history

#### Square POS Integration

- `POST /api/square/connect` – Start OAuth flow
- `GET /api/square/callback` – OAuth redirect handler
- `POST /api/square/sync` – Sync Square inventory

#### CSV Upload & Data Import

- `POST /api/csv/upload` – Upload and parse CSV
- `POST /api/csv/field-mapping` – Map CSV columns to schema

#### Integrations

- `GET /api/weather/[location]` – Weather API (OpenWeatherMap)
- `GET /api/places/[location]` – Places search (Google Places)

#### Legacy (Marketing)

- `POST /api/subscribe` – Waitlist signup
- `GET /api/dashboard` – Analytics dashboard

### Key Directories

- **`app/`** – Next.js App Router (SSR)
- **`components/`** – React components (landing page, UI, layout)
- **`db/schema/`** – Drizzle ORM schema definitions
- **`db/migrations/`** – SQL migration files (auto-generated)
- **`lib/`** – Shared utilities
  - `zero/` – Zero sync client & permissions
  - `auth.ts` – Better Auth configuration
  - `ai/` – LLM / AI SDK utilities
  - `square/` – Square integration helpers
  - `csv/` – CSV parsing utilities
  - `places/` – Places API helpers
  - `weather/` – Weather API helpers
- **`providers/`** – React context providers (PostHog)
- **`tests/`** – Test suites
  - `unit/` – Vitest unit tests
  - `e2e/` – Playwright E2E tests
  - `fixtures/` – Shared test data & mocks
- **`public/favicon/`** – Favicon files (multiple formats)
- **`scripts/`** – Utility scripts (CSV test data generation)

---

## Stack & Configuration

### Core

- **Next.js 16** with App Router (SSR only, no static export)
- **TypeScript 5** strict mode
- **Node.js 20+** required

### Frontend

- **React 19** + React DOM
- **Tailwind CSS v4** (PostCSS-based)
- **shadcn/ui** components (New York style)

### Backend & Database

- **PostgreSQL 18** (via Docker)
- **Drizzle ORM** (SQL-first, type-safe)
- **Zero Sync Engine** (Rocicorp) – Real-time data sync
  - Upstream: PostgreSQL
  - Port: `8001` (local dev)
  - Admin password: `admin123` (dev only)

### Authentication

- **Better Auth** – Modern auth library (session-based)
- Supports OAuth, email/password, multi-session
- Server-side session management

### LLM / AI

- **Vercel AI SDK** – LLM provider abstraction
  - Supports OpenAI, Anthropic (Claude), Google Generative AI
  - Streaming chat responses
  - Type-safe message handling

### Integrations

- **Square POS** – OAuth-based inventory sync
- **Google Places API** – Location search
- **OpenWeatherMap API** – Weather data
- **PostHog** – Analytics (reverse-proxied via `/ph`, `/ingest` rewrites)

### Testing

- **Vitest** – Fast unit test runner
- **Playwright** – Cross-browser E2E testing
- **@testing-library/react** – React testing utilities

### Code Quality

- **ESLint 9** (with Next.js config)
- **Prettier 3** (with Tailwind class sorting)
- **TypeScript** (strict mode, built into dev/build)

### Next.js Config Quirks

- **`skipTrailingSlashRedirect: true`** – **Do not remove**; required for PostHog API requests
- **Favicon rewrites** – `/favicon.ico` → `/favicon/` subdirectory
- **PostHog rewrites** – `/ph/*` and `/ingest/*` proxy to `https://us.i.posthog.com/`

---

## Development Workflow

### Initial Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy environment template
cp .env.sample .env

# 3. Generate BETTER_AUTH_SECRET (at least 32 characters)
openssl rand -base64 32

# 4. Fill .env with:
#    - DATABASE_URL (e.g., postgres://postgres:postgres@localhost:5432/pantryiq)
#    - BETTER_AUTH_SECRET, BETTER_AUTH_URL, NEXT_PUBLIC_BETTER_AUTH_URL
#    - ZERO_UPSTREAM_DB, NEXT_PUBLIC_ZERO_URL
#    - LLM API keys (OpenAI, Anthropic, Google) - can stub for now
#    - Optional: Square, Weather, Places keys

# 5. Start Docker stack
docker-compose up -d

# 6. Run database migrations
npm run db:migrate

# 7. Start dev server
npm run dev
```

### Day-to-Day Development

```bash
# Terminal 1: Start database & Zero sync
docker-compose up -d

# Terminal 2: Start Next.js dev server
npm run dev
# ↓ Open http://localhost:3000
# Marketing: http://localhost:3000/
# Sign up: http://localhost:3000/signup
# App (if logged in): http://localhost:3000/dashboard

# Database changes?
npm run db:generate  # Generate migration from schema changes
npm run db:migrate   # Apply migration
npm run db:push      # Quick push (dev only, not for prod)

# View database via UI
npm run db:studio
# ↓ Opens http://localhost:5555

# Run tests
npm run test:unit    # Unit tests with Vitest
npm run test:e2e     # E2E tests with Playwright
npm run test         # Both unit + E2E

# Format & lint
npm run lint
npm run prettify

# Stop services
docker-compose down
```

### Database Workflow

**Drizzle ORM** uses SQL-first approach:

1. **Edit schema** → `db/schema/*.ts`
2. **Generate migration** → `npm run db:generate` (creates `.sql` in `db/migrations/`)
3. **Apply migration** → `npm run db:migrate` (runs SQL against database)
4. **Push directly** → `npm run db:push` (shortcut for dev; not for production)

Example: Adding a new column

```bash
# 1. Edit db/schema/locations.ts, add column
# 2. npm run db:generate
# 3. Review SQL in db/migrations/
# 4. npm run db:migrate
```

### Docker Compose Services

```yaml
# docker-compose.yml defines:
postgres:
  Image: postgres:18-alpine
  Port: 5432
  Database: pantryiq
  User: postgres
  Password: postgres (dev only!)
  Data: postgres_data volume

zero:
  Image: rocicorp/zero:latest
  Port: 8001
  Upstream: postgres://postgres:postgres@postgres:5432/pantryiq
  Health: Depends on postgres readiness
```

**Health checks** ensure PostgreSQL is ready before Zero starts.

---

## Environment Variables

### Database

```bash
# PostgreSQL connection string
# Format: postgres://user:password@host:port/database
# Local Docker: postgres://postgres:postgres@localhost:5432/pantryiq
DATABASE_URL=

# Zero Sync Upstream DB (same as above for local dev)
ZERO_UPSTREAM_DB=postgres://postgres:postgres@postgres:5432/pantryiq

# Zero port and URL
ZERO_PORT=8001
NEXT_PUBLIC_ZERO_URL=http://localhost:8001
```

### Authentication (Better Auth)

```bash
# Generate: openssl rand -base64 32 (minimum 32 characters)
BETTER_AUTH_SECRET=

# Server URL (internal)
# Local: http://localhost:3000
# Staging: https://staging.pantryiq.com
# Production: https://pantryiq.com
BETTER_AUTH_URL=

# Public URL (sent to browser)
# Same as BETTER_AUTH_URL for most cases
NEXT_PUBLIC_BETTER_AUTH_URL=
```

### LLM Providers (At least one required for chatbot)

```bash
# OpenAI: https://platform.openai.com/api-keys
OPENAI_API_KEY=

# Anthropic Claude: https://console.anthropic.com/api-keys
ANTHROPIC_API_KEY=

# Google Generative AI: https://ai.google.dev
GOOGLE_GENERATIVE_AI_API_KEY=
```

### Square POS Integration (Optional)

```bash
# OAuth app credentials
# Sign up: https://developer.squareup.com
# Dashboard: https://developer.squareup.com/apps/
SQUARE_APP_ID=
SQUARE_APP_SECRET=

# Environment: sandbox or production
SQUARE_ENVIRONMENT=sandbox

# OAuth redirect URI configured in Square Dashboard:
# Local: http://localhost:3000/api/square/callback
# Prod: https://pantryiq.com/api/square/callback
```

### API Keys (Optional - can stub for initial dev)

```bash
# Weather: https://openweathermap.org/api
OPENWEATHERMAP_API_KEY=

# Places search: https://console.cloud.google.com (enable Places API)
GOOGLE_PLACES_API_KEY=

# Token encryption (optional; falls back to BETTER_AUTH_SECRET)
# Generate: openssl rand -base64 32
ENCRYPTION_KEY=
```

### PostHog Analytics (Existing - do not change pattern)

```bash
# Public API key (sent to browser)
NEXT_PUBLIC_POSTHOG_KEY=

# PostHog host URL (reverse-proxied via next.config.ts rewrites)
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

---

## Architecture Decisions

### Authentication (Better Auth)

- **Library:** Better Auth (session-based auth, modern alternative to NextAuth)
- **Sessions:** Server-side via HTTP-only cookies
- **File:** `lib/auth.ts` (server config), `lib/auth-client.ts` (browser client)
- **API:** `app/api/auth/[...all]/route.ts` (handles all auth endpoints)
- **Provider:** Auth context available via `useSession()` hook (client-side)

### Database (Drizzle ORM + PostgreSQL)

- **ORM:** Drizzle ORM (SQL-first, type-safe, minimal abstraction)
- **Database:** PostgreSQL 18 (via Docker)
- **Schema:** Defined in TypeScript (`db/schema/`) then migrated to SQL
- **Migrations:** Auto-generated from schema changes
- **Type Safety:** Full TypeScript inference from database schema

### Real-Time Sync (Zero by Rocicorp)

- **Purpose:** Real-time data synchronization between server and client
- **Server:** Rocicorp Zero sync engine (Docker container, port 8001)
- **Upstream:** Connected to PostgreSQL
- **Client:** Zero client library (React hooks)
- **Permissions:** Row-level access control defined in `lib/zero/permissions.ts`
- **Transactions:** Optimistic updates on client, server validation
- **Files:** `lib/zero/index.ts` (client setup), `lib/zero/permissions.ts` (server permissions)

### LLM Integration (Vercel AI SDK)

- **Library:** Vercel AI SDK (`ai` package)
- **Providers:** OpenAI, Anthropic, Google Generative AI (pluggable)
- **Features:** Streaming responses, message history, tool calls
- **Endpoint:** `POST /api/conversations/[id]/message` (sends user message, streams LLM response)
- **Files:** `lib/ai/` (prompt templates, AI utilities)

### State Management

- **Server State:** React Server Components + Zero sync (for reactive data)
- **Client State:** React hooks + Zero client (for optimistic updates)
- **Form State:** HTML forms with Server Actions (Next.js 16)
- **No Redux/Zustand:** Zero handles sync; React hooks handle UI state

---

## Testing

### Unit Tests (Vitest)

```bash
npm run test:unit
```

- **Framework:** Vitest (fast, Vite-native)
- **Utilities:** @testing-library/react
- **Location:** `tests/unit/**/*.test.ts(x)`
- **Pattern:** Test individual functions, utilities, React hooks

Example:

```typescript
// tests/unit/lib/csv-parser.test.ts
import { describe, it, expect } from 'vitest'
import { parseCSV } from '@/lib/csv-parser'

describe('parseCSV', () => {
  it('should parse valid CSV', () => {
    const result = parseCSV('name,age\nAlice,30')
    expect(result).toEqual([{ name: 'Alice', age: '30' }])
  })
})
```

### E2E Tests (Playwright)

```bash
npm run test:e2e
```

- **Framework:** Playwright
- **Location:** `tests/e2e/**/*.spec.ts`
- **Browsers:** Chromium, Firefox, WebKit (configurable)
- **Pattern:** Test full user workflows (signup → import → chat)

Example:

```typescript
// tests/e2e/auth.spec.ts
import { test, expect } from '@playwright/test'

test('user can sign up', async ({ page }) => {
  await page.goto('http://localhost:3000/signup')
  await page.fill('input[name="email"]', 'test@example.com')
  await page.fill('input[name="password"]', 'securepass123')
  await page.click('button[type="submit"]')
  await expect(page).toHaveURL('/dashboard')
})
```

### Running All Tests

```bash
npm run test
# Runs: npm run test:unit && npm run test:e2e
```

### Test Configuration

- **Vitest:** `vitest.config.ts`
- **Playwright:** `playwright.config.ts`
- **Setup:** `tests/setup.ts` (shared fixtures)
- **Fixtures:** `tests/fixtures/` (mock data, database seeds)

---

## Build & Deployment

### Build Process

```bash
npm run build
```

1. **Type check** (TypeScript strict)
2. **ESLint** (code quality)
3. **Next.js build** (optimize, bundle)
4. **Output:** `.next/` directory

### Deployment (Coolify)

- **Hosting:** Coolify (self-hosted on home infrastructure)
- **Trigger:** GitHub webhook (on push to main)
- **Steps:**
  1. Pull latest code
  2. `docker build -t pantryiq:latest .`
  3. `docker-compose restart` (or similar)
- **Dockerfile:** Two-stage build (builder + runtime)
  - Stage 1: Build Next.js app in builder image
  - Stage 2: Copy `.next/` + node_modules to minimal runtime image
  - Signal handling: `dumb-init` for graceful shutdown

### Docker Build

```bash
npm run docker:build
# Creates image: pantryiq:latest

# Run locally
docker run -e NODE_ENV=production -p 3000:3000 pantryiq:latest
```

### Environment for Production

Same as `.env` but with production values:

- Real database (AWS RDS, Railway, etc.)
- Real LLM API keys
- Real Square credentials
- Real PostHog key (if analytics enabled)
- Real Coolify secrets

---

## Important Constraints

### Do Not

- **Do not** modify `next.config.ts` rewrites for PostHog without understanding reverse proxy behavior (rewrites are critical for analytics)
- **Do not** remove `skipTrailingSlashRedirect: true` (breaks PostHog trailing slash requests)
- **Do not** change `instrumentation-client.ts` initialization without understanding Next.js 16+ instrumentation (production-only PostHog client init)
- **Do not** commit `.env` or `.env.local` (contains secrets); use `.env.sample` for documentation
- **Do not** run migrations with `db:push` in production (use proper SQL migration strategy)
- **Do not** modify `BETTER_AUTH_SECRET` after deployment (invalidates all sessions)
- **Do not** expose `BETTER_AUTH_SECRET` or database passwords in logs/error messages

### Critical Configuration

- **DATABASE_URL** must be set before `npm run db:migrate` or build
- **BETTER_AUTH_SECRET** must be at least 32 characters (generated via `openssl rand -base64 32`)
- **ZERO_UPSTREAM_DB** must point to same database as DATABASE_URL (local dev only)
- **NEXT_PUBLIC_ZERO_URL** must be accessible from browser (typically http://localhost:8001 locally)
- **LLM keys** (at least one) required for `/api/conversations/[id]/message` endpoint

### Data Flow Reference

#### Signup & Authentication

1. User visits `/signup`
2. Fills form → `POST /api/auth/signup` (Better Auth)
3. Server validates, creates user record
4. Sets HTTP-only cookie (session)
5. Redirects to `/dashboard`

#### File Upload & Data Import

1. User visits `/import`
2. Selects CSV file → `POST /api/csv/upload`
3. Server parses, returns field suggestions
4. User maps columns → `POST /api/csv/field-mapping`
5. Server inserts records into database via Zero
6. Client syncs new data

#### Conversation & LLM

1. User sends message in `/conversations`
2. Client optimistic update (Zero)
3. `POST /api/conversations/[id]/message` (with message content)
4. Server calls LLM provider (OpenAI/Anthropic/Google) with context
5. LLM response streamed back to client
6. Client displays streaming response
7. Message persisted in database (Zero)

#### Square Sync

1. User visits `/settings` → clicks "Connect to Square"
2. Redirects to `https://squareup.com/oauth2/authorize?...`
3. User authenticates in Square
4. Redirects back to `GET /api/square/callback?code=...&state=...`
5. Server exchanges code for access token
6. Stores token encrypted in database
7. Triggers `POST /api/square/sync` to pull inventory
8. Synced items appear in dashboard

### PostHog Integration

- **Client-side:** `providers/posthogProvider.tsx` (production-only wrapper)
- **Server-side:** `lib/posthog-server.ts` (singleton)
- **Initialization:** `instrumentation-client.ts` (Next.js 16 instrumentation, production-only)
- **Reverse proxy:** `/ph/*` → `https://us.i.posthog.com/` (configured in `next.config.ts`)
- **Events:** waitlist-form-focused, waitlist-form-submitted, early-access-link-clicked, feature-card-viewed, pricing-card-viewed, launch-signup

### Typography & Branding

- **Font:** Geist (Google Fonts, in `app/layout.tsx`)
- **Dark mode:** Automatic via `prefers-color-scheme` media query
- **Favicons:** Multiple formats in `public/favicon/` (dark) and `public/favicon-light/` (light)
- **Tailwind:** v4 PostCSS (not JIT); all utilities available

---

## Common Development Tasks

### Add a new API route

```typescript
// app/api/my-feature/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    // ... implement logic

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
```

### Add a new database table

```typescript
// db/schema/my-table.ts
import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core'

export const myTable = pgTable('my_table', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
})
```

Then:

```bash
npm run db:generate
npm run db:migrate
```

### Use Zero in a React component

```typescript
// app/(app)/my-page/page.tsx
'use client'

import { useQuery } from '@rocicorp/zero'
import { useAuth } from '@/lib/auth-client'

export default function MyPage() {
  const { data: session } = useAuth()
  const [items] = useQuery('select * from items where user_id = ?', [session?.user?.id])

  return (
    <ul>
      {items?.map(item => <li key={item.id}>{item.name}</li>)}
    </ul>
  )
}
```

### Call an LLM in an API route

```typescript
// app/api/chat/route.ts
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'

export async function POST(req: NextRequest) {
  const { message } = await req.json()

  const result = await generateText({
    model: openai('gpt-4'),
    messages: [{ role: 'user', content: message }],
  })

  return NextResponse.json({ response: result.text })
}
```

### Add a test

```typescript
// tests/unit/my-feature.test.ts
import { describe, it, expect } from 'vitest'
import { myFunction } from '@/lib/my-function'

describe('myFunction', () => {
  it('should work correctly', () => {
    expect(myFunction(5)).toBe(10)
  })
})
```

Run: `npm run test:unit`

---

## Spec References

For context on product scope and pricing:

- **Compaction (context summary):** `.agents/spec/compaction.md`
- **PRD (full spec):** `.agents/spec/PRD-v4.md`
- **Cost analysis:** `.agents/spec/cost-analysis.md`
- **Product outline:** `.agents/spec/PantryIQ Outline.md`

---

## PostHog Agent Skill

See `.claude/skills/posthog-integration-nextjs-app-router/` for specialized instructions on PostHog integration patterns in Next.js App Router. Useful for extending analytics or troubleshooting instrumentation issues.

---

## Summary

**This is a modern, full-stack monolith** combining:

- Marketing landing page (`/` and `/pricing`)
- User authentication (Better Auth)
- Protected app dashboard (`/app/*`)
- REST API backend
- Real-time data sync (Zero)
- LLM-powered chat
- Third-party integrations (Square, Weather, Places)
- Comprehensive testing (Vitest + Playwright)

**Key principles:**

- SQL-first database design (Drizzle ORM)
- Type-safe throughout (TypeScript strict)
- Server-side authentication (HTTP-only sessions)
- Optimistic UI updates (Zero client)
- Reversible deployment (Docker)
- Testable architecture (unit + E2E)

**Development is fast:** `npm run dev` + `docker-compose up -d` in two terminals, then edit code. Changes hot-reload.
