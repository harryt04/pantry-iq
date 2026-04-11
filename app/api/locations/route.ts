import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/db'
import { locations } from '@/db/schema'
import { eq } from 'drizzle-orm'

// GET /api/locations - List all locations for current user
export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    })

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userLocations = await db
      .select()
      .from(locations)
      .where(eq(locations.userId, session.user.id))

    return NextResponse.json(userLocations, { status: 200 })
  } catch (error) {
    console.error('Error fetching locations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch locations' },
      { status: 500 },
    )
  }
}

// POST /api/locations - Create a new location
export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    })

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { name, zipCode, address, timezone, type } = body

    // Validate required fields
    if (!name || !zipCode) {
      return NextResponse.json(
        { error: 'Missing required fields: name, zipCode' },
        { status: 400 },
      )
    }

    // Validate type field
    const validTypes = ['restaurant', 'food_truck']
    if (type && !validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 },
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
    console.error('Error creating location:', error)
    return NextResponse.json(
      { error: 'Failed to create location' },
      { status: 500 },
    )
  }
}
