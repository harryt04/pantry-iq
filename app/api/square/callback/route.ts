import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createSquareClient } from '@/lib/square/client'
import { encrypt } from '@/lib/square/encryption'
import { triggerBackgroundSync } from '@/lib/square/sync'
import { db } from '@/db'
import { posConnections, locations } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { logErrorSafely } from '@/lib/api-error'

/**
 * GET /api/square/callback
 * OAuth callback handler with CSRF and authorization validation
 *
 * Query params:
 * - code: Authorization code from Square
 * - state: State parameter for CSRF validation
 * - location_id: Location ID to link to (optional in query, derived from state context)
 *
 * Security validation:
 * - Verify user is authenticated (session required)
 * - Validate state parameter against HttpOnly cookie
 * - Verify user owns the location before linking
 *
 * Flow:
 * 1. Validate user authentication
 * 2. Validate CSRF state from cookie
 * 3. Exchange code for access/refresh tokens
 * 4. Verify location ownership
 * 5. Store encrypted tokens in pos_connections table
 * 6. Trigger background sync
 * 7. Redirect to import page with success
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate user
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user) {
      return NextResponse.redirect(
        new URL('/import?error=not_authenticated', request.nextUrl.origin),
      )
    }

    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const locationId = searchParams.get('location_id') || ''

    // 2. Validate required parameters
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

    if (!locationId) {
      return NextResponse.redirect(
        new URL('/import?error=missing_location_id', request.nextUrl.origin),
      )
    }

    // 3. Validate CSRF state against HttpOnly cookie
    const cookieState = request.cookies.get('square_oauth_state')?.value
    if (!cookieState || cookieState !== state) {
      console.error('CSRF state validation failed', {
        expected: cookieState ? 'present but mismatch' : 'missing',
        received: state ? 'present' : 'missing',
      })
      return NextResponse.redirect(
        new URL(
          '/import?error=invalid_state_parameter',
          request.nextUrl.origin,
        ),
      )
    }

    // 4. Verify user owns the location before linking
    const location = await db
      .select()
      .from(locations)
      .where(eq(locations.id, locationId))
      .limit(1)

    if (!location.length || location[0].userId !== session.user.id) {
      console.error('Location ownership verification failed', {
        locationId,
        userId: session.user.id,
      })
      return NextResponse.redirect(
        new URL('/import?error=unauthorized_location', request.nextUrl.origin),
      )
    }

    // 5. Exchange code for tokens
    const squareClient = createSquareClient()
    const tokenResponse = await squareClient.exchangeCodeForToken(code)

    // 6. Encrypt tokens before storing
    const encryptedAccessToken = encrypt(tokenResponse.access_token)
    const encryptedRefreshToken = tokenResponse.refresh_token
      ? encrypt(tokenResponse.refresh_token)
      : null

    // 7. Store in database
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

    // 8. Trigger background sync asynchronously
    if (connectionId) {
      triggerBackgroundSync(connectionId).catch((err) => {
        console.error(
          `Background sync failed for connection ${connectionId}:`,
          err,
        )
      })
    }

    // 9. Clear state cookie after successful validation
    const response = NextResponse.redirect(
      new URL(
        `/import?square_connected=true&connection_id=${connectionId}`,
        request.nextUrl.origin,
      ),
    )
    response.cookies.delete('square_oauth_state')

    return response
  } catch (error) {
    const message = logErrorSafely(error, 'GET /api/square/callback')

    const errorMessage = encodeURIComponent(message)
    return NextResponse.redirect(
      new URL(
        `/import?error=square_connection_failed&details=${errorMessage}`,
        request.nextUrl.origin,
      ),
    )
  }
}
