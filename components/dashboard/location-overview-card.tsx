'use client'

import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Location {
  id: string
  name: string
  type: string
  transactionCount: number
  csvUploadCount: number
  posConnectionStatus: string | null
  conversationId: string | null
}

interface LocationOverviewCardProps {
  locations: Location[]
  isLoading?: boolean
}

const typeLabel = {
  restaurant: 'Restaurant',
  food_truck: 'Food Truck',
}

export function LocationOverviewCard({
  locations,
  isLoading,
}: LocationOverviewCardProps) {
  if (locations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Locations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border-muted-foreground/50 flex flex-col items-center justify-center rounded-lg border border-dashed px-4 py-12 text-center">
            <p className="text-muted-foreground mb-4">
              No locations yet. Create your first location to get started.
            </p>
            <Link
              href="/settings"
              className="bg-primary text-primary-foreground inline-block rounded-md px-4 py-2 text-sm font-medium hover:opacity-90"
            >
              Create Location
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Locations ({locations.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {locations.map((location) => (
            <div
              key={location.id}
              className="border-input flex items-start justify-between rounded border p-4"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{location.name}</h3>
                  <Badge variant="secondary" className="text-xs">
                    {typeLabel[location.type as keyof typeof typeLabel]}
                  </Badge>
                </div>
                <div className="text-muted-foreground mt-1 grid grid-cols-2 gap-2 text-sm md:grid-cols-3">
                  <div>
                    <span className="font-medium">
                      {location.transactionCount}
                    </span>{' '}
                    transactions
                  </div>
                  <div>
                    <span className="font-medium">
                      {location.csvUploadCount}
                    </span>{' '}
                    CSV uploads
                  </div>
                  {location.posConnectionStatus && (
                    <div>
                      Square:{' '}
                      <span className="font-medium">
                        {location.posConnectionStatus}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="ml-4 flex gap-2">
                <Link
                  href={`/import?location_id=${location.id}`}
                  className="text-primary hover:text-primary/80 text-sm font-medium"
                >
                  Import
                </Link>
                {location.conversationId && (
                  <Link
                    href={`/conversations/${location.conversationId}`}
                    className="text-primary hover:text-primary/80 text-sm font-medium"
                  >
                    Chat
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
