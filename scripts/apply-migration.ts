import postgres from 'postgres'
import fs from 'fs'
import path from 'path'

const sql = postgres(process.env.DATABASE_URL!)

async function runMigration() {
  try {
    console.log('Applying migration...')

    // Read the migration file
    const migration = fs.readFileSync(
      path.join(process.cwd(), 'db/migrations/0001_pantry_iq_mvp_schema.sql'),
      'utf-8',
    )

    // Split by semicolon and execute each statement
    const statements = migration.split(';').filter((s) => s.trim())

    for (const statement of statements) {
      console.log('Executing:', statement.trim().substring(0, 60) + '...')
      await sql.unsafe(statement)
    }

    console.log('✓ Migration applied successfully!')
    await sql.end()
    process.exit(0)
  } catch (error) {
    console.error('✗ Error applying migration:', error)
    process.exit(1)
  }
}

runMigration()
