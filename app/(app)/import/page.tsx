'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { CSVUpload } from '@/components/import/csv-upload'
import { SquareConnect } from '@/components/import/square-connect'

function ImportContent() {
  const searchParams = useSearchParams()
  const locationId = searchParams.get('location_id')

  if (!locationId) {
    return (
      <div className="border-destructive bg-destructive/10 rounded-lg border p-4">
        <p className="text-destructive text-sm font-medium">
          Missing location ID. Please provide a valid location_id query
          parameter.
        </p>
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

      <Suspense fallback={<div>Loading...</div>}>
        <ImportContent />
      </Suspense>
    </div>
  )
}
