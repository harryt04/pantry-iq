import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/db'
import { locations } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { ApiError, logErrorSafely } from '@/lib/api-error'

// GET /api/locations - List all locations for current user
export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    })

    if (!session?.user) {
      return ApiError.unauthorized(
        'Authentication required',
        'NOT_AUTHENTICATED',
      )
    }

    const userLocations = await db
      .select()
      .from(locations)
      .where(eq(locations.userId, session.user.id))

    return NextResponse.json(userLocations, { status: 200 })
  } catch (error) {
    const message = logErrorSafely(error, 'GET /api/locations')
    return ApiError.internalServerError(message, 'FETCH_LOCATIONS_ERROR')
  }
}

// POST /api/locations - Create a new location
export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    })

    if (!session?.user) {
      return ApiError.unauthorized(
        'Authentication required',
        'NOT_AUTHENTICATED',
      )
    }

    let body
    try {
      body = await req.json()
    } catch {
      return ApiError.badRequest('Invalid JSON', 'INVALID_JSON')
    }

    const { name, zipCode, address, timezone, type } = body

    // Validate required fields
    if (!name || !zipCode) {
      return ApiError.badRequest(
        'Missing required fields: name, zipCode',
        'MISSING_REQUIRED_FIELDS',
      )
    }

    // Validate type field
    const validTypes = ['restaurant', 'food_truck']
    if (type && !validTypes.includes(type)) {
      return ApiError.badRequest(
        `Invalid type. Must be one of: ${validTypes.join(', ')}`,
        'INVALID_TYPE',
      )
    }

    const newLocation = await db
      .insert(locations)
      .values({
        userId: session.user.id,
        name,
        zipCode,
        address: address || null,
        timezone: timezone || 'America/New_York',
        type: type || 'restaurant',
      })
      .returning()

    return NextResponse.json(newLocation[0], { status: 201 })
  } catch (error) {
    const message = logErrorSafely(error, 'POST /api/locations')
    return ApiError.internalServerError(message, 'CREATE_LOCATION_ERROR')
  }
}
