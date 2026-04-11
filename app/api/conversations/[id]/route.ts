import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/db'
import { conversations, locations } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { getModel } from '@/lib/ai/models'

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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify conversation exists and belongs to user's location
    const conversation = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId))

    if (conversation.length === 0) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 },
      )
    }

    // Verify user owns the location
    const location = await db
      .select()
      .from(locations)
      .where(eq(locations.id, conversation[0].locationId))

    if (location.length === 0 || location[0].userId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    return NextResponse.json(conversation[0], { status: 200 })
  } catch (error) {
    console.error('Error fetching conversation:', error)
    return NextResponse.json(
      { error: 'Failed to fetch conversation' },
      { status: 500 },
    )
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { defaultModel } = body

    // Verify conversation exists and belongs to user's location
    const conversation = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId))

    if (conversation.length === 0) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 },
      )
    }

    // Verify user owns the location
    const location = await db
      .select()
      .from(locations)
      .where(eq(locations.id, conversation[0].locationId))

    if (location.length === 0 || location[0].userId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Validate model if provided
    if (defaultModel) {
      try {
        getModel(defaultModel)
      } catch {
        return NextResponse.json(
          { error: `Invalid model: ${defaultModel}` },
          { status: 400 },
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
    console.error('Error updating conversation:', error)
    return NextResponse.json(
      { error: 'Failed to update conversation' },
      { status: 500 },
    )
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify conversation exists and belongs to user's location
    const conversation = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId))

    if (conversation.length === 0) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 },
      )
    }

    // Verify user owns the location
    const location = await db
      .select()
      .from(locations)
      .where(eq(locations.id, conversation[0].locationId))

    if (location.length === 0 || location[0].userId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Delete conversation (messages will cascade delete)
    await db.delete(conversations).where(eq(conversations.id, conversationId))

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Error deleting conversation:', error)
    return NextResponse.json(
      { error: 'Failed to delete conversation' },
      { status: 500 },
    )
  }
}
