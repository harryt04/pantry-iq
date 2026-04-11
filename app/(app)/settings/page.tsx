'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  LocationForm,
  LocationFormData,
} from '@/components/settings/location-form'
import { LocationList } from '@/components/settings/location-list'
import { useSession } from '@/lib/auth-client'

interface Location {
  id: string
  name: string
  zipCode: string
  address?: string
  timezone?: string
  type?: string
  createdAt: string
}

export default function SettingsPage() {
  const { data: session } = useSession()
  const [editingLocation, setEditingLocation] = useState<Location | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleAddNew = () => {
    setEditingLocation(null)
    setShowForm(true)
  }

  const handleEdit = (location: Location) => {
    setEditingLocation(location)
    setShowForm(true)
  }

  const handleFormSubmit = async (data: LocationFormData) => {
    setIsLoading(true)
    try {
      if (editingLocation) {
        // Update existing location
        const response = await fetch(`/api/locations/${editingLocation.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to update location')
        }
      } else {
        // Create new location
        const response = await fetch('/api/locations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to create location')
        }
      }

      setShowForm(false)
      setEditingLocation(null)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (locationId: string) => {
    const response = await fetch(`/api/locations/${locationId}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to delete location')
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingLocation(null)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account and application settings.
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Account Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Email</label>
              <p className="text-muted-foreground mt-1">
                {session?.user.email}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">Name</label>
              <p className="text-muted-foreground mt-1">
                {session?.user.name || 'Not set'}
              </p>
            </div>
          </CardContent>
        </Card>

        {showForm && (
          <LocationForm
            initialData={
              editingLocation
                ? {
                    id: editingLocation.id,
                    name: editingLocation.name,
                    zipCode: editingLocation.zipCode,
                    address: editingLocation.address,
                    timezone: editingLocation.timezone,
                    type: editingLocation.type,
                  }
                : undefined
            }
            onSubmit={handleFormSubmit}
            onCancel={handleCancel}
            isLoading={isLoading}
          />
        )}

        <LocationList
          onEdit={handleEdit}
          onDelete={handleDelete}
          onAddNew={handleAddNew}
          isLoading={isLoading}
        />
      </div>
    </div>
  )
}
