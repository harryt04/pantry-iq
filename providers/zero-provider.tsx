'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { Zero } from '@rocicorp/zero'
import { getZeroClient, closeZeroClient } from '@/lib/zero'
import { useSession } from '@/lib/auth-client'
import type { Schema } from '@/lib/zero/schema'

/**
 * ZeroContext provides access to the Zero client throughout the app
 */
interface ZeroContextType {
  client: Zero<Schema> | null
  isConnected: boolean
  error: Error | null
  isInitializing: boolean
}

const ZeroContext = createContext<ZeroContextType>({
  client: null,
  isConnected: false,
  error: null,
  isInitializing: true,
})

/**
 * Hook to access the Zero client from context
 */
export function useZeroClient() {
  const context = useContext(ZeroContext)
  if (!context) {
    throw new Error('useZeroClient must be used within ZeroProvider')
  }
  return context
}

/**
 * ZeroProvider Component
 *
 * Initializes the Zero client when a user is authenticated.
 * - Only initializes client for authenticated users (security)
 * - Handles connection lifecycle
 * - Provides graceful fallback if Zero is unavailable
 * - Enables offline-first architecture with local caching
 */
export function ZeroProvider({ children }: { children: React.ReactNode }) {
  const { data: session, isPending: isSessionPending } = useSession()
  const [client, setClient] = useState<Zero<Schema> | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)

  useEffect(() => {
    // Don't initialize Zero until we know the session state
    if (isSessionPending) {
      return
    }

    // Only initialize Zero for authenticated users
    if (!session?.user?.id) {
      // Use state setter callback to avoid sync setState in effect
      Promise.resolve().then(() => {
        setIsInitializing(false)
        setClient(null)
        setIsConnected(false)
      })
      return
    }

    let isMounted = true
    let unsubscribed = false

    const initializeZero = async () => {
      try {
        setIsInitializing(true)
        setError(null)

        // Get or create Zero client
        const zeroClient = await getZeroClient(session.user.id)

        if (!isMounted || unsubscribed) {
          return
        }

        setClient(zeroClient)
        setIsConnected(true)
        setIsInitializing(false)
      } catch (err) {
        if (!isMounted || unsubscribed) {
          return
        }

        const error = err instanceof Error ? err : new Error(String(err))

        console.error(
          'Zero initialization failed (graceful fallback enabled):',
          error,
        )

        // Graceful fallback: continue without Zero
        // The app will fall back to REST API calls
        setError(error)
        setClient(null)
        setIsConnected(false)
        setIsInitializing(false)
      }
    }

    initializeZero()

    return () => {
      isMounted = false
      unsubscribed = true
      // Don't close the client here - let it persist for the app lifecycle
      // This allows multiple providers/components to share the same client
    }
  }, [session?.user?.id, isSessionPending])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Optional: Close Zero client on app unmount
      // Commented out to keep connection alive during app lifetime
      // closeZeroClient().catch(() => {})
    }
  }, [])

  const value: ZeroContextType = {
    client,
    isConnected,
    error,
    isInitializing,
  }

  return <ZeroContext.Provider value={value}>{children}</ZeroContext.Provider>
}

/**
 * Higher-order component to wrap a component with ZeroProvider
 * Useful for lazy-loaded or dynamically imported components
 */
export function withZeroProvider<P extends object>(
  Component: React.ComponentType<P>,
): React.ComponentType<P> {
  return function WrappedComponent(props: P) {
    return (
      <ZeroProvider>
        <Component {...props} />
      </ZeroProvider>
    )
  }
}
