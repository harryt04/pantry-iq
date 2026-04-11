'use client'

import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'line' | 'card' | 'avatar' | 'text'
  count?: number
}

export function Skeleton({
  className,
  variant = 'line',
  count = 1,
  ...props
}: SkeletonProps) {
  const skeletonClass = 'animate-pulse rounded bg-muted'

  const variantClasses = {
    line: 'h-4 w-full',
    card: 'h-24 w-full rounded-lg',
    avatar: 'h-12 w-12 rounded-full',
    text: 'h-3 w-full',
  }

  const baseClass = variantClasses[variant]

  if (count > 1 && variant === 'line') {
    return (
      <div className="space-y-2" {...props}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className={cn(skeletonClass, baseClass, className)} />
        ))}
      </div>
    )
  }

  return <div className={cn(skeletonClass, baseClass, className)} {...props} />
}

export function SkeletonCard() {
  return (
    <div className="space-y-3 rounded-lg border p-4">
      <Skeleton className="h-6 w-2/3" />
      <Skeleton variant="text" count={3} />
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-8 w-20 rounded" />
        <Skeleton className="h-8 w-20 rounded" />
      </div>
    </div>
  )
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <Skeleton variant="avatar" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}
