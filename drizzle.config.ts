import { defineConfig } from 'drizzle-kit'

// When DATABASE_SCHEMA is set, append search_path to the connection URL.
// This ensures all SQL (including migrations) runs in the correct schema.
// Default: 'public' (local dev and production)
// CI: 'ci_test' (set via DATABASE_SCHEMA env var)
const schema = process.env.DATABASE_SCHEMA || 'public'
const baseUrl = process.env.DATABASE_URL!
const dbUrl =
  schema !== 'public'
    ? `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}options=--search_path%3D${schema}`
    : baseUrl

export default defineConfig({
  dialect: 'postgresql',
  schema: './db/schema/index.ts',
  out: './db/migrations',
  dbCredentials: {
    url: dbUrl,
  },
  migrations: {
    table: '__drizzle_migrations__',
    schema,
  },
})
