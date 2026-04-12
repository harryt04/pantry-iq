import { NextRequest, NextResponse } from 'next/server'
import { getPostHogClient } from '@/lib/posthog-server'
import { ApiError, logErrorSafely } from '@/lib/api-error'

export async function POST(request: NextRequest) {
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

    // Identify user and capture event on server side (if PostHog is configured)
    const posthog = getPostHogClient()
    if (posthog) {
      posthog.identify({
        distinctId: email,
        properties: {
          email,
        },
      })

      posthog.capture({
        distinctId: email,
        event: 'launch-signup',
        properties: {
          email,
          source: 'api',
        },
      })
      await posthog.shutdown()
    }

    // Forward to the external API
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
