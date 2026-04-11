'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  File,
  Check,
  Clock,
  AlertCircle,
  Loader2,
  Square as SquareIcon,
} from 'lucide-react'

interface CsvUpload {
  id: string
  filename: string
  status: string
  uploadedAt: Date
  locationName: string
  locationId: string
  errorDetails: string | null
}

interface PosConnection {
  locationId: string
  locationName: string
  syncState: string
  lastSync: Date | null
}

interface ImportStatusCardProps {
  csvUploads: CsvUpload[]
  posConnections: PosConnection[]
  isLoading?: boolean
}

const statusBadgeConfig = {
  pending: { className: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
  mapping: { className: 'bg-blue-100 text-blue-800', label: 'Mapping' },
  importing: { className: 'bg-blue-100 text-blue-800', label: 'Importing' },
  complete: { className: 'bg-green-100 text-green-800', label: 'Complete' },
  error: { className: 'bg-red-100 text-red-800', label: 'Error' },
  synced: { className: 'bg-green-100 text-green-800', label: 'Synced' },
  syncing: { className: 'bg-blue-100 text-blue-800', label: 'Syncing' },
  pending_sync: {
    className: 'bg-yellow-100 text-yellow-800',
    label: 'Pending',
  },
}

function StatusBadge({ status }: { status: keyof typeof statusBadgeConfig }) {
  const config = statusBadgeConfig[status]
  if (!config) {
    return <Badge variant="outline">{status}</Badge>
  }

  // Get icon based on status
  let StatusIcon = Clock
  if (status === 'complete' || status === 'synced') {
    StatusIcon = Check
  } else if (status === 'error') {
    StatusIcon = AlertCircle
  } else if (status === 'importing' || status === 'syncing') {
    StatusIcon = Loader2
  }

  return (
    <div className="flex items-center gap-1">
      <StatusIcon
        className={`h-3.5 w-3.5 ${status === 'importing' || status === 'syncing' ? 'animate-spin' : ''}`}
      />
      <Badge className={config.className}>{config.label}</Badge>
    </div>
  )
}

export function ImportStatusCard({
  csvUploads,
  posConnections,
  isLoading,
}: ImportStatusCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Import Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* CSV Uploads Section */}
        <div>
          <h3 className="mb-3 flex items-center gap-2 font-semibold">
            <File className="h-4 w-4" />
            Recent CSV Uploads
          </h3>
          {csvUploads.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No CSV uploads yet.{' '}
              <a href="/import" className="text-blue-500 hover:underline">
                Start importing data
              </a>
            </p>
          ) : (
            <div className="space-y-2">
              {csvUploads.map((upload) => (
                <div
                  key={upload.id}
                  className="border-input flex items-center justify-between rounded border p-3"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <File className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                      <p className="text-sm font-medium">{upload.filename}</p>
                    </div>
                    <p className="text-muted-foreground text-xs">
                      {upload.locationName} •{' '}
                      {new Date(upload.uploadedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="ml-4">
                    <StatusBadge
                      status={
                        (upload.status as keyof typeof statusBadgeConfig) ||
                        'pending'
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* POS Connections Section */}
        <div className="border-t pt-6">
          <h3 className="mb-3 flex items-center gap-2 font-semibold">
            <SquareIcon className="h-4 w-4" />
            Connected POS Accounts
          </h3>
          {posConnections.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No POS connections yet.{' '}
              <a href="/import" className="text-blue-500 hover:underline">
                Connect Square
              </a>
            </p>
          ) : (
            <div className="space-y-2">
              {posConnections.map((connection) => (
                <div
                  key={connection.locationId}
                  className="border-input flex items-center justify-between rounded border p-3"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <SquareIcon className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                      <p className="text-sm font-medium">
                        {connection.locationName} - Square
                      </p>
                    </div>
                    {connection.lastSync && (
                      <p className="text-muted-foreground text-xs">
                        Last synced:{' '}
                        {new Date(connection.lastSync).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="ml-4">
                    <StatusBadge
                      status={
                        (connection.syncState as keyof typeof statusBadgeConfig) ||
                        'pending'
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
