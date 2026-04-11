import postgres from 'postgres'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { drizzle } from 'drizzle-orm/postgres-js'

const sql = postgres(process.env.DATABASE_URL!)

async function runMigration() {
  try {
    console.log('Applying migrations...')

    // Create Drizzle client
    const db = drizzle(sql)

    // Use Drizzle's migration runner to safely apply statements
    // This respects statement breakpoints and handles parsing correctly
    await migrate(db, { migrationsFolder: './db/migrations' })

    console.log('✓ Migrations applied successfully!')
    await sql.end()
    process.exit(0)
  } catch (error) {
    console.error('✗ Error applying migrations:', error)
    process.exit(1)
  }
}

runMigration()
