import { useEffect, useState } from 'react'
import { Zero } from '@rocicorp/zero'
import { schema } from './schema'
import type {
  Location,
  Conversation,
  Message,
  CsvUpload,
  Transaction,
  PosConnection,
  Schema,
} from './schema'

let zeroClient: Zero<Schema> | null = null
let zeroPromise: Promise<Zero<Schema>> | null = null

/**
 * Initialize or retrieve the Zero client singleton
 * This ensures only one client connection exists per app lifecycle
 */
export async function getZeroClient(userId: string): Promise<Zero<Schema>> {
  // Return existing client if available
  if (zeroClient) {
    return zeroClient
  }

  // Return existing promise if initialization is in progress
  if (zeroPromise) {
    return zeroPromise
  }

  // Create new initialization promise
  zeroPromise = (async () => {
    try {
      // Initialize Zero client connecting to local cache server
      // Note: Zero connects asynchronously in the background
      const client = new Zero({
        userID: userId,
        cacheURL: process.env.NEXT_PUBLIC_ZERO_URL || 'http://localhost:8001',
        schema,
      })

      // Optionally wait for connection with timeout
      try {
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Zero connection timeout'))
          }, 2000) // Reduced to 2s for CI compatibility and faster startup

          interface ConnectionStateSubscription {
            subscribe: (
              callback: (state: { name: string; reason?: string }) => void,
            ) => () => void
          }
          const connectionState = client.connection
            .state as ConnectionStateSubscription
          const unsubscribe = connectionState.subscribe((state) => {
            if (state.name === 'open') {
              clearTimeout(timeout)
              unsubscribe()
              resolve()
            }
          })
        })
      } catch {
        // Connection timeout or error - continue anyway with cached data
        console.warn('Zero connection failed, will use cached data')
      }

      zeroClient = client
      zeroPromise = null

      return client
    } catch (error) {
      zeroPromise = null
      throw error
    }
  })()

  return zeroPromise
}

/**
 * Get the current Zero client or null if not initialized
 */
export function getZeroClientSync(): Zero<Schema> | null {
  return zeroClient
}

/**
 * Close the Zero client connection
 */
export async function closeZeroClient(): Promise<void> {
  if (zeroClient) {
    try {
      await zeroClient.close()
    } catch {
      // Ignore errors during close
    }
    zeroClient = null
  }
}

/**
 * Hook to use Zero client with auto-initialization for authenticated users
 */
export function useZero() {
  const [client, setClient] = useState<Zero<Schema> | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  // Note: userId should come from the useSession hook in the provider
  // This hook will be called only for authenticated users
  useEffect(() => {
    // Client initialization happens in ZeroProvider
    // This effect just tracks the current client state
    const interval = setInterval(() => {
      const current = getZeroClientSync()
      setClient(current)
      setIsConnected(!!current)
    }, 100)

    return () => clearInterval(interval)
  }, [])

  return {
    client,
    isConnected,
  }
}

/**
 * Hook to query locations (user's own locations only)
 * Note: This is a stub implementation. Use REST API instead for real data.
 */
export function useLocations() {
  const [locations] = useState<Location[]>([])

  return { locations, isLoading: false, error: null }
}

/**
 * Hook to query conversations for a location
 * Note: This is a stub implementation. Use REST API instead for real data.
 */
export function useConversations() {
  const [conversations] = useState<Conversation[]>([])

  return { conversations, isLoading: false, error: null }
}

/**
 * Hook to query messages for a conversation
 * Note: This is a stub implementation. Use REST API instead for real data.
 */
export function useMessages() {
  const [messages] = useState<Message[]>([])

  return { messages, isLoading: false, error: null }
}

/**
 * Hook to query CSV uploads for a location
 * Note: This is a stub implementation. Use REST API instead for real data.
 */
export function useCsvUploads() {
  const [uploads] = useState<CsvUpload[]>([])

  return { uploads, isLoading: false, error: null }
}

/**
 * Hook to query transactions for a location
 * Note: This is a stub implementation. Use REST API instead for real data.
 */
export function useTransactions() {
  const [transactions] = useState<Transaction[]>([])

  return { transactions, isLoading: false, error: null }
}

/**
 * Hook to query POS connections for a location
 * Note: This is a stub implementation. Use REST API instead for real data.
 */
export function usePosConnections() {
  const [connections] = useState<PosConnection[]>([])

  return { connections, isLoading: false, error: null }
}

export type {
  Location,
  Conversation,
  Message,
  CsvUpload,
  Transaction,
  PosConnection,
}
