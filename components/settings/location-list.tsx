'use client'

import { useState, useEffect } from 'react'
import { Edit2, Trash2, Plus, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface Location {
  id: string
  name: string
  zipCode: string
  address?: string
  timezone?: string
  type?: string
  createdAt: string
}

interface LocationListProps {
  onEdit: (location: Location) => void
  onDelete: (locationId: string) => Promise<void>
  onAddNew: () => void
  isLoading?: boolean
}

export function LocationList({
  onEdit,
  onDelete,
  onAddNew,
  isLoading = false,
}: LocationListProps) {
  const [locations, setLocations] = useState<Location[]>([])
  const [error, setError] = useState<string>('')
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [fetching, setFetching] = useState(true)
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    locationId: string
    locationName: string
  } | null>(null)

  // Fetch locations on mount
  useEffect(() => {
    fetchLocations()
  }, [])

  const fetchLocations = async () => {
    try {
      setFetching(true)
      const response = await fetch('/api/locations')
      if (!response.ok) {
        throw new Error('Failed to fetch locations')
      }
      const data = await response.json()
      setLocations(data)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load locations')
      setLocations([])
    } finally {
      setFetching(false)
    }
  }

  const handleDelete = async (locationId: string) => {
    const location = locations.find((l) => l.id === locationId)
    if (location) {
      setDeleteConfirmation({
        locationId,
        locationName: location.name,
      })
    }
  }

  const confirmDelete = async () => {
    if (!deleteConfirmation) return

    setLoadingId(deleteConfirmation.locationId)
    try {
      await onDelete(deleteConfirmation.locationId)
      setLocations(
        locations.filter((l) => l.id !== deleteConfirmation.locationId),
      )
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete location')
    } finally {
      setLoadingId(null)
      setDeleteConfirmation(null)
    }
  }

  const handleRefresh = () => {
    fetchLocations()
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Your Locations</CardTitle>
          <Button onClick={onAddNew} disabled={isLoading} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Location
          </Button>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {fetching || isLoading ? (
            <div className="text-muted-foreground py-8 text-center">
              Loading locations...
            </div>
          ) : locations.length === 0 ? (
            <div className="border-border rounded-md border border-dashed p-8 text-center">
              <p className="text-muted-foreground mb-4">
                No locations yet. Create your first location to get started.
              </p>
              <Button onClick={onAddNew}>Create Location</Button>
            </div>
          ) : (
            <div className="space-y-3">
              {locations.map((location) => (
                <div
                  key={location.id}
                  className="border-border hover:bg-accent/50 flex items-center justify-between rounded-lg border p-4 transition-colors"
                >
                  <div className="flex-1">
                    <h3 className="text-sm font-medium">{location.name}</h3>
                    <div className="text-muted-foreground mt-1 space-y-1 text-xs">
                      <p>
                        Zip Code: {location.zipCode}
                        {location.address && ` • ${location.address}`}
                      </p>
                      <p>
                        Type:{' '}
                        <span className="capitalize">
                          {location.type?.replace('_', ' ') || 'restaurant'}
                        </span>
                        {location.timezone && ` • ${location.timezone}`}
                      </p>
                    </div>
                  </div>
                  <div className="ml-4 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(location)}
                      disabled={loadingId === location.id}
                      className="gap-1.5"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(location.id)}
                      disabled={loadingId === location.id}
                      className="gap-1.5 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
              <div className="pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isLoading}
                  className="gap-1.5"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Refresh
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={!!deleteConfirmation}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirmation(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Location</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;
              {deleteConfirmation?.locationName}&quot;? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-3">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
