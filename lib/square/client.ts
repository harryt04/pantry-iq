import { SquareTokenResponse, SquareCatalogObject } from './types'

const SQUARE_API_BASE = 'https://connect.squareup.com'

/**
 * Square API Client
 * Handles OAuth flow and transaction fetching
 */
export class SquareClient {
  private appId: string
  private appSecret: string
  private environment: 'sandbox' | 'production'
  private redirectUri: string

  constructor(
    appId: string,
    appSecret: string,
    environment: 'sandbox' | 'production' = 'sandbox',
    redirectUri: string = `${process.env.BETTER_AUTH_URL || 'http://localhost:3000'}/api/square/callback`,
  ) {
    this.appId = appId
    this.appSecret = appSecret
    this.environment = environment
    this.redirectUri = redirectUri
  }

  /**
   * Build OAuth authorization URL
   * User visits this URL to grant permission
   */
  buildOAuthURL(state: string, locationId?: string): string {
    const params = new URLSearchParams({
      client_id: this.appId,
      response_type: 'code',
      scope: [
        'MERCHANT_PROFILE_READ',
        'ORDERS_READ',
        'PAYMENTS_READ',
        'INVENTORY_READ',
      ].join(' '),
      redirect_uri: this.redirectUri,
      state,
      // Optional: restrict to specific location
      ...(locationId && { locale: locationId }),
    })

    return `${SQUARE_API_BASE}/oauth2/authorize?${params.toString()}`
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string): Promise<SquareTokenResponse> {
    const response = await fetch(`${SQUARE_API_BASE}/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Square-Version': '2024-01-18',
      },
      body: JSON.stringify({
        client_id: this.appId,
        client_secret: this.appSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: this.redirectUri,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(
        `Square OAuth token exchange failed: ${error.error_description || error.error}`,
      )
    }

    return response.json()
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<SquareTokenResponse> {
    const response = await fetch(`${SQUARE_API_BASE}/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Square-Version': '2024-01-18',
      },
      body: JSON.stringify({
        client_id: this.appId,
        client_secret: this.appSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Square token refresh failed: ${error.error}`)
    }

    return response.json()
  }

  /**
   * Fetch transactions from Square
   * Normalized to PantryIQ format
   */
  async getTransactions(
    accessToken: string,
    since?: Date,
  ): Promise<PantryIQTransaction[]> {
    const apiBase =
      this.environment === 'production'
        ? 'https://us.api.squareup.com'
        : 'https://connect.squareup.com'

    // Get merchant info to find location
    const merchantResponse = await fetch(`${apiBase}/v2/merchants`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Square-Version': '2024-01-18',
      },
    })

    if (!merchantResponse.ok) {
      const error = await merchantResponse.json()
      throw new Error(`Failed to fetch merchant info: ${error.errors?.[0]?.detail}`)
    }

    const merchantData = await merchantResponse.json()
    const merchantId = merchantData.merchants?.[0]?.id

    if (!merchantId) {
      throw new Error('No merchant found for access token')
    }

    // Fetch orders/transactions
    const params = new URLSearchParams({
      limit: '100',
      sort_order: 'DESC',
      ...(since && {
        begin_time: since.toISOString(),
      }),
    })

    const ordersResponse = await fetch(
      `${apiBase}/v2/orders?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Square-Version': '2024-01-18',
        },
      },
    )

    if (!ordersResponse.ok) {
      const error = await ordersResponse.json()
      throw new Error(`Failed to fetch orders: ${error.errors?.[0]?.detail}`)
    }

    const ordersData = await ordersResponse.json()
    const transactions: PantryIQTransaction[] = []

    // Normalize Square orders to PantryIQ transactions
    if (ordersData.orders && Array.isArray(ordersData.orders)) {
      for (const order of ordersData.orders) {
        if (order.state !== 'COMPLETED' && order.state !== 'OPEN') {
          continue
        }

        const date = new Date(order.created_at)

        if (order.line_items && Array.isArray(order.line_items)) {
          for (const item of order.line_items) {
            const qty = parseInt(item.quantity, 10) || 1
            const revenue = item.gross_sales_money?.amount
              ? item.gross_sales_money.amount / 100
              : 0

            transactions.push({
              locationId: '', // Will be set by caller
              date,
              item: item.name || 'Unknown Item',
              qty,
              revenue,
              source: 'square',
              sourceId: `${order.id}:${item.uid}`,
            })
          }
        }
      }
    }

    return transactions
  }

    const merchantData = await merchantResponse.json()
    const merchantId = merchantData.merchants?.[0]?.id

    if (!merchantId) {
      throw new Error('No merchant found for access token')
    }

    // Fetch orders/transactions
    const params = new URLSearchParams({
      limit: '100',
      sort_order: 'DESC',
      ...(since && {
        begin_time: since.toISOString(),
      }),
    })

    const ordersResponse = await fetch(
      `${apiBase}/v2/orders?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Square-Version': '2024-01-18',
        },
      },
    )

    if (!ordersResponse.ok) {
      const error = await ordersResponse.json()
      throw new Error(`Failed to fetch orders: ${error.errors?.[0]?.detail}`)
    }

    const ordersData = await ordersResponse.json()
    const transactions: PantryIQTransaction[] = []

    // Normalize Square orders to PantryIQ transactions
    if (ordersData.orders && Array.isArray(ordersData.orders)) {
      for (const order of ordersData.orders) {
        if (order.state !== 'COMPLETED' && order.state !== 'OPEN') {
          continue
        }

        const date = new Date(order.created_at)
        const total = order.total_money?.amount
          ? order.total_money.amount / 100
          : 0 // Square uses cents

        if (order.line_items && Array.isArray(order.line_items)) {
          for (const item of order.line_items) {
            const qty = parseInt(item.quantity, 10) || 1
            const revenue = item.gross_sales_money?.amount
              ? item.gross_sales_money.amount / 100
              : 0

            transactions.push({
              locationId: '', // Will be set by caller
              date,
              item: item.name || 'Unknown Item',
              qty,
              revenue,
              source: 'square',
              sourceId: `${order.id}:${item.uid}`,
            })
          }
        }
      }
    }

    return transactions
  }

  /**
   * Get catalog items (for reference)
   */
  async getCatalogItems(accessToken: string): Promise<SquareCatalogObject[]> {
    const response = await fetch(
      'https://connect.squareup.com/v2/catalog/list?types=ITEM',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Square-Version': '2024-01-18',
        },
      },
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Failed to fetch catalog: ${error.errors?.[0]?.detail}`)
    }

    const data = await response.json()
    return data.objects || []
  }
}

/**
 * Factory function to create Square client with env vars
 */
export function createSquareClient(): SquareClient {
  const appId = process.env.SQUARE_APP_ID
  const appSecret = process.env.SQUARE_APP_SECRET
  const environment = (process.env.SQUARE_ENVIRONMENT || 'sandbox') as
    | 'sandbox'
    | 'production'

  if (!appId || !appSecret) {
    throw new Error(
      'SQUARE_APP_ID and SQUARE_APP_SECRET must be set in environment',
    )
  }

  return new SquareClient(appId, appSecret, environment)
}
