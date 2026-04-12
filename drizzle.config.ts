import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'postgresql',
  schema: './db/schema/index.ts',
  out: './db/migrations',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // Support multiple schemas: append schema name to search_path
  // Default (local dev): uses 'public' schema
  // CI testing: uses 'ci_test' schema (set via DATABASE_SCHEMA env var)
  migrations: {
    table: '__drizzle_migrations__',
    schema: process.env.DATABASE_SCHEMA || 'public',
  },
})
