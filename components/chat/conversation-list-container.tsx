'use client'

import { useState, useEffect } from 'react'
import { useSession } from '@/lib/auth-client'
import { ConversationList } from './conversation-list'
import { useRouter } from 'next/navigation'

interface Conversation {
  id: string
  locationId: string
  createdAt: Date
  defaultModel: string
}

interface Location {
  id: string
  name: string
}

export function ConversationListContainer() {
  const { data: session } = useSession()
  const router = useRouter()
  const [locations, setLocations] = useState<Location[]>([])
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(
    null,
  )
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch locations
  useEffect(() => {
    if (!session?.user) return

    const fetchLocations = async () => {
      try {
        const response = await fetch('/api/locations')
        if (!response.ok) throw new Error('Failed to fetch locations')
        const data = await response.json()
        setLocations(data)
        if (data.length > 0) {
          setSelectedLocationId(data[0].id)
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to fetch locations',
        )
      }
    }

    fetchLocations()
  }, [session?.user])

  // Fetch conversations when location changes
  useEffect(() => {
    if (!selectedLocationId) return

    const fetchConversations = async () => {
      setIsLoading(true)
      try {
        const response = await fetch(
          `/api/conversations?locationId=${selectedLocationId}`,
        )
        if (!response.ok) throw new Error('Failed to fetch conversations')
        const data = await response.json()
        setConversations(
          data.map((c: any) => ({
            ...c,
            createdAt: new Date(c.createdAt),
          })),
        )
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to fetch conversations',
        )
      } finally {
        setIsLoading(false)
      }
    }

    fetchConversations()
  }, [selectedLocationId])

  if (locations.length === 0) {
    return (
      <div className="space-y-4">
        <div className="border-muted-foreground/50 rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">
            No locations found. Create a location first to start conversations.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Location Selector */}
      <div>
        <label className="text-sm font-medium">Select Location</label>
        <select
          value={selectedLocationId || ''}
          onChange={(e) => setSelectedLocationId(e.target.value)}
          className="border-input bg-background mt-2 w-full rounded-md border px-3 py-2 text-sm"
        >
          {locations.map((location) => (
            <option key={location.id} value={location.id}>
              {location.name}
            </option>
          ))}
        </select>
      </div>

      {/* Conversations List */}
      {error ? (
        <div className="border-destructive bg-destructive/10 rounded-lg border p-4">
          <p className="text-destructive text-sm">{error}</p>
        </div>
      ) : (
        <ConversationList
          conversations={conversations}
          locationId={selectedLocationId || ''}
          isLoading={isLoading}
        />
      )}
    </div>
  )
}
