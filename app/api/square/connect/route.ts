import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createSquareClient } from '@/lib/square/client'
import { randomBytes } from 'crypto'
import { db } from '@/db'
import { locations } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { ApiError, logErrorSafely } from '@/lib/api-error'

/**
 * POST /api/square/connect
 * Initiates Square OAuth flow with CSRF protection
 *
 * Request body:
 * - locationId: UUID of the location to connect
 *
 * Security measures:
 * - Validates user is authenticated
 * - Verifies user owns the location
 * - Generates cryptographically secure state token
 * - Persists state in HttpOnly, SameSite cookie (not returned to client)
 *
 * Response:
 * - authURL: URL to redirect user to for OAuth authorization
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

    const { locationId } = await request.json()

    if (!locationId) {
      return ApiError.badRequest(
        'locationId is required',
        'MISSING_LOCATION_ID',
      )
    }

    // 2. Verify user owns the location
    const location = await db
      .select()
      .from(locations)
      .where(eq(locations.id, locationId))
      .limit(1)

    if (!location.length || location[0].userId !== session.user.id) {
      return ApiError.forbidden(
        'You do not have access to this location',
        'ACCESS_DENIED',
      )
    }

    // 3. Generate cryptographically secure CSRF state token
    const state = randomBytes(32).toString('hex')

    // 4. Build OAuth URL
    const squareClient = createSquareClient()
    const authURL = squareClient.buildOAuthURL(state, locationId)

    // 5. Create response with state in HttpOnly, SameSite cookie
    const response = NextResponse.json({ authURL }, { status: 200 })

    // Set HttpOnly, SameSite cookie with state for verification in callback
    // Cookie expires in 10 minutes (600 seconds) - OAuth flow should complete quickly
    response.cookies.set('square_oauth_state', state, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 600, // 10 minutes
      path: '/',
    })

    return response
  } catch (error) {
    const message = logErrorSafely(error, 'POST /api/square/connect')
    return ApiError.internalServerError(message, 'SQUARE_CONNECT_ERROR')
  }
}
