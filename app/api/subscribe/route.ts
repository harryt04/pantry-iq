import { NextRequest, NextResponse } from 'next/server'
import { getPostHogClient } from '@/lib/posthog-server'
import { ApiError, logErrorSafely } from '@/lib/api-error'

export async function POST(request: NextRequest) {
  const posthog = getPostHogClient()

  try {
    let body
    try {
      body = await request.json()
    } catch {
      return ApiError.badRequest('Invalid JSON', 'INVALID_JSON')
    }

    const { email } = body

    if (!email || typeof email !== 'string') {
      return ApiError.badRequest('Email is required', 'MISSING_EMAIL')
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return ApiError.badRequest('Invalid email format', 'INVALID_EMAIL')
    }

    // Identify user on server side
    posthog.identify({
      distinctId: email,
      properties: {
        email,
      },
    })

    // Forward to the external API
    posthog.capture({
      distinctId: email,
      event: 'launch-signup',
      properties: {
        email,
        source: 'api',
      },
    })
    await posthog.shutdown()
    await fetch('https://harryt.dev/api/user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        usesApps: ['pantryiq'],
        status: 'activeCustomer',
      }),
    }).catch(() => {
      // Ignore errors from external call as specified
    })

    return NextResponse.json(
      { message: 'Successfully subscribed!' },
      { status: 200 },
    )
  } catch (error) {
    const message = logErrorSafely(error, 'POST /api/subscribe')
    return ApiError.internalServerError(message, 'SUBSCRIBE_ERROR')
  }
}
