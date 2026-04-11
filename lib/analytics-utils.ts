import { createHash } from 'crypto'

/**
 * Hashes a location ID to create a pseudonymous identifier
 * Uses SHA-256 for consistent hashing
 */
export function hashLocationId(locationId: string): string {
  return createHash('sha256').update(locationId).digest('hex').slice(0, 16)
}

/**
 * Safely captures a PostHog event only in production
 * Non-blocking: does not await the response
 */
export function captureAnalyticsEvent(
  eventName: string,
  properties?: Record<string, unknown>,
): void {
  // Only send events in production
  if (typeof window === 'undefined' || process.env.NODE_ENV !== 'production') {
    return
  }

  try {
    // Dynamic import to handle client-side only
    import('posthog-js').then(({ default: posthog }) => {
      if (posthog && typeof posthog.capture === 'function') {
        // Non-blocking capture
        posthog.capture(eventName, properties || {})
      }
    })
  } catch (error) {
    // Silently fail - analytics should never break the app
    console.debug('Analytics capture failed:', error)
  }
}
