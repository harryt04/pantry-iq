/**
 * Stream Handler for Persisting LLM Responses
 * Handles streaming response completion and persistence to database
 */

import { db } from '@/db'
import { messages } from '@/db/schema'

export interface StreamedMessageData {
  conversationId: string
  role: 'assistant'
  content: string
  modelUsed: string
  tokensIn: number
  tokensOut: number
}

/**
 * Persist a streamed message to the database after streaming is complete
 */
export async function persistStreamedMessage(
  data: StreamedMessageData,
): Promise<string> {
  try {
    const inserted = await db
      .insert(messages)
      .values({
        conversationId: data.conversationId,
        role: data.role,
        content: data.content,
        modelUsed: data.modelUsed,
        tokensIn: data.tokensIn,
        tokensOut: data.tokensOut,
      })
      .returning()

    if (!inserted || inserted.length === 0) {
      throw new Error('Failed to insert message')
    }

    return inserted[0].id
  } catch (error) {
    console.error('Error persisting streamed message:', error)
    throw error
  }
}

/**
 * Persist a user message to the database
 */
export async function persistUserMessage(
  conversationId: string,
  content: string,
): Promise<string> {
  try {
    const inserted = await db
      .insert(messages)
      .values({
        conversationId,
        role: 'user',
        content,
      })
      .returning()

    if (!inserted || inserted.length === 0) {
      throw new Error('Failed to insert user message')
    }

    return inserted[0].id
  } catch (error) {
    console.error('Error persisting user message:', error)
    throw error
  }
}
