'use client'

import Link from 'next/link'
import {
  Building2,
  Utensils,
  TrendingUp,
  Upload as UploadIcon,
  MessageCircle,
} from 'lucide-react'
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

const typeIcon = {
  restaurant: Building2,
  food_truck: Utensils,
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
          {locations.map((location) => {
            const TypeIcon =
              typeIcon[location.type as keyof typeof typeIcon] || Building2
            return (
              <div
                key={location.id}
                className="border-input flex items-start justify-between rounded border p-4"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <TypeIcon className="text-muted-foreground h-4 w-4" />
                    <h3 className="font-semibold">{location.name}</h3>
                    <Badge variant="secondary" className="text-xs">
                      {typeLabel[location.type as keyof typeof typeLabel]}
                    </Badge>
                  </div>
                  <div className="text-muted-foreground mt-2 grid grid-cols-2 gap-3 text-sm md:grid-cols-3">
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="h-3.5 w-3.5" />
                      <span>
                        <span className="font-medium">
                          {location.transactionCount}
                        </span>{' '}
                        transactions
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <UploadIcon className="h-3.5 w-3.5" />
                      <span>
                        <span className="font-medium">
                          {location.csvUploadCount}
                        </span>{' '}
                        uploads
                      </span>
                    </div>
                    {location.posConnectionStatus && (
                      <div className="flex items-center gap-1.5">
                        <MessageCircle className="h-3.5 w-3.5" />
                        <span>
                          Square:{' '}
                          <span className="font-medium">
                            {location.posConnectionStatus}
                          </span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="ml-4 flex gap-2">
                  <Link
                    href={`/import?location_id=${location.id}`}
                    className="text-primary hover:text-primary/80 inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
                  >
                    <UploadIcon className="h-3.5 w-3.5" />
                    Import
                  </Link>
                  {location.conversationId && (
                    <Link
                      href={`/conversations/${location.conversationId}`}
                      className="text-primary hover:text-primary/80 inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      Chat
                    </Link>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
