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

#### Architecture Diagram

Real-time data synchronization flows from browser client → Zero cache server → PostgreSQL:

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser (Client)                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  React App (Next.js)                                 │   │
│  │  ├─ ZeroProvider (Context)                           │   │
│  │  ├─ useZeroClient() hooks                            │   │
│  │  ├─ useConversations(), useMessages(), etc.          │   │
│  │  └─ REST API fallback                                │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │  Zero Client (@rocicorp/zero)                        │   │
│  │  ├─ Local SQLite Cache                               │   │
│  │  ├─ Real-time sync                                   │   │
│  │  └─ Offline support                                  │   │
│  └──────────────────────────────────────────────────────┘   │
│                        │                                      │
└────────────────────────┼──────────────────────────────────────┘
                         │
                      HTTP
                         │
         ┌───────────────┴────────────────┐
         │                                │
┌────────▼────────┐          ┌───────────▼──────────┐
│  Zero Cache     │          │  REST API Fallback   │
│  Server         │          │  (/api/*)            │
│  (port 8001)    │          │  (for compatibility) │
└────────┬────────┘          └──────────────────────┘
         │
    ┌────▼─────────────────────┐
    │   Postgres Database       │
    │  (pantryiq database)      │
    │  ├─ locations            │
    │  ├─ conversations        │
    │  ├─ messages             │
    │  ├─ transactions         │
    │  ├─ csv_uploads          │
    │  └─ pos_connections      │
    └──────────────────────────┘
```

#### Docker Compose Configuration

PostgreSQL **must** have `wal_level=logical` enabled for Zero to stream changes via logical replication:

```yaml
services:
  postgres:
    image: postgres:18-alpine
    command:
      - 'postgres'
      - '-c'
      - 'wal_level=logical' # Required for Zero streaming replication
    environment:
      POSTGRES_DB: pantryiq
      POSTGRES_PASSWORD: postgres
      POSTGRES_USER: postgres

  zero:
    image: rocicorp/zero:latest
    ports:
      - '8001:8001'
    environment:
      ZERO_UPSTREAM_DB: postgres://postgres:postgres@postgres:5432/pantryiq
      ZERO_PORT: 8001
    depends_on:
      postgres:
        condition: service_healthy
```

**Critical**: Without `wal_level=logical`, Zero cannot detect changes in Postgres and replication will fail.

#### Read vs Write Data Flow

**Read Path (Query)**:

1. Component calls `useConversations(client, locationId)`
2. Hook subscribes to Zero query: `client.conversations.watch({ locationId })`
3. Zero checks local SQLite cache
4. Returns cached data immediately (<100ms) and syncs server data in background
5. If data missing, fetches from Zero cache server, stores in cache, returns to component

**Write Path (Create/Update)**:

1. Component sends request to REST API: `POST /api/conversations`
2. Server validates and updates PostgreSQL
3. Zero cache server detects change via logical replication
4. Sends update to all connected clients
5. Clients update local cache automatically
6. Components re-render with new data

**Key**: Zero does not support direct client-side writes. All writes must go through REST API to enforce server-side authorization and business logic.

#### Row-Level Security Hierarchy

Zero enforces hierarchical row-level security with three levels:

**1. User → Locations**
- User can only access locations where `location.userId === session.user.id`
- Filter: `user.locations` returns only user's own locations

**2. Location → Conversations**
- User can only access conversations in their locations
- Filter: `location.conversations` filtered by user's location IDs
- Cross-user access impossible: User A cannot see User B's conversations

**3. Conversation → Messages**
- User can only access messages in their conversations
- Filter: `conversation.messages` filtered by user's conversation IDs
- Multi-user threads: Messages grouped by user access level

#### Graceful Fallback Pattern

If Zero cache server becomes unavailable:

1. `getZeroClient()` catches connection error and logs it
2. `ZeroProvider` continues initialization and passes `client: null` to context
3. Hooks like `useConversations()` detect null client and fall back to REST API
4. `fetch('/api/conversations?locationId=...')` provides data with higher latency (~500ms vs <100ms)
5. App continues to work without degraded user experience

#### Troubleshooting Checklist

**"Cannot connect to Zero cache server"**

- [ ] Verify Zero is running: `curl http://localhost:8001/health` (should return `{"status":"ok"}`)
- [ ] Check env var: `NEXT_PUBLIC_ZERO_URL=http://localhost:8001` is set
- [ ] Verify Docker network: `docker network ls` and `docker ps`
- [ ] Check Zero logs: `docker-compose logs zero`

**"Permission denied" errors in browser console**

- [ ] Verify user is authenticated: Check `session.user.id` is set
- [ ] Confirm user owns location: `SELECT * FROM locations WHERE id = ? AND user_id = ?`
- [ ] Review filter logic in `useConversations()` and `useMessages()` hooks
- [ ] Check row-level security rules in `lib/zero/permissions.ts`

**"Data not syncing" between Zero and Postgres**

- [ ] **Critical**: Check `wal_level=logical` is enabled: Run `SHOW wal_level;` in psql
- [ ] Verify Zero has Postgres connection: Check `docker-compose logs zero` for connection errors
- [ ] Check replication slots exist: `SELECT * FROM pg_replication_slots;` should show Zero slot
- [ ] Verify Postgres `pg_stat_replication` shows active replication: `SELECT * FROM pg_stat_replication;`

**"Zero client not initializing" (client is always null)**

- [ ] Ensure user is authenticated before ZeroProvider mounts
- [ ] Check browser console for network errors connecting to `localhost:8001`
- [ ] Enable debug logging: Set `debug: true` in `lib/zero/index.ts` Zero client init
- [ ] Verify `NEXT_PUBLIC_ZERO_URL` is accessible from browser (may fail if behind firewall/proxy)

**"Local cache empty" or queries return no results**

- [ ] Check subscription is working: In browser DevTools, filter Network for `localhost:8001` requests
- [ ] Verify user has data in Postgres: Query `SELECT * FROM conversations WHERE user_id = ?`
- [ ] Confirm permission filter is not too restrictive: Review `getConversationPermissionFilter()` logic
- [ ] Clear browser local storage and reload: Stale cache can cause issues

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

### Error Handling & Loading States

- **Error Boundary:** `app/(app)/error.tsx` catches unhandled errors in authenticated routes
- **Loading States:** `app/(app)/loading.tsx` with skeleton loaders during data fetches
- **API Errors:** Centralized `lib/api-error.ts` utility for consistent error responses
- **Error Format:** All errors return `{ error: "user-friendly message", code: "ERROR_CODE" }` with appropriate HTTP status
- **Security:** Stack traces logged server-side only; clients receive generic messages
- **Components:** `components/ui/error-message.tsx` and `components/ui/loading-skeleton.tsx` for UI display

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

### Error Handling Tests (E2E)

Comprehensive error handling validation in `tests/e2e/error-handling.spec.ts` (20+ test cases):

- **API Errors:** Authentication (401), Authorization (403), Not Found (404), Validation (400)
- **Security:** Stack traces never exposed, consistent error response structure
- **Loading States:** Skeleton loaders render with animations, match page layout
- **Error Boundary:** Global error boundary catches and displays errors safely
- **Status Codes:** Verify appropriate HTTP status codes for all error scenarios

Run specific error tests:

```bash
npm run test:e2e -- error-handling.spec.ts
PWDEBUG=1 npm run test:e2e  # Debug mode
```

### Advanced Mocking Patterns (Drizzle ORM & API Routes)

When testing complex API routes with database interactions, use these proven mocking patterns:

#### Drizzle Query Chain Mocking

The database mock must properly implement the thenable interface and all chainable methods to support async/await:

```typescript
function createMockDatabaseChain(result: any[] | null = null) {
  const resolvedResult = result || []

  const queryChain: any = {
    then: undefined,
    catch: undefined,
    finally: undefined,
  }

  // Add all chainable methods
  queryChain.from = vi.fn().mockReturnValue(queryChain)
  queryChain.where = vi.fn().mockReturnValue(queryChain)
  queryChain.limit = vi.fn().mockReturnValue(queryChain)
  queryChain.returning = vi.fn().mockReturnValue(queryChain)
  queryChain.set = vi.fn().mockReturnValue(queryChain)
  queryChain.values = vi.fn().mockReturnValue(queryChain)

  // Make it thenable
  queryChain.then = function (onFulfilled?: any, onRejected?: any) {
    return Promise.resolve(resolvedResult).then(onFulfilled, onRejected)
  }
  queryChain.catch = function (onRejected?: any) {
    return Promise.resolve(resolvedResult).catch(onRejected)
  }
  queryChain.finally = function (onFinally?: any) {
    return Promise.resolve(resolvedResult).finally(onFinally)
  }
  queryChain[Symbol.toStringTag] = 'Promise'

  return queryChain
}
```

#### Sequential Database Call Mocking

Routes often make multiple `db.select()` calls with different results. Use this pattern:

```typescript
function mockDatabaseMultipleResults(...results: (any[] | null)[]) {
  let callIndex = 0
  const chains = results.map((r) => createMockDatabaseChain(r))

  vi.mocked(db.select).mockImplementation(() => {
    const chain = chains[callIndex]
    callIndex++
    return chain as any
  })

  return chains
}

// Usage: First db.select() returns [connection], second returns [location]
mockDatabaseMultipleResults([connection], [location])
```

#### Constructor Function Mocking

When mocking classes instantiated with `new`, use function constructor syntax:

```typescript
vi.mock('@/lib/square/sync', () => ({
  SquareSyncManager: vi.fn(function (client: any, locationId: string) {
    this.syncTransactions = vi
      .fn()
      .mockResolvedValue({ synced: 5, errors: 0 })
  }),
}))
```

### Test Data Generation

Generate realistic CSV test data with the test data generation CLI:

#### Quick Start

```bash
# Generate 100 transactions to stdout
npm run generate:test-csv -- --records 100 --type transactions

# Generate 500 inventory items to file
npm run generate:test-csv -- --records 500 --type inventory --output my-inventory.csv

# Generate invoices for Q1 2024
npm run generate:test-csv -- \
  --records 200 \
  --type invoices \
  --start-date 2024-01-01 \
  --end-date 2024-03-31 \
  --output invoices.csv
```

#### CLI Reference

**Script Location:** `scripts/generate-test-csv.ts`

**Usage:**
```bash
npm run generate:test-csv -- [options]
```

**Options:**

| Option         | Format                            | Default      | Description                    |
| -------------- | --------------------------------- | ------------ | ------------------------------ |
| `--records`    | NUMBER                            | 100          | Number of records to generate  |
| `--start-date` | YYYY-MM-DD                        | 1 year ago   | Start date for data generation |
| `--end-date`   | YYYY-MM-DD                        | today        | End date for data generation   |
| `--type`       | transactions\|inventory\|invoices | transactions | Type of data to generate       |
| `--output`     | FILE_PATH                         | stdout       | Output file path               |

#### Data Types

**Transactions** - Daily sales data with columns: Date, Time, Item Name, Quantity, Unit Price, Unit Cost, Total Revenue, Total Cost, Payment Method, Location

**Inventory** - Stock levels with columns: SKU, Item Name, Category, Quantity, Unit Cost, Total Value, Reorder Point, Supplier, Last Restock

**Invoices** - Vendor invoices with columns: Invoice Number, Vendor, Invoice Date, Due Date, Subtotal, Tax, Total Amount, Amount Paid, Status

#### Pre-Generated Fixtures

Pre-generated fixture files are available:

```bash
tests/fixtures/sample-transactions.csv   # 150 transaction records
tests/fixtures/sample-inventory.csv      # 120 inventory records
tests/fixtures/sample-vendor-invoices.csv  # 100 invoice records
```

Use directly in tests without generating new data:

```typescript
import * as fs from 'fs'
import { parseCSV } from '@/lib/csv-parser'

const txnContent = fs.readFileSync(
  'tests/fixtures/sample-transactions.csv',
  'utf-8',
)
const parsed = parseCSV(txnContent)
console.log(`Testing with ${parsed.rows.length} transactions`)
```



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

PostHog analytics is integrated throughout the application user journey with production-only event tracking. All events follow strict PII protection rules.

#### Core Utilities

**File:** `lib/analytics-utils.ts`

Two core functions handle all event tracking:

1. **`captureAnalyticsEvent(eventName, properties)`**
   - Non-blocking, production-only event capture
   - Checks `NODE_ENV === 'production'` before sending
   - Dynamically imports PostHog client for optimal performance
   - Silent fail mechanism prevents analytics failures from breaking the app
   - Usage: `captureAnalyticsEvent('event-name', { prop: value })`

2. **`hashLocationId(locationId)`**
   - Converts location IDs to pseudonymous 16-character SHA-256 hex identifiers
   - Enables location analytics without storing location addresses
   - Consistent hashing for user journey correlation
   - Usage: `const hashed = hashLocationId(locationId)`

#### Event Catalog

##### Authentication Events

| Event | File | Trigger | Properties | Notes |
|-------|------|---------|------------|-------|
| `user-signed-up` | `components/auth/signup-form.tsx:104` | After successful account creation | `{}` | Contextual event; no PII |
| `user-logged-in` | `components/auth/login-form.tsx:40` | After successful login | `{}` | Contextual event; no credentials |

##### CSV Import Events

| Event | File | Trigger | Properties | Notes |
|-------|------|---------|------------|-------|
| `csv-upload-started` | `components/import/csv-upload.tsx:45` | When CSV file selected (drag or click) | `fileSize` (bytes), `fileName` (original name) | No file contents sent |
| `csv-upload-completed` | `components/import/csv-upload.tsx:68` | After successful upload and parsing | `rowCount` (number of data rows) | No raw data included |

##### Integration Events

| Event | File | Trigger | Properties | Notes |
|-------|------|---------|------------|-------|
| `square-connected` | `components/import/square-connect.tsx:36` | After Square OAuth callback success | `{}` | No credentials/tokens stored |

##### Chat & Conversation Events

| Event | File | Trigger | Properties | Notes |
|-------|------|---------|------------|-------|
| `conversation-started` | `components/chat/conversation-list.tsx:46` | When creating new conversation | `locationId` (SHA-256 hashed, 16 chars) | Original ID not exposed |
| `first-question-asked` | `components/chat/chat-interface.tsx:73` | On first message sent in conversation | `modelId` (AI model identifier), `tier` (subscription tier, default: "default") | No message content |

##### Location Management Events

| Event | File | Trigger | Properties | Notes |
|-------|------|---------|------------|-------|
| `location-created` | `components/settings/location-form.tsx:77` | After successful new location creation | `type` ("restaurant" or "food_truck") | Address, zip code, timezone excluded |

#### PII Protection Rules

**No PII ever captured:**
- ✓ No email addresses anywhere
- ✓ No message content in chat events
- ✓ No location addresses or zip codes
- ✓ No API keys or credentials
- ✓ No tokens or session identifiers
- ✓ Location IDs hashed to SHA-256 pseudonyms
- ✓ File names included (not full paths)

**Implementation:**
- All events check `NODE_ENV === 'production'` before sending
- Development mode silently skips event capture
- Event failures won't affect user experience (silent fail, non-blocking)
- Uses existing PostHog client in codebase

#### Client-Side Initialization

The PostHog provider is initialized only in production:

**File:** `providers/posthogProvider.tsx` (production-only wrapper)
**Server-side:** `lib/posthog-server.ts` (singleton)
**Initialization:** `instrumentation-client.ts` (Next.js 16 instrumentation, production-only)

#### Reverse Proxy Configuration

PostHog requests are reverse-proxied via Next.js rewrites (configured in `next.config.ts`):

- `/ph/*` → `https://us.i.posthog.com/`
- `/ingest/*` → `https://us.i.posthog.com/`

This prevents ad-blockers from blocking analytics and improves privacy.

#### Environment Configuration

```bash
# PostHog configuration (in .env)
NEXT_PUBLIC_POSTHOG_KEY=<your-posthog-api-key>
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

Note: PostHog key is public (safe to expose in browser). Host is configured for reverse proxy.

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
import { ApiError, logErrorSafely } from '@/lib/api-error'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user)
      return ApiError.unauthorized(
        'Authentication required',
        'NOT_AUTHENTICATED',
      )

    const body = await req.json()
    // ... implement logic

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = logErrorSafely(error, 'POST /api/my-feature')
    return ApiError.internalServerError(message, 'FEATURE_ERROR')
  }
}
```

---### Add a new database table

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

## Error Handling Architecture

### Error Response Format

All API errors follow a consistent format:

```json
{
  "error": "User-friendly message (never technical details)",
  "code": "ERROR_CODE_IN_CAPS"
}
```

### HTTP Status Codes

- **400** - Bad Request (validation errors, missing fields, invalid JSON)
- **401** - Unauthorized (not authenticated)
- **403** - Forbidden (authenticated but not authorized)
- **404** - Not Found (resource doesn't exist)
- **409** - Conflict (resource conflict)
- **422** - Unprocessable Entity (validation entity error)
- **500** - Internal Server Error (unexpected errors)

### Error Codes Reference

#### Authentication/Authorization

- `NOT_AUTHENTICATED` (401) - User not authenticated
- `UNAUTHORIZED` (401) - General authorization failure
- `ACCESS_DENIED` (403) - User doesn't own resource
- `FORBIDDEN` (403) - Access forbidden

#### Not Found

- `NOT_FOUND` (404) - Generic resource not found
- `LOCATION_NOT_FOUND` (404) - Specific location not found
- `CONVERSATION_NOT_FOUND` (404) - Specific conversation not found

#### Validation/Bad Request

- `BAD_REQUEST` (400) - Invalid request
- `INVALID_JSON` (400) - JSON parsing failed
- `MISSING_EMAIL` (400) - Email field missing
- `INVALID_EMAIL` (400) - Invalid email format
- `MISSING_REQUIRED_FIELDS` (400) - Required fields missing
- `MISSING_LOCATION_ID` (400) - Location ID missing
- `INVALID_TYPE` (400) - Invalid type value
- `INVALID_FIELDS` (400) - Invalid field values
- `INVALID_MODEL` (400) - Invalid model identifier

#### Server Errors

- `INTERNAL_SERVER_ERROR` (500) - Unexpected error
- `SUBSCRIBE_ERROR` (500) - Subscription error
- `FETCH_LOCATIONS_ERROR` (500) - Fetch locations error
- `CREATE_LOCATION_ERROR` (500) - Create location error
- `UPDATE_LOCATION_ERROR` (500) - Update location error
- `DELETE_LOCATION_ERROR` (500) - Delete location error
- `FETCH_CONVERSATIONS_ERROR` (500) - Fetch conversations error
- `CREATE_CONVERSATION_ERROR` (500) - Create conversation error
- `UPDATE_CONVERSATION_ERROR` (500) - Update conversation error
- `DELETE_CONVERSATION_ERROR` (500) - Delete conversation error

### Security Features

**Server-Side Logging:**

```typescript
console.error(`[GET /api/locations]`, {
  message: 'Database connection failed',
  stack: 'Error: ECONNREFUSED at ...',
  timestamp: '2026-04-10T23:00:00Z',
})
```

**Client Receives (Safe):**

```json
{
  "error": "An unexpected error occurred. Please try again.",
  "code": "FETCH_LOCATIONS_ERROR"
}
```

**Protected Against:**

- ✅ Stack trace exposure
- ✅ SQL query injection visibility
- ✅ Database credentials in errors
- ✅ System path exposure
- ✅ Internal system details
- ✅ Process information leaks

### Key Files

| File                                 | Purpose                                               |
| ------------------------------------ | ----------------------------------------------------- |
| `lib/api-error.ts`                   | Centralized API error handler with safe logging       |
| `app/(app)/error.tsx`                | Global error boundary for app routes                  |
| `app/(app)/loading.tsx`              | Loading skeleton UI                                   |
| `components/ui/error-message.tsx`    | Reusable error display component                      |
| `components/ui/loading-skeleton.tsx` | Skeleton loader components (line, card, avatar, text) |
| `tests/e2e/error-handling.spec.ts`   | 20+ comprehensive error handling tests                |

### Error Boundary Usage

Already applied globally to `app/(app)/*` routes. Catches unhandled errors and displays:

- User-friendly error message
- Retry button to reset state
- Dashboard button to navigate home
- Dev-only error details (development mode only)
- No stack traces exposed to users

### Using ApiError in API Routes

```typescript
import { ApiError, logErrorSafely } from '@/lib/api-error'

// Authentication required
return ApiError.unauthorized('Auth required', 'NOT_AUTHENTICATED')

// Resource not found
return ApiError.notFound('Location not found', 'LOCATION_NOT_FOUND')

// Access denied
return ApiError.forbidden('You do not have access', 'ACCESS_DENIED')

// Validation error
return ApiError.badRequest('Invalid email format', 'INVALID_EMAIL')

// Safe error logging
catch (error) {
  const msg = logErrorSafely(error, 'GET /api/endpoint')
  return ApiError.internalServerError(msg, 'ENDPOINT_ERROR')
}
```

---

## Spec References

For context on product scope and roadmap:

- **Founding Vision & Roadmap:** `.agents/spec/VISION.md` (Harry's vision, V2 roadmap, competitive advantage)
- **PRD (full spec):** `.agents/spec/PRD-FINAL.md` (canonical product requirements)
- **Cost analysis:** `.agents/spec/cost-analysis.md` (LLM cost tracking and analysis)

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
