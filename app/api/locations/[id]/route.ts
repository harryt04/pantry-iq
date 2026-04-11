import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/db'
import { locations } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { ApiError, logErrorSafely } from '@/lib/api-error'

// Helper function to verify location ownership
async function verifyLocationOwnership(
  locationId: string,
  userId: string,
): Promise<boolean> {
  const location = await db
    .select()
    .from(locations)
    .where(eq(locations.id, locationId))

  return location.length > 0 && location[0].userId === userId
}

// GET /api/locations/[id] - Get a specific location
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const session = await auth.api.getSession({
      headers: req.headers,
    })

    if (!session?.user) {
      return ApiError.unauthorized(
        'Authentication required',
        'NOT_AUTHENTICATED',
      )
    }

    // Verify ownership
    const isOwner = await verifyLocationOwnership(id, session.user.id)
    if (!isOwner) {
      return ApiError.forbidden(
        'You do not have access to this location',
        'ACCESS_DENIED',
      )
    }

    const location = await db
      .select()
      .from(locations)
      .where(eq(locations.id, id))

    if (location.length === 0) {
      return ApiError.notFound('Location not found', 'LOCATION_NOT_FOUND')
    }

    return NextResponse.json(location[0], { status: 200 })
  } catch (error) {
    const message = logErrorSafely(error, 'GET /api/locations/[id]')
    return ApiError.internalServerError(message, 'FETCH_LOCATION_ERROR')
  }
}

// PUT /api/locations/[id] - Update a location
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const session = await auth.api.getSession({
      headers: req.headers,
    })

    if (!session?.user) {
      return ApiError.unauthorized(
        'Authentication required',
        'NOT_AUTHENTICATED',
      )
    }

    // Verify ownership
    const isOwner = await verifyLocationOwnership(id, session.user.id)
    if (!isOwner) {
      return ApiError.forbidden(
        'You do not have access to this location',
        'ACCESS_DENIED',
      )
    }

    let body
    try {
      body = await req.json()
    } catch {
      return ApiError.badRequest('Invalid JSON', 'INVALID_JSON')
    }

    const { name, zipCode, address, timezone, type } = body

    // Validate required fields if provided
    if (name === '' || zipCode === '') {
      return ApiError.badRequest(
        'Name and zipCode cannot be empty',
        'INVALID_FIELDS',
      )
    }

    // Validate type field if provided
    const validTypes = ['restaurant', 'food_truck']
    if (type && !validTypes.includes(type)) {
      return ApiError.badRequest(
        `Invalid type. Must be one of: ${validTypes.join(', ')}`,
        'INVALID_TYPE',
      )
    }

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (zipCode !== undefined) updateData.zipCode = zipCode
    if (address !== undefined) updateData.address = address || null
    if (timezone !== undefined) updateData.timezone = timezone
    if (type !== undefined) updateData.type = type

    const updatedLocation = await db
      .update(locations)
      .set(updateData)
      .where(eq(locations.id, id))
      .returning()

    return NextResponse.json(updatedLocation[0], { status: 200 })
  } catch (error) {
    const message = logErrorSafely(error, 'PUT /api/locations/[id]')
    return ApiError.internalServerError(message, 'UPDATE_LOCATION_ERROR')
  }
}

// DELETE /api/locations/[id] - Delete a location (cascades to related data)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const session = await auth.api.getSession({
      headers: req.headers,
    })

    if (!session?.user) {
      return ApiError.unauthorized(
        'Authentication required',
        'NOT_AUTHENTICATED',
      )
    }

    // Verify ownership
    const isOwner = await verifyLocationOwnership(id, session.user.id)
    if (!isOwner) {
      return ApiError.forbidden(
        'You do not have access to this location',
        'ACCESS_DENIED',
      )
    }

    // Delete location (cascade is handled by database constraints)
    const deletedLocation = await db
      .delete(locations)
      .where(eq(locations.id, id))
      .returning()

    if (deletedLocation.length === 0) {
      return ApiError.notFound('Location not found', 'LOCATION_NOT_FOUND')
    }

    return NextResponse.json(
      { message: 'Location deleted successfully' },
      { status: 200 },
    )
  } catch (error) {
    const message = logErrorSafely(error, 'DELETE /api/locations/[id]')
    return ApiError.internalServerError(message, 'DELETE_LOCATION_ERROR')
  }
}
