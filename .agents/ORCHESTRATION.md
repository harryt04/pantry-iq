# PantryIQ MVP -- Orchestration Plan

**Version:** 1.0  
**Date:** 2026-04-10  
**Purpose:** Self-contained work unit plan for LLM orchestration agents dispatching via OpenCode Task tool  
**Source:** `.agents/spec/TRD.md` (translated into executable agent prompts)  
**Status:** Ready for orchestration

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Execution Phases](#execution-phases)
4. [Work Units (Agent Prompts)](#work-units-agent-prompts)
5. [Dependency Graph](#dependency-graph)

---

## Overview

This document breaks down the PantryIQ MVP Technical Requirements Document (TRD) into **self-contained work units**, each of which can be dispatched to an LLM agent via the OpenCode `task()` tool.

**Key characteristics:**

- Each work unit includes all information needed to execute it independently
- Dependencies are explicit (blockers must complete first)
- Work units within a layer can execute in parallel
- Status tracked via checkboxes and layer completion
- All file paths, acceptance criteria, and tests are inline

**Orchestration strategy:**

1. Orchestrator reads this file
2. Executes all work units in a given layer in parallel (via concurrent `task()` calls)
3. Waits for layer to complete before moving to next layer
4. Updates status checkboxes as units complete
5. If a unit fails, orchestrator halts and surfaces error; human decides to retry or skip

---

## Prerequisites

**Before starting orchestration, the following must be in place:**

- [ ] **Docker Desktop installed** -- required for `docker compose up` (Postgres 18 + Zero cache)
- [ ] **`.env` file created** from `.env.sample` with all values (see `.agents/SETUP-CHECKLIST.md`)
- [ ] **`npm install` completed** -- all production and dev dependencies installed
- [ ] **Current git branch:** `mvp` (or main branch where work will land)

**If any prerequisite is missing, orchestrator must halt and ask human to complete it before proceeding.**

---

## Execution Phases

| Phase | Layer | Work Units                                             | Can Parallelize | Status      |
| ----- | ----- | ------------------------------------------------------ | --------------- | ----------- |
| 1     | 0     | WU-0.1, WU-0.2, WU-0.3                                 | ✅ All 3        | [ ] Pending |
| 2     | 1     | WU-1.1, WU-1.2                                         | ✅ Both         | [ ] Pending |
| 3     | 2     | WU-2.1, WU-2.2, WU-2.4, WU-3.1, WU-3.4, WU-3.5, WU-4.3 | ✅ All 7        | [ ] Pending |
| 4     | 2-3   | WU-2.3, WU-3.2, WU-3.3                                 | ✅ All 3        | [ ] Pending |
| 5     | 4     | WU-4.1, WU-4.2, WU-5.1, WU-5.2                         | ✅ All 4        | [ ] Pending |
| 6     | 5     | WU-5.3                                                 | ❌ Sequential   | [ ] Pending |

---

## Work Units (Agent Prompts)

Each work unit below is formatted as a ready-to-execute agent prompt. The orchestrator can pass the entire **Prompt** section (starting with `## Prompt`) directly to `task(description, prompt)`.

---

### Phase 1: Foundation (Layer 0) -- All Parallel

---

#### WU-0.1: Project Scaffolding & Dev Tooling

**Status:** [ ] Pending | [ ] In Progress | [ ] Complete | [ ] Failed

**Priority:** P0 (Blocks everything)  
**Effort:** Small  
**Dependencies:** None  
**Parallel group:** Layer 0

### Prompt

You are an expert Next.js/Node.js build engineer. Your task is to set up all development tooling and infrastructure for the PantryIQ MVP monolith.

**Acceptance Criteria (Validation):**
All of the following must pass before you mark this task complete:

- `docker compose up` starts Postgres 18 + Zero cache server without errors
- `npm run db:generate` generates migration files from schema (will be empty initially but command succeeds)
- `npm run db:push` succeeds (will connect to local Postgres)
- `npx vitest --run` exits cleanly with 0 tests passing
- `npx playwright test` exits cleanly with 0 tests (config loads)
- `npm run build` still succeeds (no regressions to existing landing page)

**Files to Create:**

1. `docker-compose.yml` -- Multi-container setup:
   - Postgres 18 container: port 5432, volume for data persistence, env vars `POSTGRES_DB=pantryiq`, `POSTGRES_PASSWORD=postgres`
   - Zero cache server container: port 8001, depends on Postgres, env var `ZERO_UPSTREAM_DB` pointing to Postgres
   - Next.js dev server (via `npm run dev`): port 3000

2. `Dockerfile` -- Production multi-stage build:
   - Stage 1: Node 20 Alpine, install deps, build Next.js
   - Stage 2: Node 20 Alpine, copy `.next/`, expose 3000, start with `node .next/standalone/server.js`
   - Include `.dockerignore`

3. `vitest.config.ts` -- Vitest configuration:
   - Environment: `jsdom`
   - Globals: `true`
   - Setup files: (none yet)
   - Include React testing library resolver

4. `playwright.config.ts` -- Playwright E2E configuration:
   - Base URL: `http://localhost:3000`
   - Timeout: 30 seconds
   - Workers: 4
   - Output: `playwright-report/`

5. `drizzle.config.ts` -- Drizzle ORM configuration:
   - Driver: `postgres` (dialect)
   - dbCredentials: reads `DATABASE_URL` from `.env`
   - Out: `db/migrations`
   - Schema: `db/schema/index.ts`

6. `.dockerignore` -- Standard Node.js + Next.js entries

**Files to Modify:**

1. `package.json`:
   - Add all new dependencies (see list below)
   - Add scripts:
     - `"db:generate": "drizzle-kit generate"`
     - `"db:migrate": "drizzle-kit migrate"`
     - `"db:push": "drizzle-kit push"`
     - `"db:studio": "drizzle-kit studio"`
     - `"test": "npm run test:unit && npm run test:e2e"`
     - `"test:unit": "vitest --run"`
     - `"test:e2e": "playwright test"`
     - `"docker:build": "docker build -t pantryiq:latest ."`

2. `tsconfig.json`:
   - Ensure path alias `@/*` covers all dirs; add `@/db` if not already covered

3. `.env.sample`:
   - Add all new env vars (see **Environment Variables** section below)

4. `.gitignore`:
   - Add: `test-results/`, `playwright-report/`, `.next/`, `node_modules/`, `.env`, `dist/`, `*.db`

**Dependencies to Install:**

```bash
# Production
npm install better-auth drizzle-orm postgres @zero-sync/client ai @ai-sdk/openai @ai-sdk/anthropic @ai-sdk/google

# Dev
npm install -D drizzle-kit @playwright/test vitest @testing-library/react @vitejs/plugin-react jsdom
```

**Environment Variables Required:**

```bash
# Database (local dev)
DATABASE_URL=postgres://postgres:postgres@localhost:5432/pantryiq

# Zero Sync (local dev)
ZERO_UPSTREAM_DB=postgres://postgres:postgres@localhost:5432/pantryiq
ZERO_PORT=8001

# Better Auth (will be set later)
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:3000

# LLM Providers (optional now, required for WU-3.x)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_GENERATIVE_AI_API_KEY=

# Other APIs (optional now)
OPENWEATHERMAP_API_KEY=
GOOGLE_PLACES_API_KEY=
SQUARE_APP_ID=
SQUARE_APP_SECRET=
SQUARE_ENVIRONMENT=sandbox

# Existing PostHog (already configured)
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

**Tests:** None specific to this WU. Validation is acceptance criteria above.

**Notes:**

- Docker Compose must use network name `pantryiq` so containers can reference each other by hostname
- Drizzle migrations directory can be empty initially; migrations will be generated in WU-0.2
- If `docker compose up` fails, check Docker daemon is running and ports 5432, 8001, 3000 are not in use

---

#### WU-0.2: Database Schema (Drizzle)

**Status:** [ ] Pending | [ ] In Progress | [ ] Complete | [ ] Failed

**Priority:** P0 (Blocks auth, import, chatbot)  
**Effort:** Medium  
**Dependencies:** WU-0.1 (drizzle tooling must be installed)  
**Parallel group:** Layer 0

### Prompt

You are a database schema expert. Your task is to define all Drizzle ORM schema files for the PantryIQ MVP database.

**Acceptance Criteria (Validation):**

- `npm run db:generate` produces a clean migration with all tables
- `npm run db:push` applies schema to local Postgres without errors
- All tables visible in `drizzle-kit studio` (run after push)
- Foreign key relationships enforced (cascade deletes work)
- All column types and constraints match the TRD specification

**Files to Create:**

1. `db/index.ts` -- Drizzle client instance:

   ```typescript
   import { drizzle } from 'drizzle-orm/postgres-js'
   import postgres from 'postgres'
   import * as schema from './schema'

   const client = postgres(process.env.DATABASE_URL!)
   export const db = drizzle(client, { schema })
   ```

2. `db/schema/index.ts` -- Re-export all schema modules:

   ```typescript
   export * from './locations'
   export * from './pos-connections'
   export * from './csv-uploads'
   export * from './transactions'
   export * from './weather'
   export * from './places-cache'
   export * from './conversations'
   export * from './messages'
   export * from './waitlist-signups'
   ```

3. `db/schema/locations.ts` -- Location (restaurant/food truck) table:
   - id: uuid PK, default gen_random_uuid()
   - user_id: text FK -> user.id ON DELETE CASCADE (Better Auth manages user table)
   - name: text NOT NULL
   - timezone: text NOT NULL DEFAULT 'America/New_York'
   - address: text
   - zip_code: text NOT NULL
   - type: text NOT NULL DEFAULT 'restaurant' (enum: 'restaurant' | 'food_truck')
   - created_at: timestamp NOT NULL DEFAULT now()

4. `db/schema/pos-connections.ts` -- POS provider OAuth tokens:
   - id: uuid PK
   - location_id: uuid FK -> locations(id) ON DELETE CASCADE
   - provider: text NOT NULL DEFAULT 'square' (enum: 'square' | future)
   - oauth_token: text NOT NULL (will be encrypted at rest later)
   - refresh_token: text
   - sync_state: text NOT NULL DEFAULT 'pending' (enum: 'pending' | 'syncing' | 'synced' | 'error')
   - last_sync: timestamp
   - created_at: timestamp NOT NULL DEFAULT now()

5. `db/schema/csv-uploads.ts` -- CSV file upload tracking:
   - id: uuid PK
   - location_id: uuid FK -> locations(id) ON DELETE CASCADE
   - filename: text NOT NULL
   - row_count: integer
   - status: text NOT NULL DEFAULT 'pending' (enum: 'pending' | 'mapping' | 'importing' | 'complete' | 'error')
   - error_details: text
   - field_mapping: jsonb (stored confirmed mapping)
   - uploaded_at: timestamp NOT NULL DEFAULT now()

6. `db/schema/transactions.ts` -- Transaction data (from CSV or Square):
   - id: uuid PK
   - location_id: uuid FK -> locations(id) ON DELETE CASCADE
   - date: date NOT NULL
   - item: text NOT NULL
   - qty: numeric NOT NULL
   - revenue: numeric
   - cost: numeric
   - source: text NOT NULL (enum: 'square' | 'csv')
   - source_id: text (reference to csv_uploads.id or square txn id)
   - created_at: timestamp NOT NULL DEFAULT now()
   - **INDEX:** (location_id, date)

7. `db/schema/weather.ts` -- Weather data cache:
   - id: uuid PK
   - location_id: uuid FK -> locations(id) ON DELETE CASCADE
   - date: date NOT NULL
   - temperature: numeric
   - conditions: text
   - precipitation: numeric
   - cached_at: timestamp NOT NULL DEFAULT now()
   - **UNIQUE:** (location_id, date)

8. `db/schema/places-cache.ts` -- Google Places API results cache:
   - id: uuid PK
   - location_id: uuid FK -> locations(id) ON DELETE CASCADE
   - org_name: text NOT NULL
   - address: text
   - phone: text
   - hours: text
   - types: text[] (array of types the org accepts)
   - cached_at: timestamp NOT NULL DEFAULT now()

9. `db/schema/conversations.ts` -- Chat conversation tracking:
   - id: uuid PK
   - location_id: uuid FK -> locations(id) ON DELETE CASCADE
   - default_model: text NOT NULL DEFAULT 'gemini-2.0-flash-lite'
   - created_at: timestamp NOT NULL DEFAULT now()

10. `db/schema/messages.ts` -- Chat messages:
    - id: uuid PK
    - conversation_id: uuid FK -> conversations(id) ON DELETE CASCADE
    - role: text NOT NULL (enum: 'user' | 'assistant' | 'system')
    - content: text NOT NULL
    - model_used: text (null for user messages)
    - tokens_in: integer
    - tokens_out: integer
    - created_at: timestamp NOT NULL DEFAULT now()

11. `db/schema/waitlist-signups.ts` -- Existing waitlist (from landing page):
    - id: uuid PK
    - email: text NOT NULL UNIQUE
    - created_at: timestamp NOT NULL DEFAULT now()

**Tests:**

Create `tests/unit/schema.test.ts`:

- Import all schema exports from `db/schema/index.ts`
- Verify all expected tables are exported
- Verify all tables have PK and created_at columns
- Verify FK relationships exist in Drizzle schema objects

**Notes:**

- Better Auth manages its own tables (`user`, `session`, `account`, `verification`). Do NOT define these; they will be auto-created when WU-1.1 runs.
- All FK constraints use `ON DELETE CASCADE` to simplify cleanup
- Use `uuid` for all PKs (Drizzle's `uuid()` type with `gen_random_uuid()` default)
- Use `timestamp` for all date/time fields with `now()` default
- Transactions table has a compound index on (location_id, date) for efficient queries

---

#### WU-0.3: App Route Groups & Layout Restructure

**Status:** [ ] Pending | [ ] In Progress | [ ] Complete | [ ] Failed

**Priority:** P0 (Blocks all page work)  
**Effort:** Medium  
**Dependencies:** WU-0.1 (build tooling)  
**Parallel group:** Layer 0

### Prompt

You are a Next.js App Router expert. Your task is to restructure the app directory into route groups and create placeholder pages for the full monolith.

**Acceptance Criteria (Validation):**

- `/` renders the existing landing page (no visual regressions)
- `/pricing` renders a pricing page
- `/login` and `/signup` render placeholder auth forms
- `/dashboard`, `/import`, `/conversations`, `/settings` render placeholder pages (with "Coming soon" or basic layout)
- App shell (sidebar + header) visible on all `(app)` routes
- `npm run build` succeeds with no errors or warnings

**Current State:**

- Existing landing page is in `components/landing-page.tsx` (18KB)
- Current `app/page.tsx` renders it
- This needs to be moved to `app/(marketing)/page.tsx` and route group created

**Files to Create:**

1. `app/(marketing)/layout.tsx` -- Marketing routes layout:
   - Minimal layout, inherit root providers
   - Optional: different nav bar than app routes

2. `app/(marketing)/page.tsx` -- Import and render existing landing page:

   ```typescript
   import LandingPage from '@/components/landing-page';
   export default function Home() {
     return <LandingPage />;
   }
   ```

3. `app/(marketing)/pricing/page.tsx` -- Pricing page:
   - Can extract pricing table from `LandingPage` component or create simple version
   - Placeholder is fine for now

4. `app/(auth)/layout.tsx` -- Auth routes layout:
   - Centered card layout (light background, shadow, white card)
   - Responsive: mobile-friendly

5. `app/(auth)/login/page.tsx` -- Placeholder login page:

   ```typescript
   export default function LoginPage() {
     return <div>Login form (WU-1.2)</div>;
   }
   ```

6. `app/(auth)/signup/page.tsx` -- Placeholder signup page:

   ```typescript
   export default function SignupPage() {
     return <div>Signup form (WU-1.2)</div>;
   }
   ```

7. `app/(app)/layout.tsx` -- Authenticated app layout:
   - Sidebar (from `components/layout/app-sidebar.tsx`)
   - Header with user menu (from `components/layout/app-header.tsx`)
   - Main content area
   - **Auth check:** Redirect to `/login` if not authenticated (will be enhanced in WU-1.1)

8. `app/(app)/dashboard/page.tsx` -- Placeholder dashboard:

   ```typescript
   export default function DashboardPage() {
     return <div>Dashboard (WU-4.1)</div>;
   }
   ```

9. `app/(app)/import/page.tsx` -- Placeholder import page:

   ```typescript
   export default function ImportPage() {
     return <div>Import data (WU-2.2, WU-2.3, WU-2.4)</div>;
   }
   ```

10. `app/(app)/conversations/page.tsx` -- Placeholder conversations list:

    ```typescript
    export default function ConversationsPage() {
      return <div>Conversations list (WU-3.3)</div>;
    }
    ```

11. `app/(app)/conversations/[id]/page.tsx` -- Placeholder chat page:

    ```typescript
    export default function ChatPage({ params }: { params: { id: string } }) {
      return <div>Chat for {params.id} (WU-3.3)</div>;
    }
    ```

12. `app/(app)/settings/page.tsx` -- Placeholder settings:

    ```typescript
    export default function SettingsPage() {
      return <div>Settings (WU-2.1)</div>;
    }
    ```

13. `components/layout/app-sidebar.tsx` -- App sidebar navigation:
    - Navigation links: Dashboard, Import, Conversations, Settings
    - Logo or branding at top
    - Logout button at bottom

14. `components/layout/app-header.tsx` -- App header:
    - Location selector (dropdown, populated later)
    - User name/email display
    - Profile/settings link

**Files to Modify:**

1. `app/layout.tsx` -- Keep as root layout:
   - Ensure providers wrap all route groups
   - Providers already include PostHogProvider; will add ZeroProvider in WU-4.2

2. `app/page.tsx` -- Delete or redirect:
   - Option A: Delete (route group handles `/`)
   - Option B: Keep as redirect to `(marketing)` (optional, for backward compat)

**Tests:**

Create `tests/e2e/navigation.spec.ts`:

- Test: `GET /` returns 200
- Test: `GET /pricing` returns 200
- Test: `GET /login` returns 200
- Test: `GET /signup` returns 200
- Test: `GET /dashboard` returns 200 (or redirect if not auth, will be fixed in WU-1.1)
- Test: Landing page has expected heading text
- Test: CTA button visible on landing page

**Notes:**

- All placeholder pages can be minimal (just text or a div)
- App shell layout should use Tailwind for responsive design
- Do NOT implement auth checks yet (WU-1.1 handles that via middleware)
- Route groups use parentheses: `(marketing)`, `(auth)`, `(app)` -- they do NOT create URL segments

---

### Phase 2: Auth (Layer 1) -- Both Parallel

---

#### WU-1.1: Better Auth Setup

**Status:** [ ] Pending | [ ] In Progress | [ ] Complete | [ ] Failed

**Priority:** P0 (Blocks all authenticated features)  
**Effort:** Medium  
**Dependencies:** WU-0.1, WU-0.2, WU-0.3  
**Parallel group:** Layer 1

### Prompt

You are an authentication specialist. Your task is to configure Better Auth with Postgres/Drizzle, set up server and client instances, create API route handlers, and implement middleware for route protection.

**Acceptance Criteria (Validation):**

- `POST /api/auth/sign-up/email` creates a user in Postgres with hashed password
- `POST /api/auth/sign-in/email` returns a session cookie (HttpOnly, Secure, SameSite=Lax)
- `GET /api/auth/get-session` returns the current user when authenticated
- Visiting `/dashboard` while logged out redirects to `/login`
- Visiting `/login` while logged in redirects to `/dashboard`
- Password hashing uses bcrypt or argon2 (Better Auth default)
- Session cookies are HttpOnly, Secure, SameSite=Lax
- `npm run build` succeeds

**Files to Create:**

1. `lib/auth.ts` -- Better Auth server instance:

   ```typescript
   import { betterAuth } from 'better-auth'
   import { drizzleAdapter } from 'better-auth/adapters/drizzle'
   import { db } from '@/db'
   import * as schema from '@/db/schema'

   export const auth = betterAuth({
     database: drizzleAdapter(db, {
       provider: 'postgres',
       schema,
     }),
     emailAndPassword: {
       enabled: true,
     },
     secret: process.env.BETTER_AUTH_SECRET!,
     baseURL: process.env.BETTER_AUTH_URL!,
   })
   ```

2. `lib/auth-client.ts` -- Better Auth React client:

   ```typescript
   import { createAuthClient } from 'better-auth/react'

   export const authClient = createAuthClient({
     baseURL:
       process.env.NEXT_PUBLIC_BETTER_AUTH_URL || 'http://localhost:3000',
   })

   export const { useSession } = authClient
   ```

3. `app/api/auth/[...all]/route.ts` -- Catch-all auth handler:

   ```typescript
   import { auth } from '@/lib/auth'

   export const { GET, POST } = auth.toNextJsHandler()
   ```

4. `middleware.ts` -- Next.js middleware for route protection:
   - Redirect unauthenticated users from `(app)` routes to `/login`
   - Redirect authenticated users from `(auth)` routes to `/dashboard`
   - Check session cookie validity
   - Skip middleware for API routes, static files, `(marketing)` routes

**Files to Modify:**

1. `app/(app)/layout.tsx` -- Add auth session check:
   - Use `useSession()` hook (client component)
   - Redirect if not authenticated (or let middleware handle it)

2. `.env.sample` -- Add:

   ```bash
   BETTER_AUTH_SECRET=<generate with openssl rand -base64 32>
   BETTER_AUTH_URL=http://localhost:3000
   NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3000
   ```

3. `package.json` -- Add script:
   - If not present: `"generate:auth": "better-auth generate"` (optional, for schema generation)

**Tests:**

Create `tests/e2e/auth.spec.ts`:

- Test: Sign up with valid email/password, verify redirect to dashboard
- Test: Sign in with valid credentials, verify session cookie set
- Test: Sign out, verify redirect to login
- Test: Access protected route while logged out, verify redirect to login
- Test: Access auth route while logged in, verify redirect to dashboard
- Test: Sign up with invalid email, verify error message
- Test: Sign in with wrong password, verify error message

Create `tests/unit/auth.test.ts`:

- Test: Middleware redirect rules (unit test the matcher)
- Test: Session parsing from cookie
- Test: Auth client initialization

**Notes:**

- Better Auth manages its own tables (`user`, `session`, `account`, `verification`); they will be created automatically when schema is pushed
- `BETTER_AUTH_SECRET` must be at least 32 characters and high entropy (use `openssl rand -base64 32`)
- Session cookies are HttpOnly and Secure by default in Better Auth
- Middleware pattern: use `NextResponse.redirect()` for redirects, check session before deciding next action

---

#### WU-1.2: Auth UI (Login/Signup Forms)

**Status:** [ ] Pending | [ ] In Progress | [ ] Complete | [ ] Failed

**Priority:** P0  
**Effort:** Medium  
**Dependencies:** WU-0.3, WU-1.1  
**Parallel group:** Layer 1

### Prompt

You are a React UI specialist. Your task is to build login and signup form components using shadcn/ui and wire them to Better Auth.

**Acceptance Criteria (Validation):**

- Login form accepts email + password, submits to `/api/auth/sign-in/email`, handles loading state, displays errors
- Signup form accepts email + password + confirm password, validates match, submits to `/api/auth/sign-up/email`
- Both forms show error messages for: invalid credentials, email already taken, server errors
- Forms use shadcn/ui components (Input, Button, Label, Card)
- Forms are responsive on mobile and desktop
- `npm run build` succeeds

**Files to Create:**

1. `components/auth/login-form.tsx` -- Login form component:
   - Email input field
   - Password input field
   - Submit button (shows loading state while submitting)
   - Error message display
   - Link to signup page
   - Use Better Auth client to sign in

2. `components/auth/signup-form.tsx` -- Signup form component:
   - Email input field
   - Password input field
   - Confirm password input field
   - Client-side validation: passwords match
   - Submit button (shows loading state)
   - Error message display
   - Link to login page
   - Use Better Auth client to sign up

**Files to Modify:**

1. `app/(auth)/login/page.tsx` -- Render login form:

   ```typescript
   import { LoginForm } from '@/components/auth/login-form';
   export default function LoginPage() {
     return <LoginForm />;
   }
   ```

2. `app/(auth)/signup/page.tsx` -- Render signup form:

   ```typescript
   import { SignupForm } from '@/components/auth/signup-form';
   export default function SignupPage() {
     return <SignupForm />;
   }
   ```

3. `app/(auth)/layout.tsx` -- Centered auth layout:
   - Flex container: centered card
   - Card has shadow, padding, white background
   - Responsive: full width on mobile, max-width on desktop

**Tests:** Covered by WU-1.1 E2E tests.

**Notes:**

- Forms should use `useTransition()` hook or similar for loading state
- Error messages from Better Auth should be displayed clearly (e.g., "Email already taken", "Invalid credentials")
- Links between login and signup pages allow user flow
- Consider adding "Forgot password?" link (optional for MVP, implement in post-MVP)

---

### Phase 3: Core Data Features (Layer 2) -- Parallel Groups

---

#### WU-2.1: Location Management

**Status:** [ ] Pending | [ ] In Progress | [ ] Complete | [ ] Failed

**Priority:** P0 (Blocks import, chatbot, weather, places)  
**Effort:** Small  
**Dependencies:** WU-1.1  
**Parallel group:** Layer 2

### Prompt

You are a CRUD specialist. Your task is to build location management: API routes for CRUD operations and UI components for the settings page.

**Acceptance Criteria (Validation):**

- User can create a location (name, zip_code required; other fields optional)
- User can list their locations
- User can edit a location
- User can delete a location (cascades to all related data)
- Location type (restaurant/food_truck) is selectable
- User cannot access other users' locations (auth check)
- `npm run build` succeeds

**Files to Create:**

1. `app/api/locations/route.ts` -- GET (list) and POST (create):
   - GET: Return all locations for current user
   - POST: Create new location for current user, validate input, return created location

2. `app/api/locations/[id]/route.ts` -- GET, PUT, DELETE for specific location:
   - GET: Return location if owned by user, else 403
   - PUT: Update location if owned by user, else 403
   - DELETE: Delete location if owned by user, else 403

3. `components/settings/location-form.tsx` -- Create/edit location form:
   - Fields: name (required), zip_code (required), address (optional), timezone (optional), type (select)
   - Submit button, loading state
   - Error display

4. `components/settings/location-list.tsx` -- List locations:
   - Show all locations in table or cards
   - Edit button per location (opens form)
   - Delete button per location (confirm before delete)
   - "Add location" button

**Files to Modify:**

1. `app/(app)/settings/page.tsx` -- Replace placeholder:
   - Render location list and form
   - Handle create/edit/delete flows

**Tests:**

Create `tests/unit/locations-api.test.ts`:

- Test: GET /api/locations returns user's locations only
- Test: POST /api/locations creates location, returns 201
- Test: POST /api/locations with invalid data returns 400
- Test: DELETE /api/locations/:id cascades to transactions, conversations, etc.
- Test: User A cannot access User B's location (403)

Create `tests/e2e/locations.spec.ts`:

- Test: Create location flow, verify appears in list
- Test: Edit location, verify changes persisted
- Test: Delete location, verify removed from list

**Notes:**

- All location API routes must check `req.user.id` matches the location's `user_id`
- Timezone can be optional but defaults to 'America/New_York'
- Type field: use select with options 'restaurant' | 'food_truck'

---

#### WU-2.2: CSV Import -- Parsing & Upload

**Status:** [ ] Pending | [ ] In Progress | [ ] Complete | [ ] Failed

**Priority:** P0  
**Effort:** Large  
**Dependencies:** WU-0.2  
**Parallel group:** Layer 2

### Prompt

You are a file parsing expert. Your task is to build CSV file upload and parsing functionality.

**Acceptance Criteria (Validation):**

- Accepts `.csv` and `.tsv` files up to 50MB
- Parses CSV correctly (handles quoted fields, commas in values, different encodings)
- Returns first 10 rows as preview after upload
- Creates `csv_uploads` record in DB with status='pending'
- Rejects files > 50MB with clear error
- Rejects non-CSV files with clear error
- Associates upload with correct location (from request)
- `npm run build` succeeds

**Files to Create:**

1. `lib/csv/parser.ts` -- CSV parsing logic:
   - Function: `parseCSV(buffer: Buffer): Promise<{ headers: string[], rows: Record<string, string>[] }>`
   - Handle different delimiters (comma, tab, semicolon)
   - Handle quoted fields with embedded commas
   - Handle different encodings (UTF-8, UTF-16, ISO-8859-1)
   - Return first 10 rows for preview
   - Throw descriptive errors for malformed CSV

2. `app/api/csv/upload/route.ts` -- CSV upload endpoint:
   - POST endpoint
   - Accept `multipart/form-data` with file and location_id
   - Validate file size (max 50MB)
   - Validate file type (.csv, .tsv)
   - Call parser, store preview
   - Create `csv_uploads` record with status='pending'
   - Return: `{ uploadId, filename, rowCount, headers, preview (first 10 rows), status }`
   - Error handling: return 400 for bad requests, 413 for file too large, 500 for server errors

3. `components/import/csv-upload.tsx` -- File upload UI:
   - Drag-and-drop file zone or file input
   - Progress indicator while uploading
   - Show preview of first 10 rows after upload
   - Display error if upload fails
   - Link to field mapping step

**Files to Modify:**

1. `app/(app)/import/page.tsx` -- Replace placeholder:
   - Render CSV upload component

**Tests:**

Create `tests/unit/csv-parser.test.ts`:

- Test: Parse standard CSV (comma-delimited)
- Test: Parse CSV with quoted fields containing commas
- Test: Parse TSV (tab-delimited)
- Test: Handle empty rows
- Test: Handle malformed CSV (unbalanced quotes) -- should throw
- Test: Enforce 50MB file size limit

Create `tests/fixtures/sample-*.csv`:

- Pre-generate sample CSV files for testing

**Notes:**

- Use a CSV parsing library like `csv-parse` or `papaparse` for robustness
- Store the raw file in a temp directory or S3-like service for later import (WU-2.3 will consume it)
- Preview should be the first 10 rows formatted as JSON or table
- File size check should happen before parsing to avoid memory issues

---

#### WU-2.3: CSV Import -- AI Field Mapping

**Status:** [ ] Pending | [ ] In Progress | [ ] Complete | [ ] Failed

**Priority:** P0  
**Effort:** Large  
**Dependencies:** WU-2.2, WU-3.1  
**Parallel group:** Phase 4 (depends on WU-3.1 for LLM)

### Prompt

You are an AI integration specialist. Your task is to build AI-assisted field mapping for CSV imports.

**Acceptance Criteria (Validation):**

- AI correctly maps common column names (Date, Item, Quantity, Price, Cost, Revenue) in >80% of cases
- User can override any mapping via dropdown
- Standard target fields: `date`, `item`, `qty`, `revenue`, `cost`, `location` (all optional except item)
- After confirmation, data is normalized and inserted into `transactions` table
- `csv_uploads` status progresses: pending -> mapping -> importing -> complete/error
- Import errors surface clearly (which rows failed, why)
- `npm run build` succeeds

**Files to Create:**

1. `lib/csv/field-mapper.ts` -- AI field mapping logic:
   - Function: `suggestMappings(headers: string[], sample: Record<string, string>[]): Promise<{ [sourceColumn]: targetField }>`
   - Send headers + sample rows to LLM (via Vercel AI SDK)
   - Parse LLM response into mapping suggestions
   - Return structured mapping: `{ "Date": "date", "Item": "item", "Qty": "qty", ... }`
   - Handle ambiguous columns with fallback labels

2. `app/api/csv/field-mapping/route.ts` -- Field mapping confirmation endpoint:
   - POST endpoint
   - Accept: `{ uploadId, confirmedMapping: { [sourceColumn]: targetField } }`
   - Call LLM to suggest mappings (or use cached suggestion)
   - Validate mapping (all required fields present)
   - Normalize CSV data according to mapping
   - Insert rows into `transactions` table with source='csv', source_id=uploadId
   - Update `csv_uploads` status: pending -> mapping -> importing -> complete/error
   - Return: `{ success, rowsImported, errors: [{ row, message }] }`

3. `components/import/field-mapping-ui.tsx` -- Field mapping UI:
   - Display AI-suggested mappings as editable dropdowns
   - Standard target fields shown in dropdowns: date, item, qty, revenue, cost, location, source, etc.
   - Show preview of sample data in suggested mapping
   - Confirm button to proceed with mapping
   - Cancel button
   - Error display if validation fails

**Files to Modify:**

1. `app/(app)/import/page.tsx` -- Add field mapping UI:
   - Show field mapping component after CSV upload completes

**Tests:**

Create `tests/unit/field-mapper.test.ts`:

- Mock LLM responses
- Test: Mapping extraction from LLM response
- Test: Handle ambiguous columns (fallback logic)
- Test: Validate that required columns are mapped
- Test: Normalize data according to mapping (date parsing, number parsing)

Create `tests/e2e/csv-import.spec.ts`:

- Test: Upload CSV, see preview
- Test: See AI-suggested mappings
- Test: Confirm mappings, see import status
- Test: Verify transactions appear in database after import

**Notes:**

- LLM call should be made immediately after upload (or on-demand when field mapping page loads)
- System prompt for LLM: "You are a data expert. Analyze these CSV column headers and suggest how they map to standard transaction fields: date, item, qty, revenue, cost. Return a JSON object with the mapping."
- Normalization: parse dates to ISO format, parse numbers to float, trim strings
- Row-level errors: if a single row fails validation, record the error but continue with other rows

---

#### WU-2.4: Square OAuth Integration

**Status:** [ ] Pending | [ ] In Progress | [ ] Complete | [ ] Failed

**Priority:** P0  
**Effort:** Large  
**Dependencies:** WU-1.1, WU-0.2  
**Parallel group:** Layer 2

### Prompt

You are a payment integration specialist. Your task is to build Square POS OAuth flow and transaction sync.

**Acceptance Criteria (Validation):**

- User can initiate Square OAuth flow by clicking "Connect Square"
- OAuth callback exchanges authorization code for access token + refresh token
- Tokens are stored encrypted in `pos_connections` table
- After connection, initial transaction sync fetches items, quantities, timestamps, revenue
- Transactions normalized and inserted into `transactions` table with source='square'
- Connection status visible (pending/syncing/synced/error)
- Incremental sync supported (last_sync timestamp prevents re-fetching old data)
- `npm run build` succeeds

**Files to Create:**

1. `lib/square/client.ts` -- Square API client:
   - Function: `buildOAuthURL(state: string): string` -- Generate Square OAuth authorization URL with correct scopes
   - Function: `exchangeCodeForToken(code: string): Promise<{ accessToken, refreshToken }>`
   - Function: `getTransactions(accessToken: string, since?: Date): Promise<Transaction[]>` -- Fetch transactions, normalize to PantryIQ format
   - Handle Square API errors gracefully

2. `app/api/square/connect/route.ts` -- Initiate OAuth:
   - POST endpoint
   - Accept: `{ locationId }`
   - Generate OAuth URL with state parameter
   - Return: `{ authURL }`
   - Frontend redirects to authURL

3. `app/api/square/callback/route.ts` -- OAuth callback:
   - GET endpoint with `code` and `state` query params
   - Validate state (CSRF protection)
   - Exchange code for tokens via Square API
   - Store tokens in `pos_connections` (encrypted)
   - Trigger initial transaction sync (async)
   - Redirect to `/import` with success message

4. `components/import/square-connect.tsx` -- Square connect UI:
   - "Connect Square" button
   - Connection status display (pending, syncing, synced, error)
   - Disconnect button (optional)
   - Display error message if connection fails

**Files to Modify:**

1. `app/(app)/import/page.tsx` -- Add Square connect component

2. `.env.sample` -- Add:
   ```bash
   SQUARE_APP_ID=
   SQUARE_APP_SECRET=
   SQUARE_ENVIRONMENT=sandbox
   ```

**Tests:**

Create `tests/unit/square-client.test.ts`:

- Test: OAuth URL generation (correct scopes, redirect URI)
- Test: Token exchange (mock Square API response)
- Test: Transaction normalization (Square format -> PantryIQ format)
- Test: Error handling for API failures

Create `tests/e2e/square-import.spec.ts` (limited):

- Test: Connect button renders
- Test: Verify OAuth redirect URL format is correct

**Notes:**

- OAuth scopes required: `MERCHANT_PROFILE_READ`, `ORDERS_READ` (or latest Square scope requirements)
- Tokens should be encrypted before storing in DB (use a library like `crypto-js` or Node's built-in `crypto`)
- Initial sync can be done async; update `pos_connections.sync_state` to 'syncing', then 'synced' when done
- Incremental sync: Only fetch transactions since `pos_connections.last_sync`
- Store `last_sync` timestamp in `pos_connections` after each sync

---

#### WU-3.1: LLM Provider Configuration & Model Registry

**Status:** [ ] Pending | [ ] In Progress | [ ] Complete | [ ] Failed

**Priority:** P0  
**Effort:** Medium  
**Dependencies:** WU-0.1 (dependencies installed)  
**Parallel group:** Layer 2

### Prompt

You are an LLM integration specialist. Your task is to configure Vercel AI SDK providers and build a model registry with cost metadata.

**Acceptance Criteria (Validation):**

- All supported models are enumerated with correct provider mapping (see list below)
- Each model has: id, displayName, tier, costPerInputToken, costPerOutputToken, contextWindowTokens
- Models can be filtered by tier (budget, mid)
- System prompt includes: role definition, data context injection points, hallucination guardrails
- Provider instances created only when API key is present (graceful degradation)
- `npm run build` succeeds

**Supported Models:**

**Budget tier:**

- Google Gemini 2.0 Flash Lite (id: `gemini-2.0-flash-lite`)
- Google Gemini 2.0 Flash (id: `gemini-2.0-flash`)
- Anthropic Claude Haiku 3 (id: `claude-3-haiku-20240307`) [legacy]
- OpenAI GPT-4o mini (id: `gpt-4o-mini`)

**Mid tier:**

- OpenAI GPT-4o (id: `gpt-4o`)
- Anthropic Claude Haiku 4.5 (id: `claude-3-5-haiku-20241022`)
- Google Gemini 2.5 Flash (id: `gemini-2.5-flash`)

**Files to Create:**

1. `lib/ai/providers.ts` -- Initialize LLM providers:

   ```typescript
   export function initializeProviders() {
     const providers: Record<string, any> = {};

     if (process.env.OPENAI_API_KEY) {
       providers.openai = openai(...);
     }
     if (process.env.ANTHROPIC_API_KEY) {
       providers.anthropic = anthropic(...);
     }
     if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
       providers.google = google(...);
     }

     return providers;
   }
   ```

2. `lib/ai/models.ts` -- Model registry:

   ```typescript
   export const MODEL_REGISTRY = [
     {
       id: 'gemini-2.0-flash-lite',
       displayName: 'Gemini 2.0 Flash Lite (Budget)',
       tier: 'budget',
       provider: 'google',
       costPerInputToken: 0.00005,
       costPerOutputToken: 0.00015,
       contextWindowTokens: 100000,
     },
     // ... all other models
   ];

   export function getModel(id: string) { ... }
   export function getModelsByTier(tier: 'budget' | 'mid') { ... }
   export function calculateCost(modelId: string, tokensIn: number, tokensOut: number) { ... }
   ```

3. `lib/ai/prompts.ts` -- System prompts:

   ```typescript
   export const SYSTEM_PROMPT_BASE = `
     You are a restaurant operations analyst assistant for PantryIQ.
     Your role is to help restaurant owners and food truck operators optimize inventory, reduce waste, and discover donation opportunities.

     [Context will be injected here]

     Guidelines:
     - Only use data provided in the context. If insufficient data, say so clearly.
     - Be honest about limitations and data gaps.
     - Provide actionable recommendations.
     - Never make up data or hallucinate donation opportunities.
   `;

   export function buildPromptWithContext(...) { ... }
   ```

**Tests:**

Create `tests/unit/models.test.ts`:

- Test: All models in registry have required fields
- Test: Model lookup by ID returns correct model
- Test: Tier filtering works (get budget models, get mid-tier models)
- Test: Cost calculation function works (tokens -> dollars)

Create `tests/unit/prompts.test.ts`:

- Test: System prompt includes expected sections
- Test: Context injection produces valid prompt

**Notes:**

- Cost data should be current as of TRD date (April 2026); may need updates for production
- Provider initialization should be lazy (only initialize when first used)
- Graceful degradation: if no API keys set, return empty provider list and surface error to user later
- Context injection: will be used in WU-3.2 to add transaction summary, weather, places data

---

#### WU-3.4: Weather Data Integration

**Status:** [ ] Pending | [ ] In Progress | [ ] Complete | [ ] Failed

**Priority:** P1  
**Effort:** Medium  
**Dependencies:** WU-0.2  
**Parallel group:** Layer 2

### Prompt

You are an external API integration specialist. Your task is to build a weather API client with caching.

**Acceptance Criteria (Validation):**

- Fetches historical weather data for (location, date) pairs
- Caches results in `weather_data` table; never re-fetches same pair
- Forecast data refreshed once per day per location
- Cache hit returns data from Postgres in <100ms
- Returns temperature, conditions (rain/snow/clear), precipitation amount
- Graceful error handling (API errors don't crash; log and return partial data)
- Respects OpenWeatherMap rate limits
- `npm run build` succeeds

**Files to Create:**

1. `lib/weather/client.ts` -- Weather API client:
   - Function: `getHistoricalWeather(locationId: uuid, date: Date): Promise<WeatherData>`
   - Function: `getForecast(locationId: uuid): Promise<WeatherData[]>` (next 7 days)
   - Caching logic: check `weather_data` table before calling API
   - For historical: only fetch once (UNIQUE constraint on location_id, date)
   - For forecast: fetch once per day (check `cached_at`)
   - Return format: `{ temperature, conditions, precipitation, cachedAt }`

2. `app/api/weather/[location]/route.ts` -- Weather endpoint:
   - GET endpoint
   - Accept `location` param (location ID)
   - Call `getHistoricalWeather` or `getForecast` based on query params
   - Return JSON with weather data

**Tests:**

Create `tests/unit/weather-client.test.ts`:

- Test: Cache hit returns stored data (mock DB, no API call)
- Test: Cache miss calls API and stores result (mock API)
- Test: API error handled gracefully (log, return null or partial data)
- Test: Forecast refresh logic (only once per day)
- Test: Date parsing and timezone handling

**Notes:**

- Use OpenWeatherMap API (free tier: 60 calls/min, historical data available via "One Call API")
- Cache strategy: Always check DB first; if hit and fresh, return; if miss or stale, call API, store, return
- Historical weather: UNIQUE constraint prevents duplicate API calls
- Forecast: Check `cached_at`; if >24 hours old, refresh
- Error handling: Log failures, return `{ temperature: null, conditions: 'Unknown', precipitation: null }` to caller
- Weather data injected into LLM context (WU-3.2) to inform recommendations

---

#### WU-3.5: Places (Donation Intelligence) Integration

**Status:** [ ] Pending | [ ] In Progress | [ ] Complete | [ ] Failed

**Priority:** P1  
**Effort:** Medium  
**Dependencies:** WU-0.2  
**Parallel group:** Layer 2

### Prompt

You are an external API integration specialist. Your task is to build a Google Places API client for discovering local food banks and donation opportunities.

**Acceptance Criteria (Validation):**

- Searches for "food bank", "soup kitchen", "food pantry" near location's ZIP code
- Returns org name, address, phone, hours, types (what they accept)
- Cache TTL: 30 days per location; checks `cached_at` before re-fetching
- Typically 2-3 API calls per month per location (efficient)
- Results stored in `places_cache` table
- Graceful error handling (API errors don't crash)
- `npm run build` succeeds

**Files to Create:**

1. `lib/places/client.ts` -- Google Places API client:
   - Function: `getDonationOpportunities(locationId: uuid, zipCode: string): Promise<Place[]>`
   - Caching logic: check `places_cache` for cached_at > 30 days ago
   - If cached and fresh, return cached results
   - If stale or missing, call Google Places API, store, return
   - Search queries: "food bank", "soup kitchen", "food pantry"
   - Return format: `{ orgName, address, phone, hours, types }`

2. `app/api/places/[location]/route.ts` -- Places endpoint:
   - GET endpoint
   - Accept `location` param (location ID)
   - Call `getDonationOpportunities`
   - Return JSON with places data

**Tests:**

Create `tests/unit/places-client.test.ts`:

- Test: Cache hit returns stored data (mock DB)
- Test: Cache miss calls API and stores (mock API)
- Test: Cache expiry triggers refresh (30-day TTL)
- Test: API error handled gracefully

**Notes:**

- Google Places API: nearby search with text search queries
- ZIP code search can be via "place" parameter or geocoding to lat/lon first
- Cache TTL: Store `cached_at` timestamp; re-fetch if `now() - cached_at > 30 days`
- Error handling: Log failures, return empty array to caller (no donation options available)
- Places data injected into LLM context (WU-3.2) to inform donation recommendations

---

#### WU-4.3: CSV Test Data Generator

**Status:** [ ] Pending | [ ] In Progress | [ ] Complete | [ ] Failed

**Priority:** P1  
**Effort:** Small  
**Dependencies:** None  
**Parallel group:** Layer 2

### Prompt

You are a test data generation specialist. Your task is to build a script for generating realistic sample CSV files for testing and QA.

**Acceptance Criteria (Validation):**

- Script accepts parameters: `--records` (count), `--start-date`, `--end-date`, `--type` (transactions|inventory|invoices)
- Generates realistic restaurant data (menu items, prices, quantities)
- No PII or sensitive data
- Output CSV is valid and parseable by WU-2.2 parser
- Documented in README or script `--help`
- `npm run build` succeeds

**Files to Create:**

1. `scripts/generate-test-csv.ts` -- CLI script:
   - CLI arguments: `--records 100 --start-date 2024-01-01 --end-date 2024-03-31 --type transactions`
   - Generate realistic transaction data (date, item name, qty, revenue, cost)
   - Menu items: realistic restaurant items (Burger, Fries, Salad, Coffee, etc.)
   - Quantities: random 1-50
   - Revenue: realistic prices ($5-$25)
   - Cost: 30-50% of revenue
   - Output: CSV to stdout or file
   - Help: `--help` displays usage

2. `tests/fixtures/sample-transactions.csv` -- Pre-generated fixture
3. `tests/fixtures/sample-inventory.csv` -- Pre-generated fixture
4. `tests/fixtures/sample-vendor-invoices.csv` -- Pre-generated fixture

**Tests:**

Create `tests/unit/generate-test-csv.test.ts`:

- Test: Generated CSV is valid (parseable by parser from WU-2.2)
- Test: Correct number of records
- Test: Date range respected (all dates in range)
- Test: All required columns present
- Test: Data types correct (dates are dates, numbers are numbers)

**Notes:**

- Script can be run via `npm run generate:test-csv -- --records 500 --type transactions`
- Pre-generated fixtures in `tests/fixtures/` should have 100-200 records for quick testing
- Consider using a library like `faker` for realistic data generation

---

### Phase 4: AI & Chat (Layer 3) -- Three Parallel

---

#### WU-3.2: Chatbot API & Streaming

**Status:** [ ] Pending | [ ] In Progress | [ ] Complete | [ ] Failed

**Priority:** P0  
**Effort:** Large  
**Dependencies:** WU-3.1, WU-2.1, WU-3.4, WU-3.5  
**Parallel group:** Phase 4

### Prompt

You are an LLM streaming specialist. Your task is to build conversation and message endpoints with streaming LLM responses.

**Acceptance Criteria (Validation):**

- Creating a conversation sets default model (budget tier) and associates with location
- Sending a message: (1) Persists user message, (2) builds context, (3) calls LLM with streaming, (4) persists assistant response with token counts
- Conversation history returns messages in chronological order
- Auth check: users only access their own location's conversations
- Model selection: user can specify model per conversation
- If data insufficient to answer, LLM should say so (enforced via system prompt)
- Token usage tracked per message
- `npm run build` succeeds

**Files to Create:**

1. `app/api/conversations/route.ts` -- Conversation CRUD:
   - POST: Create conversation
     - Accept: `{ locationId, modelId? }`
     - Create conversation record with default model if not specified
     - Return: `{ id, locationId, modelId, createdAt }`
   - GET: List conversations for user's locations
     - Return all conversations the user has access to

2. `app/api/conversations/[id]/message/route.ts` -- Send message and stream response:
   - POST: Send message
     - Accept: `{ conversationId, message }`
     - Persist user message to DB
     - Build context: transaction summary, weather, places data
     - Call LLM via Vercel AI SDK with streaming
     - Stream response tokens to client
     - After stream completes, persist assistant message with `model_used`, `tokens_in`, `tokens_out`
     - Return streamed response
   - Context builder function:
     - Query recent transactions for location (last 30 days)
     - Query weather data for location
     - Query donation opportunities (places cache)
     - Format as: "Here's your data: [transaction summary] [weather] [donation opportunities]"

3. `app/api/conversations/[id]/history/route.ts` -- Load conversation history:
   - GET: Return all messages for conversation
   - Accept `conversationId` from URL
   - Return messages in chronological order: `[{ id, role, content, modelUsed, tokensIn, tokensOut, createdAt }, ...]`
   - Auth check: verify user owns conversation

**Tests:**

Create `tests/unit/conversation-api.test.ts`:

- Test: Create conversation (valid location, default model set)
- Test: Create conversation with invalid location (return 404)
- Test: Get conversation history (returns messages chronologically)
- Test: Auth check: User A cannot access User B's conversation (403)
- Test: Context builder produces expected format with transaction + weather + places data

Create `tests/e2e/chat.spec.ts`:

- Test: Create conversation, send message, receive streaming response
- Test: Conversation history persists across page reloads
- Test: Model selector works (conversation uses selected model)
- Test: Multiple messages in conversation all appear in history

**Notes:**

- Streaming: Use Vercel AI SDK's `streamText()` or similar for streaming response
- Context injection: Use WU-3.1's system prompt builder to inject context
- Token counting: Vercel AI SDK should provide token counts in response object
- Error handling: If LLM fails, surface error to user (don't persist partial response)
- Conversation history: Ordered by `created_at` ASC for natural conversation flow

---

#### WU-3.3: Chat UI

**Status:** [ ] Pending | [ ] In Progress | [ ] Complete | [ ] Failed

**Priority:** P0  
**Effort:** Large  
**Dependencies:** WU-0.3, WU-3.2  
**Parallel group:** Phase 4

### Prompt

You are a React UI specialist. Your task is to build the chat interface using Vercel AI SDK's `useChat` hook.

**Acceptance Criteria (Validation):**

- Conversation list shows all conversations for selected location
- "New conversation" button creates conversation and navigates to it
- Chat input sends message, shows streaming response in real-time
- Model selector shows tier with cost/quality labels
- Mid-tier model selection shows cost warning
- Messages render markdown (bold, lists, tables, code blocks)
- Scroll-to-bottom on new message
- Loading/disabled states while waiting for response
- Empty state when no conversations exist
- `npm run build` succeeds

**Files to Create:**

1. `components/chat/conversation-list.tsx` -- Conversation list:
   - List all conversations for current location
   - Each item: conversation name (or "Chat from [date]"), delete button, click to navigate
   - "New conversation" button
   - Empty state: "No conversations yet. Start one!"

2. `components/chat/chat-interface.tsx` -- Main chat component:
   - Uses Vercel AI SDK's `useChat()` hook
   - Message thread: user messages (right-aligned), assistant messages (left-aligned)
   - Input box at bottom: text input, send button
   - Loading state: "Thinking..." or spinner while waiting for response
   - Scroll to bottom on new message
   - Model selector (see component below)

3. `components/chat/model-selector.tsx` -- Model selection dropdown:
   - Show budget and mid-tier models with tier labels
   - Display cost estimate per message (based on expected token usage)
   - Mid-tier: show warning "This model costs more"
   - Selected model persists to conversation
   - Dropdown or toggle switch UI

4. `components/chat/message-bubble.tsx` -- Individual message:
   - User message: bubble with background color, right-aligned
   - Assistant message: bubble, left-aligned, markdown rendering
   - Timestamp (optional)
   - Show model name for assistant messages

5. `components/chat/markdown-renderer.tsx` -- Markdown rendering:
   - Use a library like `react-markdown` with plugins for tables, code highlighting
   - Support: bold, italic, lists, code blocks, tables, links

**Files to Modify:**

1. `app/(app)/conversations/page.tsx` -- Render conversation list:
   - Fetch conversations for current location
   - Render ConversationList component
   - Handle "New conversation" click

2. `app/(app)/conversations/[id]/page.tsx` -- Render chat interface:
   - Fetch conversation and history
   - Render ChatInterface component
   - Pass conversationId and initial messages

**Tests:** Covered by WU-3.2 E2E tests.

**Notes:**

- `useChat()` hook from Vercel AI SDK handles message management, streaming, error handling
- Model selector should update conversation in DB and subsequent messages use new model
- Empty state in conversation list: prompt user to create first conversation
- Markdown rendering: use `react-markdown` + `remark-gfm` for GitHub Flavored Markdown support
- Scroll behavior: use `useEffect` with ref to scroll to bottom after new messages

---

### Phase 5: Dashboard & Polish (Layer 4) -- Four Parallel

---

#### WU-4.1: Dashboard Page

**Status:** [ ] Pending | [ ] In Progress | [ ] Complete | [ ] Failed

**Priority:** P1  
**Effort:** Medium  
**Dependencies:** WU-2.1, WU-2.2, WU-2.4  
**Parallel group:** Phase 5

### Prompt

You are a React dashboard specialist. Your task is to build a minimal dashboard showing import status and location overview.

**Acceptance Criteria (Validation):**

- Shows each location with name, type, transaction count
- Shows import status: connected POS accounts, recent CSV uploads with status badges
- Quick action links navigate to correct pages
- Empty state when no locations exist (prompts user to create one)
- Data loads correctly for authenticated user only
- `npm run build` succeeds

**Files to Create:**

1. `components/dashboard/import-status-card.tsx` -- Import status:
   - List recent CSV uploads with status (pending, mapping, importing, complete, error)
   - Show connected Square accounts with connection status
   - Status badges with colors (green=synced, yellow=syncing, red=error)

2. `components/dashboard/location-overview-card.tsx` -- Location overview:
   - For each location: name, type (restaurant/food_truck), transaction count
   - Links to conversation and import pages for each location

3. `components/dashboard/quick-actions-card.tsx` -- Quick actions:
   - Links: "Import Data", "Start Conversation", "Manage Settings"
   - Buttons or card layout

**Files to Modify:**

1. `app/(app)/dashboard/page.tsx` -- Replace placeholder:
   - Render dashboard cards
   - Fetch locations, transactions, CSV uploads, conversations for current user
   - Handle loading and error states

**Tests:**

Create `tests/e2e/dashboard.spec.ts`:

- Test: Dashboard loads for authenticated user
- Test: Shows location info and transaction count
- Test: Quick action links work (navigate to correct pages)
- Test: Empty state renders when no locations

**Notes:**

- Dashboard should be read-only (no editing)
- Use data from Zero sync provider (WU-4.2) for real-time updates
- Transaction count can be approximate (no need for exact count on every page load)

---

#### WU-4.2: Zero Sync Integration

**Status:** [ ] Pending | [ ] In Progress | [ ] Complete | [ ] Failed

**Priority:** P1  
**Effort:** Large  
**Dependencies:** WU-0.1, WU-3.2  
**Parallel group:** Phase 5

### Prompt

You are a sync infrastructure specialist. Your task is to integrate Zero (Rocicorp) for client-side real-time sync.

**Acceptance Criteria (Validation):**

- Zero cache server connects to Postgres and creates read-only replica
- Client-side queries resolve from local cache (<100ms)
- New messages appear instantly in chat without polling
- Dashboard data updates reactively when imports complete
- Row-level security: users only see their own data
- Zero client initializes only for authenticated users
- Graceful fallback if Zero cache server is unavailable
- `npm run build` succeeds

**Files to Create:**

1. `providers/zero-provider.tsx` -- Zero sync provider:
   - Initialize Zero client in `useEffect` (client-side only)
   - Connect to local Zero cache server (port 8001)
   - Wrap app with Zero provider
   - Pass session/auth context to Zero for row-level security

2. `lib/zero/schema.ts` -- ZQL query definitions:
   - Define queryable tables: conversations, messages, locations, transactions
   - Define relationships and indexes
   - ZQL syntax for Rocicorp Zero

3. `lib/zero/permissions.ts` -- Row-level security rules:
   - Users can only query their own locations
   - Users can only query conversations for their locations
   - Implement via Zero's permission model

**Files to Modify:**

1. `app/(app)/layout.tsx` -- Wrap with ZeroProvider:
   - Render `<ZeroProvider>{children}</ZeroProvider>`

2. `components/chat/conversation-list.tsx` -- Use ZQL:
   - Replace fetch-based data loading with ZQL query
   - Query: `SELECT * FROM conversations WHERE location_id IN (user's locations)`

3. `components/chat/chat-interface.tsx` -- Use ZQL for messages:
   - Replace fetch-based history with ZQL query
   - Query: `SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at`

4. `components/dashboard/*` -- Use ZQL for dashboard data:
   - Query locations, transactions, imports, conversations via ZQL

5. `docker-compose.yml` -- Ensure Zero cache server container:
   - Should already be defined in WU-0.1
   - Verify `ZERO_UPSTREAM_DB` points to Postgres

**Tests:**

Create `tests/unit/zero-permissions.test.ts`:

- Test: User A cannot query User B's locations
- Test: User A cannot query User B's conversations
- Test: User queries only return their own data

Create `tests/e2e/sync.spec.ts` (if feasible):

- Test: Send message, verify appears without page reload
- Test: Create data via API, verify dashboard updates reactively

**Notes:**

- Zero is optional; graceful fallback to REST API if unavailable
- Zero documentation: https://zero.rocicorp.dev/docs
- Row-level security: Implement via Zero's `SELECT` statement filter or role-based rules
- Client-side queries extremely fast (<100ms) due to local caching

---

#### WU-5.1: PostHog Event Tracking Expansion

**Status:** [ ] Pending | [ ] In Progress | [ ] Complete | [ ] Failed

**Priority:** P2  
**Effort:** Small  
**Dependencies:** WU-1.1, WU-2.2, WU-3.3  
**Parallel group:** Phase 5

### Prompt

You are an analytics instrumentation specialist. Your task to add PostHog event tracking across the user journey.

**Acceptance Criteria (Validation):**

- Events fire only in production (NODE_ENV check)
- Events include relevant properties (location type, model selected, etc.)
- No PII in event properties (no email, no message content)
- `npm run build` succeeds

**Events to Track:**

- `user-signed-up` -- Post signup completion, properties: {} (no PII)
- `user-logged-in` -- Post login, properties: {}
- `csv-upload-started` -- CSV file selected, properties: { fileSize, fileName }
- `csv-upload-completed` -- CSV successfully uploaded, properties: { rowCount }
- `square-connected` -- Square OAuth completed, properties: {}
- `first-question-asked` -- First message sent in chat, properties: { modelId, tier }
- `conversation-started` -- New conversation created, properties: { locationId (hashed) }
- `location-created` -- New location created, properties: { type (restaurant|food_truck) }

**Files to Modify:**

- `components/auth/signup-form.tsx` -- Add event after signup
- `components/auth/login-form.tsx` -- Add event after login
- `components/import/csv-upload.tsx` -- Add events (start, complete)
- `components/import/square-connect.tsx` -- Add event after connect
- `components/chat/chat-interface.tsx` -- Add event on first message
- `app/(app)/conversations/page.tsx` -- Add event on "New conversation"
- `components/settings/location-form.tsx` -- Add event after create

**Tests:** Manual verification in PostHog dashboard (no automated tests required).

**Notes:**

- Use `posthog.capture()` from PostHog client
- Events should be non-blocking (don't wait for PostHog response)
- No sensitive data: no email, no message content, no API keys, no location addresses
- Location hashing: hash location ID to pseudonymous identifier for privacy

---

#### WU-5.2: Error Handling & Loading States

**Status:** [ ] Pending | [ ] In Progress | [ ] Complete | [ ] Failed

**Priority:** P1  
**Effort:** Medium  
**Dependencies:** All routes and pages existing  
**Parallel group:** Phase 5

### Prompt

You are a UX engineer. Your task is to add consistent error boundaries, loading skeletons, and error states across all pages.

**Acceptance Criteria (Validation):**

- Unhandled errors caught by error boundary, show user-friendly message
- Loading states shown while data fetches (skeleton loaders)
- API errors return consistent JSON format with appropriate HTTP status codes
- No raw error messages exposed to users (no stack traces, no SQL errors)
- `npm run build` succeeds

**Files to Create:**

1. `app/(app)/error.tsx` -- Error boundary for app routes:
   - Catch unhandled errors
   - Display user-friendly error message
   - Offer retry button and link to dashboard

2. `app/(app)/loading.tsx` -- Loading skeleton for app routes:
   - Render placeholder UI while page loads (skeleton loaders)
   - Matches layout of actual page for visual continuity

3. `components/ui/error-message.tsx` -- Reusable error display:
   - Props: error message, optional retry callback
   - Styled with Tailwind, icon + message

4. `components/ui/loading-skeleton.tsx` -- Reusable skeleton loader:
   - Use shadcn Skeleton component or custom CSS
   - Supports various shapes: lines, cards, list items

**Files to Modify:**

- All page components -- Add loading and error states
  - Use `Suspense` for loading boundaries
  - Use error boundary for error handling
- All API routes -- Return consistent error JSON:
  ```json
  { "error": "User-friendly message", "code": "ERROR_CODE" }
  ```

  - 400 for validation errors
  - 401 for auth errors
  - 403 for permission errors
  - 404 for not found
  - 500 for server errors

**Tests:**

Create `tests/e2e/error-handling.spec.ts`:

- Test: API returns 401 for unauthenticated requests
- Test: API returns 404 for non-existent resources
- Test: Error boundary renders for broken pages
- Test: Loading skeleton renders while page loads

**Notes:**

- Error boundaries: use React's `<ErrorBoundary>` from `react-error-boundary` or Next.js 13+ built-in
- Loading states: use `Suspense` with `loading.tsx` or component-level skeleton loaders
- API errors: never expose stack traces or internal error details to client

---

### Phase 6: Final (Layer 5)

---

#### WU-5.3: Update AGENTS.md

**Status:** [ ] Pending | [ ] In Progress | [ ] Complete | [ ] Failed

**Priority:** P2  
**Effort:** Small  
**Dependencies:** All features complete  
**Parallel group:** Sequential (final task)

### Prompt

You are a technical documentation specialist. Your task is to update AGENTS.md to reflect the new monolith structure.

**Acceptance Criteria (Validation):**

- Documents all new routes (marketing, auth, app)
- Documents all new npm scripts (db:\*, test, test:e2e)
- Documents docker-compose dev workflow
- Documents env vars needed
- Documents key architectural decisions (Better Auth, Drizzle, Vercel AI SDK, Zero)
- Preserves existing PostHog and Next.js config notes
- Clear quick reference table for common tasks

**Files to Modify:**

1. `AGENTS.md` -- Replace with new comprehensive guide:
   - Overview of monolith structure
   - Quick reference table (commands, routes, files)
   - Architecture section (auth, database, sync, LLM)
   - Development workflow (docker-compose, migrations, testing)
   - Environment variables (complete list)
   - Deployment notes (same as before, but updated for monolith)
   - Important constraints and don'ts

**Notes:**

- Preserve all existing PostHog config notes
- Preserve all existing favicon and Next.js config notes
- Add new sections for authentication, database migrations, testing
- Provide examples of common development tasks

---

## Dependency Graph

```
Layer 0 (Parallel):
  ✅ WU-0.1 (Scaffolding)      [0 dependencies]
  ✅ WU-0.2 (DB Schema)        [depends: WU-0.1]
  ✅ WU-0.3 (Route Groups)     [depends: WU-0.1]

Layer 1 (Parallel):
  ✅ WU-1.1 (Better Auth)      [depends: WU-0.1, WU-0.2, WU-0.3]
  ✅ WU-1.2 (Auth UI)          [depends: WU-0.3, WU-1.1]

Layer 2 (Parallel Groups):
  Phase 3A (All parallel):
    ✅ WU-2.1 (Location CRUD)   [depends: WU-1.1]
    ✅ WU-2.2 (CSV Upload)      [depends: WU-0.2]
    ✅ WU-2.4 (Square OAuth)    [depends: WU-1.1, WU-0.2]
    ✅ WU-3.1 (LLM Config)      [depends: WU-0.1]
    ✅ WU-3.4 (Weather)         [depends: WU-0.2]
    ✅ WU-3.5 (Places)          [depends: WU-0.2]
    ✅ WU-4.3 (Test Data Gen)   [depends: none]

  Phase 3B (Depends on 3A):
    ✅ WU-2.3 (CSV Field Map)   [depends: WU-2.2, WU-3.1]
    ✅ WU-3.2 (Chatbot API)     [depends: WU-3.1, WU-2.1, WU-3.4, WU-3.5]
    ✅ WU-3.3 (Chat UI)         [depends: WU-0.3, WU-3.2]

Layer 3 (Parallel):
  ✅ WU-4.1 (Dashboard)        [depends: WU-2.1, WU-2.2, WU-2.4]
  ✅ WU-4.2 (Zero Sync)        [depends: WU-0.1, WU-3.2]
  ✅ WU-5.1 (PostHog Events)   [depends: WU-1.1, WU-2.2, WU-3.3]
  ✅ WU-5.2 (Error Handling)   [depends: all routes existing]

Layer 4 (Sequential):
  ✅ WU-5.3 (Update AGENTS.md) [depends: WU-5.2]
```

---

**Document prepared:** 2026-04-10  
**Format:** OpenCode Task tool orchestration  
**Ready for:** LLM agent dispatcher (one agent per WU)  
**Status:** Complete and ready for execution
