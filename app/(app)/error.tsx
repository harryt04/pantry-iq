'use client'

import { useEffect } from 'react'
import { AlertCircle, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

export interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ErrorBoundary({ error, reset }: ErrorPageProps) {
  const router = useRouter()

  useEffect(() => {
    // Log the error for debugging (but don't expose to user)
    console.error('Error boundary caught:', error)
  }, [error])

  const isDev = process.env.NODE_ENV === 'development'

  return (
    <div className="bg-muted/50 flex h-screen w-full items-center justify-center">
      <div className="bg-background w-full max-w-md space-y-6 rounded-lg border p-8 shadow-lg">
        <div className="flex items-center justify-center">
          <div className="bg-destructive/10 rounded-full p-3">
            <AlertCircle className="text-destructive h-6 w-6" />
          </div>
        </div>

        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">
            Something went wrong
          </h1>
          <p className="text-muted-foreground text-sm">
            We encountered an unexpected error. Try refreshing the page or
            return to the dashboard.
          </p>
        </div>

        {isDev && error.message && (
          <div className="rounded border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950">
            <p className="font-mono text-xs text-amber-900 dark:text-amber-100">
              <span className="font-bold">Dev Info:</span> {error.message}
            </p>
          </div>
        )}

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button onClick={reset} className="flex-1" variant="default">
            Try again
          </Button>
          <Button
            onClick={() => router.push('/dashboard')}
            variant="outline"
            className="flex-1"
          >
            <Home className="mr-2 h-4 w-4" />
            Dashboard
          </Button>
        </div>

        <p className="text-muted-foreground text-center text-xs">
          If the problem persists, please contact support.
        </p>
      </div>
    </div>
  )
}
