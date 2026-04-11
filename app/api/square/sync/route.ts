import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/db'
import { posConnections, locations } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { SquareSyncManager } from '@/lib/square/sync'
import { createSquareClient } from '@/lib/square/client'
import { ApiError, logErrorSafely } from '@/lib/api-error'

/**
 * POST /api/square/sync
 * Manual trigger for syncing transactions
 *
 * Request body:
 * - connectionId: ID of the pos_connection to sync
 *
 * Security validation:
 * - Verify user is authenticated
 * - Verify user owns the location associated with the connection
 *
 * Response:
 * - synced: Number of transactions synced
 * - errors: Number of errors during sync
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user) {
      return ApiError.unauthorized(
        'Authentication required',
        'NOT_AUTHENTICATED',
      )
    }

    const { connectionId } = await request.json()

    if (!connectionId) {
      return ApiError.badRequest(
        'connectionId is required',
        'MISSING_CONNECTION_ID',
      )
    }

    // 2. Fetch connection from database
    const connections = await db
      .select()
      .from(posConnections)
      .where(eq(posConnections.id, connectionId))
      .limit(1)

    if (!connections.length) {
      return ApiError.notFound('Connection not found', 'CONNECTION_NOT_FOUND')
    }

    const connection = connections[0]

    // 3. Verify user owns the location associated with this connection
    const location = await db
      .select()
      .from(locations)
      .where(eq(locations.id, connection.locationId))
      .limit(1)

    if (!location.length || location[0].userId !== session.user.id) {
      console.error('Location authorization failed for sync', {
        connectionId,
        locationId: connection.locationId,
        userId: session.user.id,
      })
      return ApiError.forbidden(
        'You do not have access to this connection',
        'ACCESS_DENIED',
      )
    }

    // 4. Create sync manager and perform sync
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
    const message = logErrorSafely(error, 'POST /api/square/sync')
    return ApiError.internalServerError(message, 'SQUARE_SYNC_ERROR')
  }
}
