import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { posConnections } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { SquareSyncManager } from '@/lib/square/sync'
import { createSquareClient } from '@/lib/square/client'

/**
 * POST /api/square/sync
 * Manual trigger for syncing transactions
 *
 * Request body:
 * - connectionId: ID of the pos_connection to sync
 *
 * Response:
 * - synced: Number of transactions synced
 * - errors: Number of errors during sync
 */
export async function POST(request: NextRequest) {
  try {
    const { connectionId } = await request.json()

    if (!connectionId) {
      return NextResponse.json(
        { error: 'connectionId is required' },
        { status: 400 },
      )
    }

    // Fetch connection from database
    const connections = await db
      .select()
      .from(posConnections)
      .where(eq(posConnections.id, connectionId))
      .limit(1)

    if (!connections.length) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 },
      )
    }

    const connection = connections[0]

    // Create sync manager and perform sync
    const squareClient = createSquareClient()
    const syncManager = new SquareSyncManager(
      squareClient,
      connection.locationId,
    )

    const result = await syncManager.syncTransactions(
      connectionId,
      connection.oauthToken,
    )

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error('Square sync error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Sync failed',
      },
      { status: 500 },
    )
  }
}
