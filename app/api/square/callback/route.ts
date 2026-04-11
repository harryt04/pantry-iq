import { NextRequest, NextResponse } from 'next/server'
import { createSquareClient } from '@/lib/square/client'
import { encrypt } from '@/lib/square/encryption'
import { triggerBackgroundSync } from '@/lib/square/sync'
import { db } from '@/db'
import { posConnections } from '@/db/schema'

/**
 * GET /api/square/callback
 * OAuth callback handler
 *
 * Query params:
 * - code: Authorization code from Square
 * - state: State parameter for CSRF validation
 *
 * Flow:
 * 1. Validate state parameter
 * 2. Exchange code for access/refresh tokens
 * 3. Store encrypted tokens in pos_connections table
 * 4. Trigger background sync
 * 5. Redirect to import page with success
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const locationId = searchParams.get('location_id') || ''

    // Validate required parameters
    if (!code) {
      return NextResponse.redirect(
        new URL(
          '/import?error=missing_authorization_code',
          request.nextUrl.origin,
        ),
      )
    }

    if (!state) {
      return NextResponse.redirect(
        new URL(
          '/import?error=missing_state_parameter',
          request.nextUrl.origin,
        ),
      )
    }

    // TODO: In production, validate state against session store
    // For now, we accept it (simplified for MVP)

    // Exchange code for tokens
    const squareClient = createSquareClient()
    const tokenResponse = await squareClient.exchangeCodeForToken(code)

    // Encrypt tokens before storing
    const encryptedAccessToken = encrypt(tokenResponse.access_token)
    const encryptedRefreshToken = tokenResponse.refresh_token
      ? encrypt(tokenResponse.refresh_token)
      : null

    // Store in database
    const connection = await db
      .insert(posConnections)
      .values({
        locationId,
        provider: 'square',
        oauthToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        syncState: 'pending',
      })
      .returning()

    const connectionId = connection[0]?.id

    // Trigger background sync asynchronously
    if (connectionId) {
      triggerBackgroundSync(connectionId).catch((err) => {
        console.error(
          `Background sync failed for connection ${connectionId}:`,
          err,
        )
      })
    }

    // Redirect to import page with success message
    return NextResponse.redirect(
      new URL(
        `/import?square_connected=true&connection_id=${connectionId}`,
        request.nextUrl.origin,
      ),
    )
  } catch (error) {
    console.error('Square callback error:', error)

    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.redirect(
      new URL(
        `/import?error=square_connection_failed&details=${encodeURIComponent(errorMessage)}`,
        request.nextUrl.origin,
      ),
    )
  }
}
