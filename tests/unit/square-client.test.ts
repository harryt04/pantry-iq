import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SquareClient, createSquareClient } from '@/lib/square/client'
import { encrypt, decrypt } from '@/lib/square/encryption'
import type { SquareTokenResponse } from '@/lib/square/types'

describe('SquareClient', () => {
  let client: SquareClient

  beforeEach(() => {
    client = new SquareClient(
      'test-app-id',
      'test-app-secret',
      'sandbox',
      'http://localhost:3000/api/square/callback',
    )
  })

  describe('buildOAuthURL', () => {
    it('should generate a valid OAuth URL with correct scopes', () => {
      const state = 'test-state-123'
      const url = client.buildOAuthURL(state)

      expect(url).toContain('https://connect.squareup.com/oauth2/authorize')
      expect(url).toContain('client_id=test-app-id')
      expect(url).toContain('response_type=code')
      expect(url).toContain('state=test-state-123')
      expect(url).toContain('MERCHANT_PROFILE_READ')
      expect(url).toContain('ORDERS_READ')
      expect(url).toContain('PAYMENTS_READ')
      expect(url).toContain('INVENTORY_READ')
      expect(url).toContain('redirect_uri=')
    })

    it('should include location ID when provided', () => {
      const state = 'test-state-123'
      const locationId = 'location-456'
      const url = client.buildOAuthURL(state, locationId)

      expect(url).toContain('locale=location-456')
    })

    it('should have correct redirect URI', () => {
      const state = 'test-state'
      const url = client.buildOAuthURL(state)

      expect(url).toContain(
        'redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fapi%2Fsquare%2Fcallback',
      )
    })
  })

  describe('exchangeCodeForToken', () => {
    it('should exchange authorization code for tokens', async () => {
      const mockResponse: SquareTokenResponse = {
        access_token: 'test-access-token',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'test-refresh-token',
        merchant_id: 'merchant-123',
      }

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const result = await client.exchangeCodeForToken('auth-code-123')

      expect(result).toEqual(mockResponse)
      expect(global.fetch).toHaveBeenCalledWith(
        'https://connect.squareup.com/oauth2/token',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        }),
      )
    })

    it('should handle token exchange errors', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: 'invalid_request',
          error_description: 'Invalid authorization code',
        }),
      })

      await expect(client.exchangeCodeForToken('invalid-code')).rejects.toThrow(
        'Square OAuth token exchange failed',
      )
    })
  })

  describe('getTransactions', () => {
    it('should fetch and normalize transactions', async () => {
      const mockMerchantResponse = {
        merchants: [{ id: 'merchant-123' }],
      }

      const mockOrdersResponse = {
        orders: [
          {
            id: 'order-1',
            created_at: '2024-01-15T10:00:00Z',
            state: 'COMPLETED',
            total_money: { amount: 2500, currency: 'USD' },
            line_items: [
              {
                uid: 'item-1',
                name: 'Widget A',
                quantity: '2',
                gross_sales_money: { amount: 2000, currency: 'USD' },
              },
            ],
          },
        ],
      }

      global.fetch = vi.fn()
      const fetchMock = global.fetch as ReturnType<typeof vi.fn>
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockMerchantResponse,
      } as Response)
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockOrdersResponse,
      } as Response)

      const transactions = await client.getTransactions('access-token-123')

      expect(transactions).toHaveLength(1)
      expect(transactions[0]).toMatchObject({
        item: 'Widget A',
        qty: 2,
        revenue: 20, // 2000 cents = $20
        source: 'square',
      })
    })

    it('should filter out non-completed orders', async () => {
      const mockMerchantResponse = {
        merchants: [{ id: 'merchant-123' }],
      }

      const mockOrdersResponse = {
        orders: [
          {
            id: 'order-1',
            created_at: '2024-01-15T10:00:00Z',
            state: 'PENDING',
            total_money: { amount: 1000, currency: 'USD' },
            line_items: [
              {
                uid: 'item-1',
                name: 'Widget A',
                quantity: '1',
                gross_sales_money: { amount: 1000, currency: 'USD' },
              },
            ],
          },
        ],
      }

      global.fetch = vi.fn()
      const fetchMock = global.fetch as ReturnType<typeof vi.fn>
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockMerchantResponse,
      } as Response)
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockOrdersResponse,
      } as Response)

      const transactions = await client.getTransactions('access-token-123')

      expect(transactions).toHaveLength(0)
    })

    it('should handle transaction fetch errors', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          errors: [{ detail: 'Unauthorized' }],
        }),
      })

      await expect(client.getTransactions('invalid-token')).rejects.toThrow(
        'Failed to fetch merchant info',
      )
    })
  })
})

describe('Encryption utilities', () => {
  it('should encrypt and decrypt strings', () => {
    process.env.BETTER_AUTH_SECRET = 'test-secret-key-32-chars-minimum'

    const plaintext = 'sensitive-token-data'
    const encrypted = encrypt(plaintext)

    expect(encrypted).not.toEqual(plaintext)
    expect(encrypted).toContain(':')

    const decrypted = decrypt(encrypted)
    expect(decrypted).toEqual(plaintext)
  })

  it('should produce different ciphertexts for same plaintext', () => {
    process.env.BETTER_AUTH_SECRET = 'test-secret-key-32-chars-minimum'

    const plaintext = 'test-token'
    const encrypted1 = encrypt(plaintext)
    const encrypted2 = encrypt(plaintext)

    expect(encrypted1).not.toEqual(encrypted2)

    expect(decrypt(encrypted1)).toEqual(plaintext)
    expect(decrypt(encrypted2)).toEqual(plaintext)
  })

  it('should throw on invalid encrypted format', () => {
    process.env.BETTER_AUTH_SECRET = 'test-secret-key-32-chars-minimum'

    expect(() => decrypt('invalid-format')).toThrow('Invalid encrypted format')
  })
})

describe('createSquareClient', () => {
  it('should create client with environment variables', () => {
    process.env.SQUARE_APP_ID = 'test-app-id'
    process.env.SQUARE_APP_SECRET = 'test-app-secret'
    process.env.SQUARE_ENVIRONMENT = 'sandbox'

    const client = createSquareClient()
    expect(client).toBeInstanceOf(SquareClient)
  })

  it('should throw if credentials are missing', () => {
    delete process.env.SQUARE_APP_ID
    delete process.env.SQUARE_APP_SECRET

    expect(() => createSquareClient()).toThrow(
      'SQUARE_APP_ID and SQUARE_APP_SECRET must be set',
    )
  })
})
