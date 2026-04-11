'use client'

import type { MouseEvent } from 'react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Trash2, Plus } from 'lucide-react'
import { captureAnalyticsEvent, hashLocationId } from '@/lib/analytics-utils'

interface Conversation {
  id: string
  createdAt: Date
  defaultModel: string
}

interface ConversationListProps {
  conversations: Conversation[]
  locationId: string
  isLoading?: boolean
  onDeleteConversation?: (conversationId: string) => Promise<void>
}

export function ConversationList({
  conversations,
  locationId,
  isLoading = false,
  onDeleteConversation,
}: ConversationListProps) {
  const router = useRouter()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleNewConversation = async () => {
    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationId }),
      })

      if (!response.ok) {
        throw new Error('Failed to create conversation')
      }

      const { id } = await response.json()

      // Track conversation creation with hashed location ID (non-blocking)
      hashLocationId(locationId)
        .then((hashedId) => {
          captureAnalyticsEvent('conversation-started', {
            locationId: hashedId,
          })
        })
        .catch((error) => {
          console.debug('Failed to hash location ID:', error)
        })

      router.push(`/conversations/${id}`)
    } catch (error) {
      console.error('Failed to create conversation:', error)
    }
  }

  const handleDelete = async (conversationId: string, e: MouseEvent) => {
    e.stopPropagation()
    setDeletingId(conversationId)

    try {
      if (onDeleteConversation) {
        await onDeleteConversation(conversationId)
      } else {
        const response = await fetch(`/api/conversations/${conversationId}`, {
          method: 'DELETE',
        })

        if (!response.ok) {
          throw new Error('Failed to delete conversation')
        }
      }

      // Refresh the page or update the list
      router.refresh()
    } catch (error) {
      console.error('Failed to delete conversation:', error)
    } finally {
      setDeletingId(null)
    }
  }

  const formatDate = (date: Date) => {
    const d = new Date(date)
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (conversations.length === 0) {
    return (
      <div className="space-y-4">
        <div className="border-muted-foreground/50 rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground mb-4">
            No conversations yet. Start one!
          </p>
          <Button onClick={handleNewConversation} disabled={isLoading}>
            <Plus className="mr-2 size-4" />
            New Conversation
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleNewConversation} disabled={isLoading}>
          <Plus className="mr-2 size-4" />
          New Conversation
        </Button>
      </div>

      <div className="space-y-2">
        {conversations.map((conversation) => (
          <button
            key={conversation.id}
            onClick={() => router.push(`/conversations/${conversation.id}`)}
            className="border-border bg-card hover:bg-muted w-full rounded-lg border p-3 text-left transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 truncate">
                <p className="font-medium">
                  Chat from {formatDate(conversation.createdAt)}
                </p>
                <p className="text-muted-foreground text-xs">
                  Model: {conversation.defaultModel}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={(e) => handleDelete(conversation.id, e)}
                disabled={deletingId === conversation.id}
                className="ml-2 shrink-0"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
