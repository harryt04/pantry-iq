import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/db'
import { conversations, locations } from '@/db/schema'
import { eq, inArray } from 'drizzle-orm'
import { getModel } from '@/lib/ai/models'
import { ApiError, logErrorSafely } from '@/lib/api-error'

// GET /api/conversations - List all conversations for user's locations
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
    const message = logErrorSafely(error, 'GET /api/conversations')
    return ApiError.internalServerError(message, 'FETCH_CONVERSATIONS_ERROR')
  }
}

// POST /api/conversations - Create a new conversation
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

    const { locationId, modelId } = body

    if (!locationId) {
      return ApiError.badRequest(
        'Missing required field: locationId',
        'MISSING_LOCATION_ID',
      )
    }

    // Verify the location belongs to the user
    const location = await db
      .select()
      .from(locations)
      .where(eq(locations.id, locationId))

    if (location.length === 0 || location[0].userId !== session.user.id) {
      return ApiError.notFound(
        'Location not found or access denied',
        'LOCATION_NOT_FOUND',
      )
    }

    // Validate modelId if provided
    const finalModelId = modelId || 'gemini-2.0-flash-lite'
    if (modelId) {
      try {
        getModel(modelId)
      } catch {
        return ApiError.badRequest(`Invalid model: ${modelId}`, 'INVALID_MODEL')
      }
    }

    // Create conversation
    const newConversation = await db
      .insert(conversations)
      .values({
        locationId: location[0].id,
        defaultModel: finalModelId,
      })
      .returning()

    if (!newConversation || newConversation.length === 0) {
      return ApiError.internalServerError(
        'Failed to create conversation',
        'CREATE_CONVERSATION_ERROR',
      )
    }

    return NextResponse.json(newConversation[0], { status: 201 })
  } catch (error) {
    const message = logErrorSafely(error, 'POST /api/conversations')
    return ApiError.internalServerError(message, 'CREATE_CONVERSATION_ERROR')
  }
}
