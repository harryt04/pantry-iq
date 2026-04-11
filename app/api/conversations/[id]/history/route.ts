import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/db'
import { conversations, locations, messages } from '@/db/schema'
import { eq, asc } from 'drizzle-orm'

// GET /api/conversations/[id]/history - Get conversation history
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

    // Get all messages in chronological order
    const conversationMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(asc(messages.createdAt))

    // Format response
    const formattedMessages = conversationMessages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      modelUsed: m.modelUsed || null,
      tokensIn: m.tokensIn || null,
      tokensOut: m.tokensOut || null,
      createdAt: m.createdAt,
    }))

    return NextResponse.json(formattedMessages, { status: 200 })
  } catch (error) {
    console.error('Error fetching conversation history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch conversation history' },
      { status: 500 },
    )
  }
}
