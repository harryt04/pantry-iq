'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { captureAnalyticsEvent } from '@/lib/analytics-utils'

interface LocationFormProps {
  initialData?: {
    id: string
    name: string
    zipCode: string
    address?: string
    timezone?: string
    type?: string
  }
  onSubmit: (data: LocationFormData) => Promise<void>
  onCancel?: () => void
  isLoading?: boolean
}

export interface LocationFormData {
  name: string
  zipCode: string
  address?: string
  timezone?: string
  type?: string
}

export function LocationForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
}: LocationFormProps) {
  const [formData, setFormData] = useState<LocationFormData>({
    name: initialData?.name || '',
    zipCode: initialData?.zipCode || '',
    address: initialData?.address || '',
    timezone: initialData?.timezone || 'America/New_York',
    type: initialData?.type || 'restaurant',
  })

  const [error, setError] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      // Validate required fields
      if (!formData.name.trim() || !formData.zipCode.trim()) {
        setError('Name and zip code are required')
        setIsSubmitting(false)
        return
      }

      await onSubmit(formData)

      // Track location creation (only for new locations)
      if (!initialData) {
        captureAnalyticsEvent('location-created', {
          type: formData.type || 'restaurant',
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save location')
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {initialData ? 'Edit Location' : 'Add New Location'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Location Name *</Label>
            <Input
              id="name"
              name="name"
              placeholder="e.g., Downtown Restaurant"
              value={formData.name}
              onChange={handleChange}
              disabled={isSubmitting || isLoading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="zipCode">Zip Code *</Label>
            <Input
              id="zipCode"
              name="zipCode"
              placeholder="e.g., 10001"
              value={formData.zipCode}
              onChange={handleChange}
              disabled={isSubmitting || isLoading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              name="address"
              placeholder="e.g., 123 Main St, New York, NY"
              value={formData.address || ''}
              onChange={handleChange}
              disabled={isSubmitting || isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <select
              id="timezone"
              name="timezone"
              value={formData.timezone || 'America/New_York'}
              onChange={handleChange}
              disabled={isSubmitting || isLoading}
              className="border-input placeholder:text-muted-foreground focus-visible:ring-ring flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="America/New_York">America/New_York</option>
              <option value="America/Chicago">America/Chicago</option>
              <option value="America/Denver">America/Denver</option>
              <option value="America/Los_Angeles">America/Los_Angeles</option>
              <option value="America/Anchorage">America/Anchorage</option>
              <option value="Pacific/Honolulu">Pacific/Honolulu</option>
              <option value="UTC">UTC</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Location Type</Label>
            <select
              id="type"
              name="type"
              value={formData.type || 'restaurant'}
              onChange={handleChange}
              disabled={isSubmitting || isLoading}
              className="border-input placeholder:text-muted-foreground focus-visible:ring-ring flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="restaurant">Restaurant</option>
              <option value="food_truck">Food Truck</option>
            </select>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={isSubmitting || isLoading}>
              {isSubmitting ? 'Saving...' : 'Save Location'}
            </Button>
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting || isLoading}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
