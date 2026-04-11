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
          }, 10000)

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
  const [error, setError] = useState<Error | null>(null)
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
    error,
    isConnected,
  }
}

/**
 * Hook to query locations (user's own locations only)
 * Note: This is a stub implementation. Use REST API instead for real data.
 */
export function useLocations(
  client: Zero<Schema> | null | undefined,
  enabled: boolean = true,
) {
  const [locations, setLocations] = useState<Location[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  return { locations, isLoading, error }
}

/**
 * Hook to query conversations for a location
 * Note: This is a stub implementation. Use REST API instead for real data.
 */
export function useConversations(
  client: Zero<Schema> | null | undefined,
  locationId: string | null,
  enabled: boolean = true,
) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  return { conversations, isLoading, error }
}

/**
 * Hook to query messages for a conversation
 * Note: This is a stub implementation. Use REST API instead for real data.
 */
export function useMessages(
  client: Zero<Schema> | null | undefined,
  conversationId: string | null,
  enabled: boolean = true,
) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  return { messages, isLoading, error }
}

/**
 * Hook to query CSV uploads for a location
 * Note: This is a stub implementation. Use REST API instead for real data.
 */
export function useCsvUploads(
  client: Zero<Schema> | null | undefined,
  locationId: string | null,
  enabled: boolean = true,
) {
  const [uploads, setUploads] = useState<CsvUpload[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  return { uploads, isLoading, error }
}

/**
 * Hook to query transactions for a location
 * Note: This is a stub implementation. Use REST API instead for real data.
 */
export function useTransactions(
  client: Zero<Schema> | null | undefined,
  locationId: string | null,
  enabled: boolean = true,
) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  return { transactions, isLoading, error }
}

/**
 * Hook to query POS connections for a location
 * Note: This is a stub implementation. Use REST API instead for real data.
 */
export function usePosConnections(
  client: Zero<Schema> | null | undefined,
  locationId: string | null,
  enabled: boolean = true,
) {
  const [connections, setConnections] = useState<PosConnection[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  return { connections, isLoading, error }
}

export type {
  Location,
  Conversation,
  Message,
  CsvUpload,
  Transaction,
  PosConnection,
}
