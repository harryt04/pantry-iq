import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/db'
import { conversations, locations } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { getModel } from '@/lib/ai/models'
import { ApiError, logErrorSafely } from '@/lib/api-error'

// GET /api/conversations/[id] - Get conversation details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: conversationId } = await params

    const session = await auth.api.getSession({
      headers: req.headers,
    })

    if (!session?.user) {
      return ApiError.unauthorized(
        'Authentication required',
        'NOT_AUTHENTICATED',
      )
    }

    // Verify conversation exists and belongs to user's location
    const conversation = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId))

    if (conversation.length === 0) {
      return ApiError.notFound(
        'Conversation not found',
        'CONVERSATION_NOT_FOUND',
      )
    }

    // Verify user owns the location
    const location = await db
      .select()
      .from(locations)
      .where(eq(locations.id, conversation[0].locationId))

    if (location.length === 0 || location[0].userId !== session.user.id) {
      return ApiError.forbidden(
        'You do not have access to this conversation',
        'ACCESS_DENIED',
      )
    }

    return NextResponse.json(conversation[0], { status: 200 })
  } catch (error) {
    const message = logErrorSafely(error, 'GET /api/conversations/[id]')
    return ApiError.internalServerError(message, 'FETCH_CONVERSATION_ERROR')
  }
}

// PATCH /api/conversations/[id] - Update conversation
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: conversationId } = await params

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

    const { defaultModel } = body

    // Verify conversation exists and belongs to user's location
    const conversation = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId))

    if (conversation.length === 0) {
      return ApiError.notFound(
        'Conversation not found',
        'CONVERSATION_NOT_FOUND',
      )
    }

    // Verify user owns the location
    const location = await db
      .select()
      .from(locations)
      .where(eq(locations.id, conversation[0].locationId))

    if (location.length === 0 || location[0].userId !== session.user.id) {
      return ApiError.forbidden(
        'You do not have access to this conversation',
        'ACCESS_DENIED',
      )
    }

    // Validate model if provided
    if (defaultModel) {
      try {
        getModel(defaultModel)
      } catch {
        return ApiError.badRequest(
          `Invalid model: ${defaultModel}`,
          'INVALID_MODEL',
        )
      }
    }

    // Update conversation
    const updated = await db
      .update(conversations)
      .set({
        defaultModel: defaultModel || conversation[0].defaultModel,
      })
      .where(eq(conversations.id, conversationId))
      .returning()

    return NextResponse.json(updated[0], { status: 200 })
  } catch (error) {
    const message = logErrorSafely(error, 'PATCH /api/conversations/[id]')
    return ApiError.internalServerError(message, 'UPDATE_CONVERSATION_ERROR')
  }
}

// DELETE /api/conversations/[id] - Delete conversation
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: conversationId } = await params

    const session = await auth.api.getSession({
      headers: req.headers,
    })

    if (!session?.user) {
      return ApiError.unauthorized(
        'Authentication required',
        'NOT_AUTHENTICATED',
      )
    }

    // Verify conversation exists and belongs to user's location
    const conversation = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId))

    if (conversation.length === 0) {
      return ApiError.notFound(
        'Conversation not found',
        'CONVERSATION_NOT_FOUND',
      )
    }

    // Verify user owns the location
    const location = await db
      .select()
      .from(locations)
      .where(eq(locations.id, conversation[0].locationId))

    if (location.length === 0 || location[0].userId !== session.user.id) {
      return ApiError.forbidden(
        'You do not have access to this conversation',
        'ACCESS_DENIED',
      )
    }

    // Delete conversation (messages will cascade delete)
    await db.delete(conversations).where(eq(conversations.id, conversationId))

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    const message = logErrorSafely(error, 'DELETE /api/conversations/[id]')
    return ApiError.internalServerError(message, 'DELETE_CONVERSATION_ERROR')
  }
}
