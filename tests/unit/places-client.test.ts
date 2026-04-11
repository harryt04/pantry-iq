import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { getDonationOpportunities } from '@/lib/places/client'
import { db } from '@/db'
import { placesCache } from '@/db/schema'
import { eq } from 'drizzle-orm'

// Mock database and fetch
vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    delete: vi.fn(),
  },
}))

global.fetch = vi.fn()

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
      const mockCachedData = [
        {
          id: '1',
          locationId,
          orgName: 'Salvation Army Food Pantry',
          address: '123 Main St, New York, NY 10001',
          phone: '(212) 555-0123',
          hours: 'Mon-Fri: 9AM-5PM',
          types: ['food_pantry', 'charity'],
          cachedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        },
        {
          id: '2',
          locationId,
          orgName: 'City Soup Kitchen',
          address: '456 Park Ave, New York, NY 10001',
          phone: '(212) 555-0456',
          hours: 'Daily: 11AM-3PM',
          types: ['soup_kitchen', 'food_service'],
          cachedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        },
      ]

      // Mock database select to return cached data
      const mockFrom = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(mockCachedData),
      })

      ;(db.select as any).mockReturnValue({
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
      const mockFrom = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      })

      ;(db.select as any).mockReturnValue({
        from: mockFrom,
      })

      // Mock Google Places API to return empty results
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'ZERO_RESULTS',
          results: [],
        }),
      })

      const result = await getDonationOpportunities(locationId, zipCode)

      expect(result).toEqual([])
    })
  })

  describe('Cache miss - calls API and stores', () => {
    it('should call Google Places API and cache fresh results', async () => {
      // Mock database select to return empty (cache miss)
      const mockFrom = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      })

      ;(db.select as any).mockReturnValue({
        from: mockFrom,
      })

      // Mock database insert
      const mockInsertFrom = vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      })

      ;(db.insert as any).mockReturnValue({
        values: mockInsertFrom,
      })

      // Mock Google Places API responses
      ;(global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('food%20bank')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              status: 'OK',
              results: [
                {
                  name: 'Community Food Bank',
                  formatted_address: '789 Oak St, New York, NY 10001',
                  formatted_phone_number: '(212) 555-0789',
                  opening_hours: {
                    weekday_text: ['Monday: 9:00 AM – 5:00 PM'],
                  },
                  types: ['food_bank', 'charity'],
                },
              ],
            }),
          })
        }
        if (url.includes('soup%20kitchen')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              status: 'OK',
              results: [],
            }),
          })
        }
        if (url.includes('food%20pantry')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              status: 'OK',
              results: [],
            }),
          })
        }
        return Promise.reject(new Error('Unexpected URL'))
      })

      const result = await getDonationOpportunities(locationId, zipCode)

      expect(result).toHaveLength(1)
      expect(result[0].orgName).toBe('Community Food Bank')
      expect(result[0].address).toBe('789 Oak St, New York, NY 10001')

      // Verify API was called 3 times (for 3 search queries)
      expect(global.fetch).toHaveBeenCalledTimes(3)

      // Verify cache insert was called
      expect(db.insert).toHaveBeenCalled()
    })

    it('should cache multiple results from API calls', async () => {
      // Mock database select to return empty (cache miss)
      const mockFrom = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      })

      ;(db.select as any).mockReturnValue({
        from: mockFrom,
      })

      // Mock database insert
      const mockInsertFrom = vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      })

      ;(db.insert as any).mockReturnValue({
        values: mockInsertFrom,
      })

      // Mock Google Places API with multiple results
      ;(global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('food%20bank')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              status: 'OK',
              results: [
                {
                  name: 'Food Bank A',
                  formatted_address: 'Address A',
                  formatted_phone_number: 'Phone A',
                  types: ['food_bank'],
                },
                {
                  name: 'Food Bank B',
                  formatted_address: 'Address B',
                  formatted_phone_number: 'Phone B',
                  types: ['food_bank'],
                },
              ],
            }),
          })
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({
            status: 'ZERO_RESULTS',
            results: [],
          }),
        })
      })

      const result = await getDonationOpportunities(locationId, zipCode)

      expect(result).toHaveLength(2)
      expect(db.insert).toHaveBeenCalledTimes(2)
    })
  })

  describe('Cache expiry - triggers refresh (30-day TTL)', () => {
    it('should refresh cache if older than 30 days', async () => {
      const staleDate = new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000) // 31 days ago

      const mockStaleCache = [
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
      const mockFrom = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(mockStaleCache),
      })

      ;(db.select as any).mockReturnValue({
        from: mockFrom,
      })

      // Mock database delete
      const mockDeleteFrom = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      })

      ;(db.delete as any).mockReturnValue({
        where: mockDeleteFrom,
      })

      // Mock database insert
      const mockInsertFrom = vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      })

      ;(db.insert as any).mockReturnValue({
        values: mockInsertFrom,
      })

      // Mock new API results
      ;(global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('food%20bank')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              status: 'OK',
              results: [
                {
                  name: 'Updated Food Bank',
                  formatted_address: 'Updated Address',
                  formatted_phone_number: 'Updated Phone',
                  types: ['food_bank'],
                },
              ],
            }),
          })
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({
            status: 'ZERO_RESULTS',
            results: [],
          }),
        })
      })

      const result = await getDonationOpportunities(locationId, zipCode)

      expect(result).toHaveLength(1)
      expect(result[0].orgName).toBe('Updated Food Bank')

      // Verify old cache was deleted
      expect(db.delete).toHaveBeenCalled()

      // Verify new data was cached
      expect(db.insert).toHaveBeenCalled()
    })

    it('should not refresh cache if fresher than 30 days', async () => {
      const freshDate = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000) // 29 days ago

      const mockFreshCache = [
        {
          id: '1',
          locationId,
          orgName: 'Fresh Food Bank',
          address: 'Fresh Address',
          phone: 'Fresh Phone',
          hours: 'Fresh Hours',
          types: ['food_bank'],
          cachedAt: freshDate,
        },
      ]

      // Mock database select to return fresh cache
      const mockFrom = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(mockFreshCache),
      })

      ;(db.select as any).mockReturnValue({
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
      const mockFrom = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      })

      ;(db.select as any).mockReturnValue({
        from: mockFrom,
      })

      // Mock API error
      ;(global.fetch as any).mockRejectedValue(new Error('Network error'))

      const result = await getDonationOpportunities(locationId, zipCode)

      expect(result).toEqual([])
    })

    it('should handle API error status gracefully', async () => {
      // Mock database select to return empty (cache miss)
      const mockFrom = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      })

      ;(db.select as any).mockReturnValue({
        from: mockFrom,
      })

      // Mock API error response
      ;(global.fetch as any).mockResolvedValue({
        ok: false,
        statusText: 'Unauthorized',
      })

      const result = await getDonationOpportunities(locationId, zipCode)

      expect(result).toEqual([])
    })

    it('should handle API error status in response', async () => {
      // Mock database select to return empty (cache miss)
      const mockFrom = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      })

      ;(db.select as any).mockReturnValue({
        from: mockFrom,
      })

      // Mock API returns error status
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'INVALID_REQUEST',
          results: [],
        }),
      })

      const result = await getDonationOpportunities(locationId, zipCode)

      expect(result).toEqual([])
    })

    it('should not throw on missing API key', async () => {
      delete process.env.GOOGLE_PLACES_API_KEY

      // Mock database select to return empty
      const mockFrom = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      })

      ;(db.select as any).mockReturnValue({
        from: mockFrom,
      })

      const result = await getDonationOpportunities(locationId, zipCode)

      expect(result).toEqual([])
    })

    it('should handle database errors gracefully', async () => {
      // Mock database select to throw error
      const mockFrom = vi.fn().mockReturnValue({
        where: vi.fn().mockRejectedValue(new Error('DB connection failed')),
      })

      ;(db.select as any).mockReturnValue({
        from: mockFrom,
      })

      const result = await getDonationOpportunities(locationId, zipCode)

      expect(result).toEqual([])
    })
  })

  describe('Edge cases', () => {
    it('should handle places with missing optional fields', async () => {
      // Mock database select to return empty (cache miss)
      const mockFrom = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      })

      ;(db.select as any).mockReturnValue({
        from: mockFrom,
      })

      // Mock database insert
      const mockInsertFrom = vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      })

      ;(db.insert as any).mockReturnValue({
        values: mockInsertFrom,
      })

      // Mock API with minimal fields
      ;(global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('food%20bank')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              status: 'OK',
              results: [
                {
                  name: 'Minimal Place',
                  formatted_address: 'Some Address',
                  // Missing phone, opening_hours, types
                },
              ],
            }),
          })
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({
            status: 'ZERO_RESULTS',
            results: [],
          }),
        })
      })

      const result = await getDonationOpportunities(locationId, zipCode)

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        orgName: 'Minimal Place',
        address: 'Some Address',
        phone: undefined,
        hours: undefined,
        types: undefined,
      })
    })

    it('should search all three food-related queries', async () => {
      // Mock database select to return empty (cache miss)
      const mockFrom = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      })

      ;(db.select as any).mockReturnValue({
        from: mockFrom,
      })

      // Mock database insert
      const mockInsertFrom = vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      })

      ;(db.insert as any).mockReturnValue({
        values: mockInsertFrom,
      })
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'ZERO_RESULTS',
          results: [],
        }),
      })

      await getDonationOpportunities(locationId, zipCode)

      // Should be called 3 times for 3 search queries
      expect(global.fetch).toHaveBeenCalledTimes(3)

      // Verify each search query was included
      const calls = (global.fetch as any).mock.calls
      const queryParams = calls.map((call: any[]) =>
        new URL(call[0]).searchParams.get('query'),
      )

      expect(queryParams).toContain(`food bank ${zipCode}`)
      expect(queryParams).toContain(`soup kitchen ${zipCode}`)
      expect(queryParams).toContain(`food pantry ${zipCode}`)
    })
  })
})
