import { db } from '@/db'
import { posConnections, transactions } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { SquareClient } from './client'
import { decrypt } from './encryption'
import type { PantryIQTransaction } from './types'

/**
 * Sync manager for Square transactions
 */
export class SquareSyncManager {
  private squareClient: SquareClient
  private locationId: string

  constructor(squareClient: SquareClient, locationId: string) {
    this.squareClient = squareClient
    this.locationId = locationId
  }

  /**
   * Perform initial or incremental sync
   */
  async syncTransactions(
    posConnectionId: string,
    encryptedAccessToken: string,
  ): Promise<{ synced: number; errors: number }> {
    try {
      // Decrypt token
      const accessToken = decrypt(encryptedAccessToken)

      // Get last sync time
      const connection = await db
        .select()
        .from(posConnections)
        .where(eq(posConnections.id, posConnectionId))
        .limit(1)

      const lastSync = connection[0]?.lastSync

      // Update sync state to 'syncing'
      await db
        .update(posConnections)
        .set({ syncState: 'syncing' })
        .where(eq(posConnections.id, posConnectionId))

      // Fetch transactions from Square
      const squareTransactions = await this.squareClient.getTransactions(
        accessToken,
        lastSync || undefined,
      )

      // Normalize and insert into DB
      const pantryIQTransactions: PantryIQTransaction[] =
        squareTransactions.map((tx) => ({
          ...tx,
          locationId: this.locationId,
        }))

      let synced = 0
      let errors = 0

      for (const transaction of pantryIQTransactions) {
        try {
          // Check if transaction already exists
          const existing = await db
            .select()
            .from(transactions)
            .where(eq(transactions.sourceId, transaction.sourceId))
            .limit(1)

          if (!existing.length) {
            const dateStr =
              transaction.date instanceof Date
                ? transaction.date.toISOString().split('T')[0]
                : transaction.date
            await db.insert(transactions).values({
              locationId: transaction.locationId,
              date: dateStr,
              item: transaction.item,
              qty: transaction.qty.toString(),
              revenue: transaction.revenue?.toString(),
              cost: transaction.cost?.toString(),
              source: transaction.source,
              sourceId: transaction.sourceId,
            })
            synced++
          }
        } catch (err) {
          errors++
          console.error(
            `Failed to insert transaction ${transaction.sourceId}:`,
            err,
          )
        }
      }

      // Update connection state
      await db
        .update(posConnections)
        .set({
          syncState: 'synced',
          lastSync: new Date(),
        })
        .where(eq(posConnections.id, posConnectionId))

      return { synced, errors }
    } catch (error) {
      // Update connection state to error
      await db
        .update(posConnections)
        .set({ syncState: 'error' })
        .where(eq(posConnections.id, posConnectionId))

      throw error
    }
  }
}

/**
 * Background sync job (to be called by a scheduler)
 */
export async function triggerBackgroundSync(
  posConnectionId: string,
): Promise<void> {
  const connection = await db
    .select()
    .from(posConnections)
    .where(eq(posConnections.id, posConnectionId))
    .limit(1)

  if (!connection.length) {
    throw new Error('Connection not found')
  }

  const conn = connection[0]
  const syncManager = new SquareSyncManager(
    new (require('./client').createSquareClient)(),
    conn.locationId,
  )

  try {
    await syncManager.syncTransactions(posConnectionId, conn.oauthToken)
  } catch (error) {
    console.error(
      `Background sync failed for connection ${posConnectionId}:`,
      error,
    )
    // Don't throw - let scheduler handle retry
  }
}
