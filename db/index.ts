import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const schema_name = process.env.DATABASE_SCHEMA || 'public'
const baseUrl = process.env.DATABASE_URL!
const connectionUrl =
  schema_name !== 'public'
    ? `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}options=--search_path%3D${schema_name}`
    : baseUrl

const client = postgres(connectionUrl)
export const db = drizzle(client, { schema })
