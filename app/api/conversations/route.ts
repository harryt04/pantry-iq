import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/db'
import { conversations, locations } from '@/db/schema'
import { eq, inArray } from 'drizzle-orm'
import { getModel } from '@/lib/ai/models'

// GET /api/conversations - List all conversations for user's locations
export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    })

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all locations for the user
    const userLocations = await db
      .select({ id: locations.id })
      .from(locations)
      .where(eq(locations.userId, session.user.id))

    if (userLocations.length === 0) {
      return NextResponse.json([], { status: 200 })
    }

    const locationIds = userLocations.map((l) => l.id)

    // Get all conversations for those locations
    const userConversations = await db
      .select()
      .from(conversations)
      .where(inArray(conversations.locationId, locationIds))

    return NextResponse.json(userConversations, { status: 200 })
  } catch (error) {
    console.error('Error fetching conversations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 },
    )
  }
}

// POST /api/conversations - Create a new conversation
export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    })

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { locationId, modelId } = body

    if (!locationId) {
      return NextResponse.json(
        { error: 'Missing required field: locationId' },
        { status: 400 },
      )
    }

    // Verify the location belongs to the user
    const location = await db
      .select()
      .from(locations)
      .where(eq(locations.id, locationId))

    if (location.length === 0 || location[0].userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Location not found or access denied' },
        { status: 404 },
      )
    }

    // Validate modelId if provided
    let finalModelId = modelId || 'gemini-2.0-flash-lite'
    if (modelId) {
      try {
        getModel(modelId)
      } catch {
        return NextResponse.json(
          { error: `Invalid model: ${modelId}` },
          { status: 400 },
        )
      }
    }

    // Create conversation
    const newConversation = await db
      .insert(conversations)
      .values({
        locationId,
        defaultModel: finalModelId,
      })
      .returning()

    if (!newConversation || newConversation.length === 0) {
      return NextResponse.json(
        { error: 'Failed to create conversation' },
        { status: 500 },
      )
    }

    return NextResponse.json(newConversation[0], { status: 201 })
  } catch (error) {
    console.error('Error creating conversation:', error)
    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 },
    )
  }
}
