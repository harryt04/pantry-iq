'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

interface Location {
  id: string
  name: string
  address?: string
  type: string
}

export function LocationSelector() {
  const { data: session } = useSession()
  const [locations, setLocations] = useState<Location[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!session?.user?.id) {
      setIsLoading(false)
      return
    }

    const fetchLocations = async () => {
      try {
        const response = await fetch('/api/locations')
        if (!response.ok) {
          throw new Error('Failed to fetch locations')
        }
        const data = await response.json()
        // API returns array directly, not wrapped in an object
        setLocations(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error('Failed to load locations:', err)
        setError('Failed to load locations. Please try again.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchLocations()
  }, [session?.user?.id])

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="text-primary h-6 w-6 animate-spin" />
          <span className="ml-2">Loading locations...</span>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">
            <p className="mb-4 text-red-600 dark:text-red-400">{error}</p>
            <p className="text-muted-foreground mb-4 text-sm">
              Try refreshing the page or go to settings.
            </p>
            <Link href="/settings">
              <Button>Go to Settings</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!locations || locations.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">
            <p className="mb-4 text-gray-600 dark:text-gray-400">
              You don&apos;t have any locations yet. Create one in settings to
              import data.
            </p>
            <Link href="/settings">
              <Button>Go to Settings</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Select a Location</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-2">
          {locations.map((location) => (
            <Link
              key={location.id}
              href={`/import?location_id=${location.id}`}
              className="group border-input bg-card hover:border-primary/50 hover:bg-primary/5 rounded-lg border p-4 transition-colors"
            >
              <h3 className="text-foreground font-semibold">{location.name}</h3>
              <p className="text-muted-foreground mt-1 text-sm">
                {location.address || 'No address provided'}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                Type: {location.type}
              </p>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
