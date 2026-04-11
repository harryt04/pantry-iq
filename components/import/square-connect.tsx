'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { AlertCircle, Loader2, CheckCircle, XCircle } from 'lucide-react'
import { captureAnalyticsEvent } from '@/lib/analytics-utils'

type SyncState = 'pending' | 'syncing' | 'synced' | 'error' | 'disconnected'

interface SquareConnectProps {
  locationId: string
  onConnectionSuccess?: (connectionId: string) => void
}

export function SquareConnect({
  locationId,
  onConnectionSuccess,
}: SquareConnectProps) {
  const [status, setStatus] = useState<SyncState>('disconnected')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [connectionId, setConnectionId] = useState<string | null>(null)
  const [lastSync, setLastSync] = useState<Date | null>(null)

  // Check for connection status on mount and from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const connected = params.get('square_connected')
    const connId = params.get('connection_id')
    const errorParam = params.get('error')

    if (connected === 'true' && connId) {
      setConnectionId(connId)
      setStatus('syncing')
      captureAnalyticsEvent('square-connected', {})
      onConnectionSuccess?.(connId)
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname)
    } else if (errorParam) {
      const details = params.get('details')
      setError(details || errorParam)
      setStatus('error')
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [onConnectionSuccess])

  const handleConnect = async () => {
    if (!locationId) {
      setError('Location ID is required')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/square/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationId }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to initiate connection')
      }

      const { authURL } = await response.json()
      // Redirect to Square OAuth
      window.location.href = authURL
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed')
      setStatus('error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDisconnect = async () => {
    if (!connectionId) return

    setIsLoading(true)
    try {
      // TODO: Implement disconnect endpoint
      setConnectionId(null)
      setStatus('disconnected')
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Disconnect failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleManualSync = async () => {
    if (!connectionId) return

    setIsLoading(true)
    setStatus('syncing')
    setError(null)

    try {
      const response = await fetch('/api/square/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Sync failed')
      }

      const { synced, errors } = await response.json()
      setStatus('synced')
      setLastSync(new Date())

      if (errors > 0) {
        setError(`Synced ${synced} transactions with ${errors} errors`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed')
      setStatus('error')
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'synced':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'syncing':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />
      default:
        return null
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'pending':
        return 'Pending connection'
      case 'syncing':
        return 'Syncing transactions...'
      case 'synced':
        return `Connected and synced${lastSync ? ` (${lastSync.toLocaleString()})` : ''}`
      case 'error':
        return 'Connection error'
      case 'disconnected':
      default:
        return 'Not connected'
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-purple-600 text-xs font-bold text-white">
            S
          </div>
          Connect Square
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Display */}
        <div className="bg-muted flex items-center gap-2 rounded-lg p-3">
          {getStatusIcon()}
          <span className="text-sm font-medium">{getStatusText()}</span>
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <div>
              <p className="font-medium">Error</p>
              <p className="text-red-600">{error}</p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {status === 'disconnected' ? (
            <Button
              onClick={handleConnect}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                'Connect Square'
              )}
            </Button>
          ) : (
            <>
              <Button
                onClick={handleManualSync}
                disabled={isLoading || status === 'syncing'}
                variant="outline"
                className="flex-1"
              >
                {isLoading && status === 'syncing' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  'Sync Now'
                )}
              </Button>
              <Button
                onClick={handleDisconnect}
                disabled={isLoading}
                variant="destructive"
              >
                Disconnect
              </Button>
            </>
          )}
        </div>

        <p className="text-muted-foreground text-xs">
          Connect your Square POS account to sync inventory and sales data.
        </p>
      </CardContent>
    </Card>
  )
}
