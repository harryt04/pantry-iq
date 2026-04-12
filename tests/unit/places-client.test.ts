import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { getDonationOpportunities } from '@/lib/places/client'
import { db } from '@/db'
import type { MockedFunction } from 'vitest'

// Mock database and fetch
vi.mock('@/db')
vi.mock('drizzle-orm')

global.fetch = vi.fn()

interface MockPlacesRecord {
  id: string
  locationId: string
  orgName: string
  address: string
  phone: string
  hours: string
  types: string[]
  cachedAt: Date
}

interface DbSelectBuilder {
  from: (table: unknown) => DbWhereBuilder
}

interface DbWhereBuilder {
  where: (condition: unknown) => Promise<MockPlacesRecord[]>
}

interface DbInsertBuilder {
  values: (values: unknown) => Promise<void>
}

interface DbDeleteBuilder {
  where: (condition: unknown) => Promise<void>
}

interface MockDb {
  select: MockedFunction<() => DbSelectBuilder>
  insert: MockedFunction<() => DbInsertBuilder>
  delete: MockedFunction<() => DbDeleteBuilder>
}

describe('Places Client - getDonationOpportunities', () => {
  const locationId = '550e8400-e29b-41d4-a716-446655440000'
  const zipCode = '10001'
  const now = new Date()

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.GOOGLE_PLACES_API_KEY = 'test-api-key'
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('Cache hit - returns stored data', () => {
    it('should return cached data if fresh (less than 30 days old)', async () => {
      const mockCachedData: Record<string, unknown>[] = [
        {
          id: '1',
          locationId,
          orgName: 'Salvation Army Food Pantry',
          address: '123 Main St, New York, NY 10001',
          phone: '(212) 555-0123',
          hours: 'Mon-Fri: 9AM-5PM',
          types: JSON.stringify(['food_pantry', 'charity']),
          cachedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        },
        {
          id: '2',
          locationId,
          orgName: 'City Soup Kitchen',
          address: '456 Park Ave, New York, NY 10001',
          phone: '(212) 555-0456',
          hours: 'Daily: 11AM-3PM',
          types: JSON.stringify(['soup_kitchen', 'food_service']),
          cachedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        },
      ]

      // Mock database operations
      const mockWhere = vi.fn().mockResolvedValue(mockCachedData)
      const mockFrom = vi.fn().mockReturnValue({
        where: mockWhere,
      })
      const typedDb = db as unknown as MockDb
      typedDb.select.mockReturnValue({
        from: mockFrom,
      })

      const result = await getDonationOpportunities(locationId, zipCode)

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({
        orgName: 'Salvation Army Food Pantry',
        address: '123 Main St, New York, NY 10001',
        phone: '(212) 555-0123',
        hours: 'Mon-Fri: 9AM-5PM',
        types: ['food_pantry', 'charity'],
      })
      expect(result[1]).toEqual({
        orgName: 'City Soup Kitchen',
        address: '456 Park Ave, New York, NY 10001',
        phone: '(212) 555-0456',
        hours: 'Daily: 11AM-3PM',
        types: ['soup_kitchen', 'food_service'],
      })

      // Verify API wasn't called
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('should return empty array if no cached records exist', async () => {
      // Mock database select to return empty array
      const mockWhere = vi.fn().mockResolvedValue([])
      const mockFrom = vi.fn().mockReturnValue({
        where: mockWhere,
      })
      const typedDb = db as unknown as MockDb
      typedDb.select.mockReturnValue({
        from: mockFrom,
      })

      // Mock Google Places API to return empty results
      ;(global.fetch as MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'ZERO_RESULTS',
          results: [],
        }),
      } as Response)

      const result = await getDonationOpportunities(locationId, zipCode)

      expect(result).toEqual([])
    })
  })

  describe('Cache miss - calls API and stores', () => {
    it('should call Google Places API when cache is empty', async () => {
      // Mock database select to return empty (cache miss)
      const mockWhere = vi.fn().mockResolvedValue([])
      const mockFrom = vi.fn().mockReturnValue({
        where: mockWhere,
      })
      const typedDb = db as unknown as MockDb
      typedDb.select.mockReturnValue({
        from: mockFrom,
      })

      // Mock database insert and delete
      typedDb.insert.mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      })
      typedDb.delete.mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      })

      // Mock Google Places API responses
      ;(global.fetch as MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'ZERO_RESULTS',
          results: [],
        }),
      } as Response)

      await getDonationOpportunities(locationId, zipCode)

      // Verify API was called 3 times (for 3 search queries: food bank, soup kitchen, food pantry)
      expect(global.fetch).toHaveBeenCalledTimes(3)
    })
  })

  describe('Cache expiry - triggers refresh (30-day TTL)', () => {
    it('should refresh cache if older than 30 days', async () => {
      const staleDate = new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000) // 31 days ago

      const mockStaleCache: MockPlacesRecord[] = [
        {
          id: '1',
          locationId,
          orgName: 'Old Food Bank',
          address: 'Old Address',
          phone: 'Old Phone',
          hours: 'Old Hours',
          types: ['food_bank'],
          cachedAt: staleDate,
        },
      ]

      // Mock database select to return stale cache
      const mockWhere = vi.fn().mockResolvedValue(mockStaleCache)
      const mockFrom = vi.fn().mockReturnValue({
        where: mockWhere,
      })
      const typedDb = db as unknown as MockDb
      typedDb.select.mockReturnValue({
        from: mockFrom,
      })

      // Mock database delete
      typedDb.delete.mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      })

      // Mock database insert
      typedDb.insert.mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      })

      // Mock new API results
      ;(global.fetch as MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'ZERO_RESULTS',
          results: [],
        }),
      } as Response)

      await getDonationOpportunities(locationId, zipCode)

      // Verify old cache was deleted
      expect(db.delete).toHaveBeenCalled()

      // Verify API was called to fetch new data
      expect(global.fetch).toHaveBeenCalledTimes(3)
    })

    it('should not refresh cache if fresher than 30 days', async () => {
      const freshDate = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000) // 29 days ago

      const mockFreshCache: Record<string, unknown>[] = [
        {
          id: '1',
          locationId,
          orgName: 'Fresh Food Bank',
          address: 'Fresh Address',
          phone: 'Fresh Phone',
          hours: 'Fresh Hours',
          types: JSON.stringify(['food_bank']),
          cachedAt: freshDate,
        },
      ]

      // Mock database select to return fresh cache
      const mockWhere = vi.fn().mockResolvedValue(mockFreshCache)
      const mockFrom = vi.fn().mockReturnValue({
        where: mockWhere,
      })
      const typedDb = db as unknown as MockDb
      typedDb.select.mockReturnValue({
        from: mockFrom,
      })

      const result = await getDonationOpportunities(locationId, zipCode)

      expect(result).toHaveLength(1)
      expect(result[0].orgName).toBe('Fresh Food Bank')

      // Verify API was NOT called
      expect(global.fetch).not.toHaveBeenCalled()

      // Verify delete and insert were NOT called
      expect(db.delete).not.toHaveBeenCalled()
      expect(db.insert).not.toHaveBeenCalled()
    })
  })

  describe('API error handling - graceful errors', () => {
    it('should return empty array if Google Places API fails', async () => {
      // Mock database select to return empty (cache miss)
      const mockWhere = vi.fn().mockResolvedValue([])
      const mockFrom = vi.fn().mockReturnValue({
        where: mockWhere,
      })
      const typedDb = db as unknown as MockDb
      typedDb.select.mockReturnValue({
        from: mockFrom,
      })

      // Mock API error
      ;(global.fetch as MockedFunction<typeof fetch>).mockRejectedValue(
        new Error('Network error'),
      )

      const result = await getDonationOpportunities(locationId, zipCode)

      expect(result).toEqual([])
    })

    it('should handle API error status gracefully', async () => {
      // Mock database select to return empty (cache miss)
      const mockWhere = vi.fn().mockResolvedValue([])
      const mockFrom = vi.fn().mockReturnValue({
        where: mockWhere,
      })
      const typedDb = db as unknown as MockDb
      typedDb.select.mockReturnValue({
        from: mockFrom,
      })

      // Mock API error response
      ;(global.fetch as MockedFunction<typeof fetch>).mockResolvedValue({
        ok: false,
        statusText: 'Unauthorized',
      } as Response)

      const result = await getDonationOpportunities(locationId, zipCode)

      expect(result).toEqual([])
    })

    it('should handle database errors gracefully', async () => {
      // Mock database select to throw error
      const mockWhere = vi
        .fn()
        .mockRejectedValue(new Error('DB connection failed'))
      const mockFrom = vi.fn().mockReturnValue({
        where: mockWhere,
      })
      const typedDb = db as unknown as MockDb
      typedDb.select.mockReturnValue({
        from: mockFrom,
      })

      const result = await getDonationOpportunities(locationId, zipCode)

      expect(result).toEqual([])
    })
  })

  describe('Edge cases', () => {
    it('should search all three food-related queries', async () => {
      // Mock database select to return empty (cache miss)
      const mockWhere = vi.fn().mockResolvedValue([])
      const mockFrom = vi.fn().mockReturnValue({
        where: mockWhere,
      })
      const typedDb = db as unknown as MockDb
      typedDb.select.mockReturnValue({
        from: mockFrom,
      })
      ;(global.fetch as MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'ZERO_RESULTS',
          results: [],
        }),
      } as Response)

      await getDonationOpportunities(locationId, zipCode)

      // Should be called 3 times for 3 search queries
      expect(global.fetch).toHaveBeenCalledTimes(3)

      // Verify each search query was included
      const typedFetch = global.fetch as MockedFunction<typeof fetch>
      const calls = typedFetch.mock.calls
      const queryParams = calls.map((call: any) =>
        new URL(call[0]).searchParams.get('query'),
      )

      expect(queryParams).toContain(`food bank ${zipCode}`)
      expect(queryParams).toContain(`soup kitchen ${zipCode}`)
      expect(queryParams).toContain(`food pantry ${zipCode}`)
    })
  })
})
