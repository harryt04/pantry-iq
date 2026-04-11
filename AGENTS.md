# PantryIQ – Agent Reference

Full-stack Next.js monolith: marketing (`/`), auth (`/signup`, `/login`), app (`/dashboard`, `/conversations`, `/import`, `/settings`), REST API (`/api/*`).

## Detailed References

- **Zero sync:** `.agents/ZERO.md`
- **Testing:** `.agents/TESTING.md`
- **Error handling:** `.agents/ERROR_HANDLING.md`
- **PostHog analytics:** `.agents/POSTHOG.md`
- **Product spec:** `.agents/spec/PRD-FINAL.md`, `.agents/spec/VISION.md`

## Commands

```bash
npm install && cp .env.sample .env
docker-compose up -d        # PostgreSQL:5432 + Zero:8001
npm run db:migrate
npm run dev                 # http://localhost:3000
npm run build && npm run lint && npm run prettify
npm run test                # unit + e2e
npm run db:generate && npm run db:migrate  # after schema changes
npm run db:studio           # http://localhost:5555
```

## Stack

Next.js 16 (App Router, SSR) · React 19 · TypeScript 5 strict · Tailwind v4 · shadcn/ui
PostgreSQL 18 · Drizzle ORM · Zero sync (Rocicorp) · Better Auth · Vercel AI SDK
Square POS · Google Places · OpenWeatherMap · PostHog

## Routes & API

**App groups:** `(marketing)/` · `(auth)/` · `(app)/`

**API:**
- `POST /api/auth/[...all]` – Better Auth
- `GET|POST /api/locations`, `GET|DELETE /api/locations/[id]`
- `POST /api/conversations`, `GET|POST /api/conversations/[id]`, `POST /api/conversations/[id]/message`, `GET /api/conversations/[id]/history`
- `POST /api/square/connect`, `GET /api/square/callback`, `POST /api/square/sync`
- `POST /api/csv/upload`, `POST /api/csv/field-mapping`
- `GET /api/weather/[location]`, `GET /api/places/[location]`
- `POST /api/subscribe`, `GET /api/dashboard`

## Key Directories

```
app/          Next.js routes
components/   React components
db/schema/    Drizzle schema (edit here, then db:generate + db:migrate)
db/migrations/ Auto-generated SQL
lib/          auth.ts, auth-client.ts, api-error.ts, analytics-utils.ts, ai/, zero/, square/, csv/, places/, weather/
providers/    posthogProvider.tsx
tests/        unit/, e2e/, fixtures/
scripts/      generate-test-csv.ts
```

## Environment Variables

```bash
DATABASE_URL=postgres://postgres:postgres@localhost:5432/pantryiq
ZERO_UPSTREAM_DB=postgres://postgres:postgres@postgres:5432/pantryiq
NEXT_PUBLIC_ZERO_URL=http://localhost:8001
BETTER_AUTH_SECRET=<openssl rand -base64 32>  # min 32 chars, never change after deploy
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3000
OPENAI_API_KEY=        # at least one LLM key required
ANTHROPIC_API_KEY=
GOOGLE_GENERATIVE_AI_API_KEY=
SQUARE_APP_ID=         # optional
SQUARE_APP_SECRET=
SQUARE_ENVIRONMENT=sandbox
OPENWEATHERMAP_API_KEY= # optional
GOOGLE_PLACES_API_KEY=  # optional
ENCRYPTION_KEY=         # optional, falls back to BETTER_AUTH_SECRET
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

## Constraints

- Never remove `skipTrailingSlashRedirect: true` from `next.config.ts` (breaks PostHog)
- Never modify PostHog rewrites (`/ph/*`, `/ingest/*`) without understanding reverse proxy
- Never commit `.env`/`.env.local`
- Never use `db:push` in production
- Never change `BETTER_AUTH_SECRET` after deployment (invalidates all sessions)
- Never expose stack traces, DB credentials, or system paths to API clients

## New API Route Template

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

## New DB Table Template

```typescript
// db/schema/my-table.ts
import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core'
export const myTable = pgTable('my_table', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
})
// then: npm run db:generate && npm run db:migrate
```

## Deployment

Coolify (self-hosted), triggered by push to main. Two-stage Docker build (`npm run docker:build` → `pantryiq:latest`). `dumb-init` for signal handling.
