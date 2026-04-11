/**
 * Hashes a location ID to create a pseudonymous identifier
 * Uses SHA-256 for consistent hashing via Web Crypto API
 */
export async function hashLocationId(locationId: string): Promise<string> {
  try {
    const encoder = new TextEncoder()
    const data = encoder.encode(locationId)
    const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
    return hashHex.slice(0, 16)
  } catch (error) {
    // Fallback: return truncated location ID if hashing fails (non-critical)
    console.debug('Failed to hash location ID:', error)
    return locationId.slice(0, 16)
  }
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

  // Dynamic import to handle client-side only
  // Use .catch() to handle promise rejection (not awaited, so try/catch won't catch it)
  import('posthog-js')
    .then(({ default: posthog }) => {
      if (posthog && typeof posthog.capture === 'function') {
        // Non-blocking capture
        posthog.capture(eventName, properties || {})
      }
    })
    .catch((error) => {
      // Silently fail - analytics should never break the app
      console.debug('Analytics capture failed:', error)
    })
}
