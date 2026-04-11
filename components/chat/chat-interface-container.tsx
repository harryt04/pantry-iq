'use client'

import { useState, useEffect } from 'react'
import { useSession } from '@/lib/auth-client'
import { ChatInterface } from './chat-interface'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  modelUsed?: string
  createdAt: Date
}

interface ConversationDetail {
  id: string
  locationId: string
  defaultModel: string
  createdAt: Date
}

interface ChatInterfaceContainerProps {
  params: Promise<{ id: string }>
}

export function ChatInterfaceContainer({
  params,
}: ChatInterfaceContainerProps) {
  const { data: session } = useSession()
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [conversation, setConversation] = useState<ConversationDetail | null>(
    null,
  )
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Resolve params and fetch conversation data
  useEffect(() => {
    const resolveParams = async () => {
      try {
        const { id } = await params
        setConversationId(id)
      } catch {
        setError('Failed to load conversation')
      }
    }

    resolveParams()
  }, [params])

  // Fetch conversation and history
  useEffect(() => {
    if (!conversationId || !session?.user) return

    const fetchConversationData = async () => {
      setIsLoading(true)
      try {
        // Fetch conversation details
        const convResponse = await fetch(`/api/conversations/${conversationId}`)
        if (!convResponse.ok) throw new Error('Failed to fetch conversation')
        const convData = await convResponse.json()
        setConversation({
          ...convData,
          createdAt: new Date(convData.createdAt),
        })

        // Fetch message history
        const historyResponse = await fetch(
          `/api/conversations/${conversationId}/history`,
        )
        if (!historyResponse.ok)
          throw new Error('Failed to fetch message history')
        const historyData = await historyResponse.json()
        interface MessageData {
          id: string
          role: 'user' | 'assistant'
          content: string
          modelUsed?: string
          createdAt: string
        }
        setMessages(
          (historyData as MessageData[]).map((m) => ({
            ...m,
            createdAt: new Date(m.createdAt),
          })),
        )
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load conversation',
        )
      } finally {
        setIsLoading(false)
      }
    }

    fetchConversationData()
  }, [conversationId, session?.user])

  const handleModelChange = async (modelId: string) => {
    if (!conversationId) return

    try {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ defaultModel: modelId }),
      })

      if (!response.ok) throw new Error('Failed to update model')
      const updated = await response.json()
      setConversation({
        ...updated,
        createdAt: new Date(updated.createdAt),
      })
    } catch (err) {
      console.error('Failed to update model:', err)
      throw err
    }
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="border-destructive bg-destructive/10 rounded-lg border p-6 text-center">
          <p className="text-destructive text-sm font-medium">{error}</p>
        </div>
      </div>
    )
  }

  if (isLoading || !conversation || !conversationId) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground text-center">
          <p>Loading conversation...</p>
        </div>
      </div>
    )
  }

  return (
    <ChatInterface
      conversationId={conversationId}
      initialMessages={messages}
      defaultModel={conversation.defaultModel}
      onModelChange={handleModelChange}
    />
  )
}
