import { createSchema, table, string, number } from '@rocicorp/zero'

/**
 * Zero Schema Definition
 *
 * Defines the queryable tables and relationships for the PantryIQ application.
 * All tables are read-only replicas from Postgres, synced by the Zero cache server.
 */

export const schema = createSchema({
  tables: [
    table('locations')
      .columns({
        id: string(),
        userId: string(),
        name: string(),
        timezone: string(),
        address: string(),
        zipCode: string(),
        type: string(),
        createdAt: number(),
      })
      .primaryKey('id'),
    table('conversations')
      .columns({
        id: string(),
        locationId: string(),
        defaultModel: string(),
        createdAt: number(),
      })
      .primaryKey('id'),
    table('messages')
      .columns({
        id: string(),
        conversationId: string(),
        role: string(),
        content: string(),
        modelUsed: string(),
        tokensIn: number(),
        tokensOut: number(),
        createdAt: number(),
      })
      .primaryKey('id'),
    table('csv_uploads')
      .columns({
        id: string(),
        locationId: string(),
        filename: string(),
        rowCount: number(),
        status: string(),
        errorDetails: string(),
        fieldMapping: string(),
        uploadedAt: number(),
      })
      .primaryKey('id'),
    table('transactions')
      .columns({
        id: string(),
        locationId: string(),
        date: string(),
        item: string(),
        qty: number(),
        revenue: number(),
        cost: number(),
        source: string(),
        sourceId: string(),
        createdAt: number(),
      })
      .primaryKey('id'),
    table('pos_connections')
      .columns({
        id: string(),
        locationId: string(),
        provider: string(),
        oauthToken: string(),
        refreshToken: string(),
        syncState: string(),
        lastSync: number(),
        createdAt: number(),
      })
      .primaryKey('id'),
    table('places_cache')
      .columns({
        id: string(),
        locationId: string(),
        orgName: string(),
        address: string(),
        phone: string(),
        hours: string(),
        types: string(),
        cachedAt: number(),
      })
      .primaryKey('id'),
    table('weather')
      .columns({
        id: string(),
        locationId: string(),
        date: string(),
        temperature: number(),
        conditions: string(),
        precipitation: number(),
        cachedAt: number(),
      })
      .primaryKey('id'),
    table('waitlist_signups')
      .columns({
        id: string(),
        email: string(),
        createdAt: number(),
      })
      .primaryKey('id'),
  ],
})

export type Schema = typeof schema

/**
 * Query Types for Type-Safe Queries
 * These help with intellisense and type checking when building queries
 */

export interface Location {
  id: string
  userId: string
  name: string
  timezone: string
  address: string
  zipCode: string
  type: string
  createdAt: number
}

export interface Conversation {
  id: string
  locationId: string
  defaultModel: string
  createdAt: number
}

export interface Message {
  id: string
  conversationId: string
  role: string
  content: string
  modelUsed: string
  tokensIn: number
  tokensOut: number
  createdAt: number
}

export interface CsvUpload {
  id: string
  locationId: string
  filename: string
  rowCount: number
  status: string
  errorDetails: string
  fieldMapping: string
  uploadedAt: number
}

export interface Transaction {
  id: string
  locationId: string
  date: string
  item: string
  qty: number
  revenue: number
  cost: number
  source: string
  sourceId: string
  createdAt: number
}

export interface PosConnection {
  id: string
  locationId: string
  provider: string
  oauthToken: string
  refreshToken: string
  syncState: string
  lastSync: number
  createdAt: number
}

export interface PlacesCache {
  id: string
  locationId: string
  orgName: string
  address: string
  phone: string
  hours: string
  types: string
  cachedAt: number
}

export interface Weather {
  id: string
  locationId: string
  date: string
  temperature: number
  conditions: string
  precipitation: number
  cachedAt: number
}

export interface WaitlistSignup {
  id: string
  email: string
  createdAt: number
}
