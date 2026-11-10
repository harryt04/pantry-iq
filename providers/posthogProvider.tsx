'use client'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'

const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY

// Analytics is optional (see README "Environment variables"): a production
// build without a key must still render, so it skips initialisation rather
// than throwing and crashing every page on the client.
const analyticsEnabled =
  process.env.NODE_ENV === 'production' &&
  typeof window !== 'undefined' &&
  Boolean(posthogKey)

if (analyticsEnabled && posthogKey) {
  posthog.init(posthogKey, {
    api_host: '/ingest',
    ui_host: 'https://us.posthog.com',
  })
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathName = usePathname()

  useEffect(() => {
    if (!analyticsEnabled) {
      return
    }
    posthog.capture('$pageview', { pathName })
  }, [pathName])

  if (!analyticsEnabled) {
    return <>{children}</> // Don't send events in dev mode
  }

  return <PHProvider client={posthog}>{children}</PHProvider>
}
