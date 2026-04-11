'use client'

import type { ReactNode } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from './button'

export interface ErrorMessageProps {
  message: string
  code?: string
  onRetry?: () => void
  showRetry?: boolean
  icon?: ReactNode
}

export function ErrorMessage({
  message,
  code,
  onRetry,
  showRetry = true,
  icon,
}: ErrorMessageProps) {
  return (
    <div className="border-destructive/50 bg-destructive/10 rounded-lg border p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex-shrink-0">
          {icon || <AlertCircle className="text-destructive h-5 w-5" />}
        </div>
        <div className="flex-1">
          <p className="text-destructive text-sm font-medium">{message}</p>
          {code && (
            <p className="text-destructive/70 mt-1 text-xs">
              Error code: {code}
            </p>
          )}
        </div>
        {showRetry && onRetry && (
          <Button
            onClick={onRetry}
            size="sm"
            variant="outline"
            className="ml-auto flex-shrink-0"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        )}
      </div>
    </div>
  )
}
