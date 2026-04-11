'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import { CSVUpload } from '@/components/import/csv-upload'
import { SquareConnect } from '@/components/import/square-connect'
import { LocationSelector } from '@/components/import/location-selector'

function ImportContent() {
  const searchParams = useSearchParams()
  const locationId = searchParams.get('location_id')

  if (!locationId) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900/30 dark:bg-yellow-950/20">
          <p className="text-sm font-medium text-yellow-900 dark:text-yellow-200">
            Please select a location to import data into.
          </p>
        </div>
        <Suspense fallback={<div>Loading locations...</div>}>
          <LocationSelector />
        </Suspense>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-4 text-xl font-semibold">POS Integration</h2>
        <SquareConnect locationId={locationId} />
      </div>
      <div>
        <h2 className="mb-4 text-xl font-semibold">Manual CSV Upload</h2>
        <CSVUpload locationId={locationId} />
      </div>
    </div>
  )
}

export default function ImportPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 py-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Import Data</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Upload a CSV or TSV file to import inventory data into your location.
        </p>
      </div>

      <ImportContent />
    </div>
  )
}
