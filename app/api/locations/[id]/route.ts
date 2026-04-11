import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/db'
import { locations } from '@/db/schema'
import { eq } from 'drizzle-orm'

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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify ownership
    const isOwner = await verifyLocationOwnership(id, session.user.id)
    if (!isOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const location = await db
      .select()
      .from(locations)
      .where(eq(locations.id, id))

    if (location.length === 0) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }

    return NextResponse.json(location[0], { status: 200 })
  } catch (error) {
    console.error('Error fetching location:', error)
    return NextResponse.json(
      { error: 'Failed to fetch location' },
      { status: 500 },
    )
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify ownership
    const isOwner = await verifyLocationOwnership(id, session.user.id)
    if (!isOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { name, zipCode, address, timezone, type } = body

    // Validate required fields if provided
    if (name === '' || zipCode === '') {
      return NextResponse.json(
        { error: 'Name and zipCode cannot be empty' },
        { status: 400 },
      )
    }

    // Validate type field if provided
    const validTypes = ['restaurant', 'food_truck']
    if (type && !validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 },
      )
    }

    const updateData: Record<string, any> = {}
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
    console.error('Error updating location:', error)
    return NextResponse.json(
      { error: 'Failed to update location' },
      { status: 500 },
    )
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify ownership
    const isOwner = await verifyLocationOwnership(id, session.user.id)
    if (!isOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Delete location (cascade is handled by database constraints)
    const deletedLocation = await db
      .delete(locations)
      .where(eq(locations.id, id))
      .returning()

    if (deletedLocation.length === 0) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }

    return NextResponse.json(
      { message: 'Location deleted successfully' },
      { status: 200 },
    )
  } catch (error) {
    console.error('Error deleting location:', error)
    return NextResponse.json(
      { error: 'Failed to delete location' },
      { status: 500 },
    )
  }
}
