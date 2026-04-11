import { NextRequest, NextResponse } from 'next/server'
import { createSquareClient } from '@/lib/square/client'
import { randomBytes } from 'crypto'

/**
 * POST /api/square/connect
 * Initiates Square OAuth flow
 *
 * Request body:
 * - locationId: UUID of the location to connect
 *
 * Response:
 * - authURL: URL to redirect user to for OAuth authorization
 * - state: State parameter (should be stored in session)
 */
export async function POST(request: NextRequest) {
  try {
    const { locationId } = await request.json()

    if (!locationId) {
      return NextResponse.json(
        { error: 'locationId is required' },
        { status: 400 },
      )
    }

    // Generate CSRF state token
    const state = randomBytes(32).toString('hex')

    // Store state in session/cookie for verification in callback
    // For now, we'll return it and expect the client to handle it
    // In production, use secure session storage

    const squareClient = createSquareClient()
    const authURL = squareClient.buildOAuthURL(state, locationId)

    return NextResponse.json(
      {
        authURL,
        state,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error('Square connect error:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to initiate OAuth',
      },
      { status: 500 },
    )
  }
}
