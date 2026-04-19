# PostgreSQL Multi-Environment Setup Guide

## Overview

Your project now supports **multiple isolated environments within a single PostgreSQL database** using PostgreSQL schemas. This allows:

- **Local development:** Uses `public` schema
- **CI/GitHub Actions:** Uses `ci_test` schema (isolated, auto-cleaned each run)
- **Production:** Uses `public` schema
- All environments in one PostgreSQL database

## What We Changed

### 1. **drizzle.config.ts** - Schema-aware migrations

Added support for specifying which schema migrations run against:

```typescript
migrations: {
  table: '__drizzle_migrations__',
  schema: process.env.DATABASE_SCHEMA || 'public',
}
```

- Default: `public` schema (for local dev and production)
- Override: Set `DATABASE_SCHEMA` env var (CI sets it to `ci_test`)

### 2. **scripts/ci-setup-db.ts** - New setup script

Before each CI run, this script:
1. Drops the `ci_test` schema if it exists (CASCADE deletes all tables)
2. Creates a fresh, empty `ci_test` schema
3. Logs the operation for debugging

This ensures a **clean test environment** for every GitHub Actions run.

### 3. **.github/workflows/ci.yml** - Updated workflow

Added two steps before migrations:

```yaml
env:
  DATABASE_SCHEMA: ci_test  # CI uses ci_test schema

jobs:
  ci:
    steps:
      - name: Setup CI database schema
        run: npx tsx scripts/ci-setup-db.ts

      - name: Run database migrations
        run: npm run db:migrate  # Uses ci_test schema via DATABASE_SCHEMA env
```

Same setup in the `e2e` job.

### 4. **.env.sample** - Updated documentation

Added detailed comments explaining:
- How PostgreSQL schemas work (like MongoDB databases)
- When to use each schema
- How to set `DATABASE_SCHEMA`

## How It Works

### Local Development (Default)

```bash
npm run dev
```

- Automatically uses `public` schema (default)
- No env var needed
- Data persists locally

### CI Environment

GitHub Actions automatically:

1. Starts PostgreSQL service container
2. Runs: `npx tsx scripts/ci-setup-db.ts`
   - Drops old `ci_test` schema
   - Creates fresh `ci_test` schema
3. Runs: `npm run db:migrate`
   - Creates all tables in `ci_test` schema
4. Runs tests
5. Schema is cleaned up automatically when CI finishes

### Production

```bash
DATABASE_URL=postgres://... npm run build
```

- Uses `public` schema (default)
- Migrations run against production tables

## Environment Variables

### DATABASE_URL (Required)

PostgreSQL connection string. Example:

```bash
# Local dev (Docker Compose)
DATABASE_URL=postgres://postgres:postgres@localhost:5432/pantryiq

# Production (Coolify)
DATABASE_URL=postgres://user:password@db.example.com/pantryiq
```

### DATABASE_SCHEMA (Optional)

PostgreSQL schema to use. Default: `public`

```bash
# Local dev (optional - defaults to public)
DATABASE_SCHEMA=public

# CI (set automatically in workflow)
DATABASE_SCHEMA=ci_test

# Custom override if needed
DATABASE_SCHEMA=staging
```

### Other Environment Variables

The CI workflow also sets:
- `ZERO_UPSTREAM_DB` - Same Postgres for Zero sync
- `BETTER_AUTH_SECRET` - Test secret for CI
- `OPENAI_API_KEY`, etc. - Stubbed values for tests

## Understanding PostgreSQL Schemas

### What is a Schema?

A PostgreSQL schema is like a **namespace** for tables. One database can have multiple independent schemas:

```
PostgreSQL Database: "pantryiq"
├── Schema: "public"      (local dev, production)
│   ├── users
│   ├── locations
│   ├── conversations
│   └── ...
├── Schema: "ci_test"     (GitHub Actions CI)
│   ├── users
│   ├── locations
│   ├── conversations
│   └── ...
└── Schema: "staging"     (optional future use)
    ├── users
    ├── locations
    └── ...
```

Each schema has **independent tables** - data in `public.users` doesn't affect `ci_test.users`.

### Differences from MongoDB

| MongoDB | PostgreSQL |
|---------|------------|
| Database | Database |
| Collection | Table (within a schema) |
| (no concept) | **Schema** = namespace for tables |

MongoDB uses databases to isolate environments. PostgreSQL achieves the same with schemas (lighter weight, easier to manage).

## Testing Locally

To verify the setup works:

### 1. Check local development schema

```bash
npm run dev
# Your app uses public schema
```

### 2. Test CI setup script

```bash
# Make sure Postgres is running (docker-compose up -d)
DATABASE_URL=postgres://postgres:postgres@localhost:5432/pantryiq \
DATABASE_SCHEMA=ci_test \
npx tsx scripts/ci-setup-db.ts

# Should output:
# Setting up CI database schema: ci_test
# Database URL: postgres://postgres:postgres@localhost:5432/pantryiq
# Dropping existing schema 'ci_test' if it exists...
# Creating schema 'ci_test'...
# ✓ Schema 'ci_test' created successfully
```

### 3. Test CI migrations

```bash
DATABASE_URL=postgres://postgres:postgres@localhost:5432/pantryiq \
DATABASE_SCHEMA=ci_test \
npm run db:migrate

# Should run migrations into ci_test schema
```

### 4. Verify in database

```bash
# Connect to local Postgres
psql postgres://postgres:postgres@localhost:5432/pantryiq

# List schemas
\dn
# Output:
#   List of schemas
#       Name    |  Owner
#   -----------+----------
#    public    | postgres
#    ci_test   | postgres

# List tables in public schema
\dt public.*

# List tables in ci_test schema
\dt ci_test.*
```

## How to Use in Future

### Adding Environment Variables to CI

1. Go to GitHub: `Settings > Secrets and variables > Actions`
2. Create new repository secret (e.g., `DATABASE_URL`)
3. Update `.github/workflows/ci.yml` to use it:

```yaml
env:
  DATABASE_URL: ${{ secrets.DATABASE_URL }}  # From GitHub secrets
  DATABASE_SCHEMA: ci_test                   # Hardcoded for CI
```

### Creating Additional Schemas

If you need a `staging` schema later:

```bash
DATABASE_URL=postgres://... \
DATABASE_SCHEMA=staging \
npm run db:migrate
```

### Monitoring Database Usage

In a PostgreSQL client:

```sql
-- See all schemas
SELECT schema_name FROM information_schema.schemata;

-- See size of each schema
SELECT 
  schemaname, 
  pg_size_pretty(pg_total_relation_size('"' || schemaname || '"'))
FROM pg_tables
GROUP BY schemaname;
```

## Deployment Notes

### For Coolify / Production

1. Set `DATABASE_URL` secret to your production Postgres connection
2. Migrations run against `public` schema (default)
3. No need for `DATABASE_SCHEMA` env var (will use default)

### For GitHub Actions CI

- Uses GitHub Actions Postgres service (localhost:5432)
- `DATABASE_SCHEMA=ci_test` set in workflow
- Data is isolated from production
- CI schema is reset on every run

## Troubleshooting

### Migrations fail in CI

Check:
1. Is Postgres service running? (Should auto-start in GitHub Actions)
2. Is `ci-setup-db.ts` running before migrations? (Check workflow)
3. Is `DATABASE_SCHEMA` set to `ci_test`?

```bash
# Debug locally
DATABASE_URL=postgres://postgres:postgres@localhost:5432/pantryiq \
DATABASE_SCHEMA=ci_test \
npx tsx scripts/ci-setup-db.ts && npm run db:migrate
```

### Tables not found in tests

Ensure `DATABASE_SCHEMA` matches:
- Local dev: `DATABASE_SCHEMA=public` (or unset, defaults to public)
- CI: `DATABASE_SCHEMA=ci_test` (set in workflow)

### Can't connect to Postgres

Check connection string:

```bash
# Should connect successfully
psql postgres://postgres:postgres@localhost:5432/pantryiq -c "SELECT 1"
```

## Next Steps

1. **Commit these changes** to your branch
2. **Test locally** using the "Testing Locally" section above
3. **Push to GitHub** and verify CI passes
4. Once comfortable, you can add GitHub Actions secrets for production credentials

All code-level checks (lint, type-check, build, unit tests) already pass. This setup just ensures E2E tests can run with isolated database schemas.
