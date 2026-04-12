#!/usr/bin/env node
/**
 * CI Database Setup Script
 *
 * Prepares PostgreSQL for CI testing by:
 * 1. Creating the 'ci_test' schema if it doesn't exist
 * 2. Dropping and recreating it to ensure clean state
 *
 * Usage:
 *   npx tsx scripts/ci-setup-db.ts
 *
 * Environment variables required:
 *   - DATABASE_URL: PostgreSQL connection string (including database name)
 *   - DATABASE_SCHEMA: Schema name to create/reset (default: 'ci_test')
 */

import { sql } from 'drizzle-orm'
import postgres from 'postgres'

async function setupCiDatabase() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required')
  }

  const schemaName = process.env.DATABASE_SCHEMA || 'ci_test'

  console.log(`Setting up CI database schema: ${schemaName}`)
  console.log(
    `Database URL: ${databaseUrl.replace(/password:[^@]+/, 'password:***')}`,
  )

  // Connect to the database
  const connection = postgres(databaseUrl)

  try {
    // Drop existing schema if it exists (with CASCADE to drop all objects)
    console.log(`Dropping existing schema '${schemaName}' if it exists...`)
    await connection.unsafe(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`)

    // Create the new schema
    console.log(`Creating schema '${schemaName}'...`)
    await connection.unsafe(`CREATE SCHEMA "${schemaName}"`)

    console.log(`✓ Schema '${schemaName}' created successfully`)
  } catch (error) {
    console.error(`✗ Error setting up schema:`, error)
    throw error
  } finally {
    await connection.end()
  }
}

setupCiDatabase().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
