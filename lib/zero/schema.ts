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
    table('csvUploads')
      .columns({
        id: string(),
        locationId: string(),
        filename: string(),
        rowCount: number(),
        status: string(),
        errorMessage: string(),
        createdAt: number(),
        completedAt: number(),
      })
      .primaryKey('id'),
    table('transactions')
      .columns({
        id: string(),
        locationId: string(),
        squareTransactionId: string(),
        amount: number(),
        currency: string(),
        status: string(),
        createdAt: number(),
      })
      .primaryKey('id'),
    table('posConnections')
      .columns({
        id: string(),
        locationId: string(),
        provider: string(),
        externalId: string(),
        status: string(),
        lastSyncedAt: number(),
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

export type Location = any
export type Conversation = any
export type Message = any
export type CsvUpload = any
export type Transaction = any
export type PosConnection = any
