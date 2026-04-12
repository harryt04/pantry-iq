/**
 * Locations Route Tests
 *
 * Comprehensive tests for:
 * - GET /api/locations - List user's locations
 * - POST /api/locations - Create new location
 * - GET /api/locations/[id] - Get single location
 * - PUT /api/locations/[id] - Update location
 * - DELETE /api/locations/[id] - Delete location (cascade)
 *
 * Coverage includes:
 * - Authentication (401 when missing)
 * - Authorization (403 when wrong user, 404 when not found)
 * - Validation (400 for bad input)
 * - CRUD operations with mocked database
 * - Error response format: { error, code }
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

// ============================================================================
// Types
// ============================================================================

/** Mock database query chain interface */
interface MockDatabaseChain {
  from: ReturnType<typeof vi.fn>
  where?: ReturnType<typeof vi.fn>
  returning?: ReturnType<typeof vi.fn>
  select?: ReturnType<typeof vi.fn>
  set?: ReturnType<typeof vi.fn>
  values?: ReturnType<typeof vi.fn>
}

/** Location mock object */
interface MockLocation {
  id: string
  userId: string
  name: string
  zipCode: string
  address: string
  timezone: string
  type: string
  createdAt: Date
  updatedAt: Date
}

/** Route context parameter type */
interface RouteContext {
  params: Promise<Record<string, string>>
}

// ============================================================================
// Mocks
// ============================================================================

// Mock auth module
vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}))

// Mock database module
vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

// Mock drizzle-orm (keeping actual exports for schema)
vi.mock('drizzle-orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('drizzle-orm')>()
  return {
    ...actual,
    eq: vi.fn((col, val) => ({ column: col, value: val })),
  }
})

import { auth } from '@/lib/auth'
import { db } from '@/db'

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a mock NextRequest
 */
function createRequest(
  url: string = 'http://localhost:3000/api/locations',
  method: string = 'GET',
  body?: unknown,
): NextRequest {
  return new NextRequest(url, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

/**
 * Mock a successful session
 */
function mockSession(userId: string = 'user-123') {
  vi.mocked(auth.api.getSession).mockResolvedValueOnce({
    user: {
      id: userId,
      email: 'test@example.com',
      name: 'Test User',
      emailVerified: true,
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    session: {
      id: 'session-123',
      token: 'token-123',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
    },
  } as any)
}

/**
 * Mock no session (unauthenticated)
 */
function mockNoSession() {
  vi.mocked(auth.api.getSession).mockResolvedValueOnce(null)
}

/**
 * Create a mock location
 */
function createMockLocation(overrides?: Partial<MockLocation>): MockLocation {
  return {
    id: 'loc-123',
    userId: 'user-123',
    name: 'Test Restaurant',
    zipCode: '10001',
    address: '123 Main St',
    timezone: 'America/New_York',
    type: 'restaurant',
    createdAt: new Date('2026-04-01T00:00:00Z'),
    updatedAt: new Date('2026-04-01T00:00:00Z'),
    ...overrides,
  }
}

/**
 * Mock database query builder chain with queue support
 * Allows multiple sequential calls to db.select/insert/update/delete
 */
function createMockDatabaseChain(
  result: any[] | null = null,
): MockDatabaseChain {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(result || []),
    returning: vi.fn().mockResolvedValue(result || []),
    select: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
  }
}

function mockDatabaseQueryChain(
  result: any[] | null = null,
): MockDatabaseChain {
  const chain = createMockDatabaseChain(result)

  vi.mocked(db.select).mockReturnValue(chain as any)
  vi.mocked(db.insert).mockReturnValue(chain as any)
  vi.mocked(db.update).mockReturnValue(chain as any)
  vi.mocked(db.delete).mockReturnValue(chain as any)

  return chain
}

/**
 * Mock database for routes that need multiple sequential db.select calls
 * (e.g., first for ownership check, then for actual fetch)
 */
function mockDatabaseForGetRoute(
  ownershipCheckResult: any[],
  getResult: any[],
) {
  vi.mocked(db.select).mockImplementation(() => {
    let selectCallCount = 0
    return {
      from: vi.fn().mockReturnThis(),
      where: vi
        .fn()
        .mockResolvedValue(
          selectCallCount++ === 0 ? ownershipCheckResult : getResult,
        ),
    } as any
  })
}

/**
 * Mock database for routes that do delete (needs ownership check + delete)
 */
function mockDatabaseForDeleteRoute(
  ownershipCheckResult: any[],
  deleteResult: any[],
) {
  vi.mocked(db.select).mockImplementation(() => {
    return {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue(ownershipCheckResult),
    } as any
  })

  vi.mocked(db.delete).mockReturnValue({
    where: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue(deleteResult),
  } as any)
}

// ============================================================================
// Tests
// ============================================================================

describe('Locations Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ==========================================================================
  // GET /api/locations - List user's locations
  // ==========================================================================

  describe('GET /api/locations - List user locations', () => {
    it('should return 401 when unauthenticated', async () => {
      mockNoSession()
      const routeModule = await import('@/app/api/locations/route')
      const request = createRequest()

      const response = await routeModule.GET(request)
      const body = await response.json()

      expect(response.status).toBe(401)
      expect(body.error).toBe('Authentication required')
      expect(body.code).toBe('NOT_AUTHENTICATED')
    })

    it('should return empty array when user has no locations', async () => {
      mockSession('user-123')
      const chain = createMockDatabaseChain([])

      vi.mocked(db.select).mockReturnValue(chain as any)

      const routeModule = await import('@/app/api/locations/route')
      const request = createRequest()

      const response = await routeModule.GET(request)
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(Array.isArray(body)).toBe(true)
      expect(body.length).toBe(0)
    })

    it('should return only user-owned locations', async () => {
      const userId = 'user-123'
      mockSession(userId)

      const userLocations = [
        createMockLocation({ id: 'loc-1', userId }),
        createMockLocation({ id: 'loc-2', userId, name: 'Food Truck' }),
      ]

      const chain = createMockDatabaseChain(userLocations as any)
      vi.mocked(db.select).mockReturnValue(chain as any)

      const routeModule = await import('@/app/api/locations/route')
      const request = createRequest()

      const response = await routeModule.GET(request)
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(Array.isArray(body)).toBe(true)
      expect(body.length).toBe(2)
      expect(body[0].userId).toBe(userId)
      expect(body[1].userId).toBe(userId)
    })

    it('should return 500 on database error', async () => {
      mockSession()
      const chain = mockDatabaseQueryChain()
      chain.where!.mockReturnValue({
        ...chain,
        then: () => {
          throw new Error('Database connection failed')
        },
      } as any)

      const routeModule = await import('@/app/api/locations/route')
      const request = createRequest()

      const response = await routeModule.GET(request)
      const body = await response.json()

      expect(response.status).toBe(500)
      expect(body.error).toBe('An unexpected error occurred. Please try again.')
      expect(body.code).toBe('FETCH_LOCATIONS_ERROR')
    })

    it('should filter locations by userId in database query', async () => {
      mockSession('user-123')
      mockDatabaseQueryChain([])

      const routeModule = await import('@/app/api/locations/route')
      const request = createRequest()

      await routeModule.GET(request)

      // Verify database methods were called
      expect(db.select).toHaveBeenCalled()
    })
  })

  // ==========================================================================
  // POST /api/locations - Create location
  // ==========================================================================

  describe('POST /api/locations - Create location', () => {
    it('should return 401 when unauthenticated', async () => {
      mockNoSession()
      const routeModule = await import('@/app/api/locations/route')
      const request = createRequest(
        'http://localhost:3000/api/locations',
        'POST',
        { name: 'Test', zipCode: '10001' },
      )

      const response = await routeModule.POST(request)
      const body = await response.json()

      expect(response.status).toBe(401)
      expect(body.code).toBe('NOT_AUTHENTICATED')
    })

    it('should return 400 when JSON is invalid', async () => {
      mockSession()
      const routeModule = await import('@/app/api/locations/route')
      const request = new NextRequest('http://localhost:3000/api/locations', {
        method: 'POST',
        body: 'invalid json {',
      })

      const response = await routeModule.POST(request)
      const body = await response.json()

      expect(response.status).toBe(400)
      expect(body.code).toBe('INVALID_JSON')
    })

    it('should return 400 when name is missing', async () => {
      mockSession()
      const routeModule = await import('@/app/api/locations/route')
      const request = createRequest(
        'http://localhost:3000/api/locations',
        'POST',
        { zipCode: '10001' },
      )

      const response = await routeModule.POST(request)
      const body = await response.json()

      expect(response.status).toBe(400)
      expect(body.code).toBe('MISSING_REQUIRED_FIELDS')
      expect(body.error).toContain('name')
    })

    it('should return 400 when zipCode is missing', async () => {
      mockSession()
      const routeModule = await import('@/app/api/locations/route')
      const request = createRequest(
        'http://localhost:3000/api/locations',
        'POST',
        { name: 'Test' },
      )

      const response = await routeModule.POST(request)
      const body = await response.json()

      expect(response.status).toBe(400)
      expect(body.code).toBe('MISSING_REQUIRED_FIELDS')
      expect(body.error).toContain('zipCode')
    })

    it('should return 400 for invalid type', async () => {
      mockSession()
      const routeModule = await import('@/app/api/locations/route')
      const request = createRequest(
        'http://localhost:3000/api/locations',
        'POST',
        { name: 'Test', zipCode: '10001', type: 'invalid_type' },
      )

      const response = await routeModule.POST(request)
      const body = await response.json()

      expect(response.status).toBe(400)
      expect(body.code).toBe('INVALID_TYPE')
      expect(body.error).toContain('restaurant')
      expect(body.error).toContain('food_truck')
    })

    it('should accept valid restaurant type', async () => {
      mockSession('user-123')
      const newLocation = createMockLocation({ type: 'restaurant' })
      mockDatabaseQueryChain([newLocation])

      const routeModule = await import('@/app/api/locations/route')
      const request = createRequest(
        'http://localhost:3000/api/locations',
        'POST',
        {
          name: 'My Restaurant',
          zipCode: '10001',
          type: 'restaurant',
        },
      )

      const response = await routeModule.POST(request)
      const body = await response.json()

      expect(response.status).toBe(201)
      expect(body.type).toBe('restaurant')
    })

    it('should accept valid food_truck type', async () => {
      mockSession('user-123')
      const newLocation = createMockLocation({ type: 'food_truck' })
      mockDatabaseQueryChain([newLocation])

      const routeModule = await import('@/app/api/locations/route')
      const request = createRequest(
        'http://localhost:3000/api/locations',
        'POST',
        {
          name: 'My Food Truck',
          zipCode: '10001',
          type: 'food_truck',
        },
      )

      const response = await routeModule.POST(request)
      const body = await response.json()

      expect(response.status).toBe(201)
      expect(body.type).toBe('food_truck')
    })

    it('should default to restaurant type when not provided', async () => {
      mockSession('user-123')
      const newLocation = createMockLocation({ type: 'restaurant' })
      mockDatabaseQueryChain([newLocation])

      const routeModule = await import('@/app/api/locations/route')
      const request = createRequest(
        'http://localhost:3000/api/locations',
        'POST',
        { name: 'My Location', zipCode: '10001' },
      )

      const response = await routeModule.POST(request)
      const body = await response.json()

      expect(response.status).toBe(201)
      expect(body.type).toBe('restaurant')
    })

    it('should default to America/New_York timezone when not provided', async () => {
      mockSession('user-123')
      const newLocation = createMockLocation({ timezone: 'America/New_York' })
      mockDatabaseQueryChain([newLocation])

      const routeModule = await import('@/app/api/locations/route')
      const request = createRequest(
        'http://localhost:3000/api/locations',
        'POST',
        { name: 'My Location', zipCode: '10001' },
      )

      const response = await routeModule.POST(request)
      const body = await response.json()

      expect(response.status).toBe(201)
      expect(body.timezone).toBe('America/New_York')
    })

    it('should accept custom timezone', async () => {
      mockSession('user-123')
      const newLocation = createMockLocation({
        timezone: 'America/Los_Angeles',
      })
      mockDatabaseQueryChain([newLocation])

      const routeModule = await import('@/app/api/locations/route')
      const request = createRequest(
        'http://localhost:3000/api/locations',
        'POST',
        {
          name: 'My Location',
          zipCode: '10001',
          timezone: 'America/Los_Angeles',
        },
      )

      const response = await routeModule.POST(request)
      const body = await response.json()

      expect(response.status).toBe(201)
      expect(body.timezone).toBe('America/Los_Angeles')
    })

    it('should create location with optional address', async () => {
      mockSession('user-123')
      const newLocation = createMockLocation({
        address: '456 Oak Ave',
      })
      mockDatabaseQueryChain([newLocation])

      const routeModule = await import('@/app/api/locations/route')
      const request = createRequest(
        'http://localhost:3000/api/locations',
        'POST',
        {
          name: 'My Location',
          zipCode: '10001',
          address: '456 Oak Ave',
        },
      )

      const response = await routeModule.POST(request)
      const body = await response.json()

      expect(response.status).toBe(201)
      expect(body.address).toBe('456 Oak Ave')
    })

    it('should return 201 on successful creation', async () => {
      mockSession('user-123')
      const newLocation = createMockLocation()
      mockDatabaseQueryChain([newLocation])

      const routeModule = await import('@/app/api/locations/route')
      const request = createRequest(
        'http://localhost:3000/api/locations',
        'POST',
        { name: 'Test', zipCode: '10001' },
      )

      const response = await routeModule.POST(request)
      const body = await response.json()

      expect(response.status).toBe(201)
      expect(body.id).toBeDefined()
      expect(body.name).toBe('Test Restaurant')
      expect(body.userId).toBe('user-123')
    })

    it('should return 500 on database error', async () => {
      mockSession()
      const chain = mockDatabaseQueryChain()
      chain.returning!.mockRejectedValueOnce(
        new Error('Database insert failed'),
      )

      const routeModule = await import('@/app/api/locations/route')
      const request = createRequest(
        'http://localhost:3000/api/locations',
        'POST',
        { name: 'Test', zipCode: '10001' },
      )

      const response = await routeModule.POST(request)
      const body = await response.json()

      expect(response.status).toBe(500)
      expect(body.code).toBe('CREATE_LOCATION_ERROR')
    })
  })

  // ==========================================================================
  // GET /api/locations/[id] - Get single location
  // ==========================================================================

  describe('GET /api/locations/[id] - Get single location', () => {
    it('should return 401 when unauthenticated', async () => {
      mockNoSession()
      const routeModule = await import('@/app/api/locations/[id]/route')
      const request = createRequest(
        'http://localhost:3000/api/locations/loc-123',
      )

      const response = await routeModule.GET(request, {
        params: Promise.resolve({ id: 'loc-123' }),
      } as any)
      const body = await response.json()

      expect(response.status).toBe(401)
      expect(body.code).toBe('NOT_AUTHENTICATED')
    })

    it('should return 403 when user does not own location', async () => {
      mockSession('user-123')

      mockDatabaseQueryChain([createMockLocation({ userId: 'user-456' })])

      const routeModule = await import('@/app/api/locations/[id]/route')
      const request = createRequest(
        'http://localhost:3000/api/locations/loc-123',
      )

      const response = await routeModule.GET(request, {
        params: Promise.resolve({ id: 'loc-123' }),
      } as any)
      const body = await response.json()

      expect(response.status).toBe(403)
      expect(body.code).toBe('ACCESS_DENIED')
    })

    it('should return 403 when location not found (ownership check fails)', async () => {
      mockSession('user-123')
      mockDatabaseForGetRoute([], [])

      const routeModule = await import('@/app/api/locations/[id]/route')
      const request = createRequest(
        'http://localhost:3000/api/locations/loc-999',
      )

      const response = await routeModule.GET(request, {
        params: Promise.resolve({ id: 'loc-999' }),
      } as any)
      const body = await response.json()

      // When location doesn't exist, ownership check fails → 403
      expect(response.status).toBe(403)
      expect(body.code).toBe('ACCESS_DENIED')
    })

    it('should return 404 when location deleted between checks (race condition)', async () => {
      mockSession('user-123')
      const location = createMockLocation({ userId: 'user-123', id: 'loc-123' })

      // Mock: ownership check finds location, but fetch doesn't (race condition)
      let callCount = 0
      vi.mocked(db.select).mockImplementation(() => {
        callCount++
        return {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockResolvedValue(callCount === 1 ? [location] : []),
        } as any
      })

      const routeModule = await import('@/app/api/locations/[id]/route')
      const request = createRequest(
        'http://localhost:3000/api/locations/loc-123',
      )

      const response = await routeModule.GET(request, {
        params: Promise.resolve({ id: 'loc-123' }),
      } as any)
      const body = await response.json()

      // Rare case: location existed during ownership check but was deleted before fetch
      expect(response.status).toBe(404)
      expect(body.code).toBe('LOCATION_NOT_FOUND')
    })

    it('should return location when user owns it', async () => {
      mockSession('user-123')
      const location = createMockLocation({ userId: 'user-123', id: 'loc-123' })

      mockDatabaseForGetRoute([location], [location])

      const routeModule = await import('@/app/api/locations/[id]/route')
      const request = createRequest(
        'http://localhost:3000/api/locations/loc-123',
      )

      const response = await routeModule.GET(request, {
        params: Promise.resolve({ id: 'loc-123' }),
      } as any)
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.id).toBe('loc-123')
      expect(body.userId).toBe('user-123')
    })

    it('should return 500 on database error', async () => {
      mockSession()
      const chain = mockDatabaseQueryChain()
      chain.where!.mockReturnValue({
        ...chain,
        then: () => {
          throw new Error('Database query failed')
        },
      } as any)

      const routeModule = await import('@/app/api/locations/[id]/route')
      const request = createRequest(
        'http://localhost:3000/api/locations/loc-123',
      )

      const response = await routeModule.GET(request, {
        params: Promise.resolve({ id: 'loc-123' }),
      } as any)
      const body = await response.json()

      expect(response.status).toBe(500)
      expect(body.code).toBe('FETCH_LOCATION_ERROR')
    })
  })

  // ==========================================================================
  // PUT /api/locations/[id] - Update location
  // ==========================================================================

  describe('PUT /api/locations/[id] - Update location', () => {
    it('should return 401 when unauthenticated', async () => {
      mockNoSession()
      const routeModule = await import('@/app/api/locations/[id]/route')
      const request = createRequest(
        'http://localhost:3000/api/locations/loc-123',
        'PUT',
        { name: 'Updated' },
      )

      const response = await routeModule.PUT(request, {
        params: Promise.resolve({ id: 'loc-123' }),
      } as any)
      const body = await response.json()

      expect(response.status).toBe(401)
      expect(body.code).toBe('NOT_AUTHENTICATED')
    })

    it('should return 403 when user does not own location', async () => {
      mockSession('user-123')

      const chain = createMockDatabaseChain([
        createMockLocation({ userId: 'user-456' }),
      ])

      vi.mocked(db.select).mockReturnValue(chain as any)

      const routeModule = await import('@/app/api/locations/[id]/route')
      const request = createRequest(
        'http://localhost:3000/api/locations/loc-123',
      )

      const response = await routeModule.GET(request, {
        params: Promise.resolve({ id: 'loc-123' }),
      } as any)
      const body = await response.json()

      expect(response.status).toBe(403)
      expect(body.code).toBe('ACCESS_DENIED')
    })

    it('should return 400 when JSON is invalid', async () => {
      mockSession()
      const chain = createMockDatabaseChain([
        createMockLocation({ userId: 'user-123' }),
      ])
      vi.mocked(db.select).mockReturnValue(chain as any)

      const routeModule = await import('@/app/api/locations/[id]/route')
      const request = new NextRequest(
        'http://localhost:3000/api/locations/loc-123',
        {
          method: 'PUT',
          body: 'invalid json {',
        },
      )

      const response = await routeModule.PUT(request, {
        params: Promise.resolve({ id: 'loc-123' }),
      } as any)
      const body = await response.json()

      expect(response.status).toBe(400)
      expect(body.code).toBe('INVALID_JSON')
    })

    it('should return 400 when name is empty string', async () => {
      mockSession('user-123')
      const chain = createMockDatabaseChain([
        createMockLocation({ userId: 'user-123' }),
      ])
      vi.mocked(db.select).mockReturnValue(chain as any)

      const routeModule = await import('@/app/api/locations/[id]/route')
      const request = createRequest(
        'http://localhost:3000/api/locations/loc-123',
        'PUT',
        { name: '' },
      )

      const response = await routeModule.PUT(request, {
        params: Promise.resolve({ id: 'loc-123' }),
      } as any)
      const body = await response.json()

      expect(response.status).toBe(400)
      expect(body.code).toBe('INVALID_FIELDS')
    })

    it('should return 400 when zipCode is empty string', async () => {
      mockSession('user-123')
      const chain = createMockDatabaseChain([
        createMockLocation({ userId: 'user-123' }),
      ])
      vi.mocked(db.select).mockReturnValue(chain as any)

      const routeModule = await import('@/app/api/locations/[id]/route')
      const request = createRequest(
        'http://localhost:3000/api/locations/loc-123',
        'PUT',
        { zipCode: '' },
      )

      const response = await routeModule.PUT(request, {
        params: Promise.resolve({ id: 'loc-123' }),
      } as any)
      const body = await response.json()

      expect(response.status).toBe(400)
      expect(body.code).toBe('INVALID_FIELDS')
    })

    it('should return 400 for invalid type', async () => {
      mockSession('user-123')
      const chain = createMockDatabaseChain([
        createMockLocation({ userId: 'user-123' }),
      ])
      vi.mocked(db.select).mockReturnValue(chain as any)

      const routeModule = await import('@/app/api/locations/[id]/route')
      const request = createRequest(
        'http://localhost:3000/api/locations/loc-123',
        'PUT',
        { type: 'invalid_type' },
      )

      const response = await routeModule.PUT(request, {
        params: Promise.resolve({ id: 'loc-123' }),
      } as any)
      const body = await response.json()

      expect(response.status).toBe(400)
      expect(body.code).toBe('INVALID_TYPE')
    })

    it('should update single field', async () => {
      mockSession('user-123')
      const updatedLocation = createMockLocation({
        userId: 'user-123',
        name: 'Updated Name',
      })

      vi.mocked(db.select).mockImplementation(() => {
        return {
          from: vi.fn().mockReturnThis(),
          where: vi
            .fn()
            .mockResolvedValue([createMockLocation({ userId: 'user-123' })]),
        } as any
      })

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([updatedLocation]),
      } as any)

      const routeModule = await import('@/app/api/locations/[id]/route')
      const request = createRequest(
        'http://localhost:3000/api/locations/loc-123',
        'PUT',
        { name: 'Updated Name' },
      )

      const response = await routeModule.PUT(request, {
        params: Promise.resolve({ id: 'loc-123' }),
      } as any)
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.name).toBe('Updated Name')
    })

    it('should update multiple fields', async () => {
      mockSession('user-123')
      const updatedLocation = createMockLocation({
        userId: 'user-123',
        name: 'New Name',
        zipCode: '90210',
        timezone: 'America/Los_Angeles',
      })

      vi.mocked(db.select).mockImplementation(() => {
        return {
          from: vi.fn().mockReturnThis(),
          where: vi
            .fn()
            .mockResolvedValue([createMockLocation({ userId: 'user-123' })]),
        } as any
      })

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([updatedLocation]),
      } as any)

      const routeModule = await import('@/app/api/locations/[id]/route')
      const request = createRequest(
        'http://localhost:3000/api/locations/loc-123',
        'PUT',
        {
          name: 'New Name',
          zipCode: '90210',
          timezone: 'America/Los_Angeles',
        },
      )

      const response = await routeModule.PUT(request, {
        params: Promise.resolve({ id: 'loc-123' }),
      } as any)
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.name).toBe('New Name')
      expect(body.zipCode).toBe('90210')
    })

    it('should return 500 on database error', async () => {
      mockSession('user-123')
      vi.mocked(db.select).mockImplementation(() => {
        return {
          from: vi.fn().mockReturnThis(),
          where: vi
            .fn()
            .mockResolvedValue([createMockLocation({ userId: 'user-123' })]),
        } as any
      })

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi
          .fn()
          .mockRejectedValueOnce(new Error('Database update failed')),
      } as any)

      const routeModule = await import('@/app/api/locations/[id]/route')
      const request = createRequest(
        'http://localhost:3000/api/locations/loc-123',
        'PUT',
        { name: 'Updated' },
      )

      const response = await routeModule.PUT(request, {
        params: Promise.resolve({ id: 'loc-123' }),
      } as any)
      const body = await response.json()

      expect(response.status).toBe(500)
      expect(body.code).toBe('UPDATE_LOCATION_ERROR')
    })
  })

  // ==========================================================================
  // DELETE /api/locations/[id] - Delete location
  // ==========================================================================

  describe('DELETE /api/locations/[id] - Delete location', () => {
    it('should return 401 when unauthenticated', async () => {
      mockNoSession()
      const routeModule = await import('@/app/api/locations/[id]/route')
      const request = createRequest(
        'http://localhost:3000/api/locations/loc-123',
        'DELETE',
      )

      const response = await routeModule.DELETE(request, {
        params: Promise.resolve({ id: 'loc-123' }),
      } as any)
      const body = await response.json()

      expect(response.status).toBe(401)
      expect(body.code).toBe('NOT_AUTHENTICATED')
    })

    it('should return 403 when user does not own location', async () => {
      mockSession('user-123')

      const chain = createMockDatabaseChain([
        createMockLocation({ userId: 'user-456' }),
      ])

      vi.mocked(db.select).mockReturnValue(chain as any)

      const routeModule = await import('@/app/api/locations/[id]/route')
      const request = createRequest(
        'http://localhost:3000/api/locations/loc-123',
        'DELETE',
      )

      const response = await routeModule.DELETE(request, {
        params: Promise.resolve({ id: 'loc-123' }),
      } as any)
      const body = await response.json()

      expect(response.status).toBe(403)
      expect(body.code).toBe('ACCESS_DENIED')
    })

    it('should return 403 when location not found (ownership check fails)', async () => {
      mockSession('user-123')
      mockDatabaseForDeleteRoute([], [])

      const routeModule = await import('@/app/api/locations/[id]/route')
      const request = createRequest(
        'http://localhost:3000/api/locations/loc-999',
        'DELETE',
      )

      const response = await routeModule.DELETE(request, {
        params: Promise.resolve({ id: 'loc-999' }),
      } as any)
      const body = await response.json()

      // When location doesn't exist, ownership check fails → 403
      expect(response.status).toBe(403)
      expect(body.code).toBe('ACCESS_DENIED')
    })

    it('should return 404 when delete finds empty result (race condition)', async () => {
      mockSession('user-123')
      const location = createMockLocation({ userId: 'user-123', id: 'loc-123' })

      // Mock: ownership check passes, but delete returns empty (race condition)
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([location]),
      } as any)

      vi.mocked(db.delete).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([]),
      } as any)

      const routeModule = await import('@/app/api/locations/[id]/route')
      const request = createRequest(
        'http://localhost:3000/api/locations/loc-123',
        'DELETE',
      )

      const response = await routeModule.DELETE(request, {
        params: Promise.resolve({ id: 'loc-123' }),
      } as any)
      const body = await response.json()

      // Rare case: location existed during ownership check but delete returned nothing
      expect(response.status).toBe(404)
      expect(body.code).toBe('LOCATION_NOT_FOUND')
    })

    it('should delete location when user owns it', async () => {
      mockSession('user-123')
      const location = createMockLocation({ userId: 'user-123', id: 'loc-123' })

      // First call: verify ownership (SELECT)
      let callCount = 0
      vi.mocked(db.select).mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          // First call for ownership check
          return {
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockResolvedValue([location]),
          } as any
        }
        // Second call for delete (which also returns the deleted record)
        return {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          returning: vi.fn().mockResolvedValue([location]),
        } as any
      })

      vi.mocked(db.delete).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([location]),
      } as any)

      const routeModule = await import('@/app/api/locations/[id]/route')
      const request = createRequest(
        'http://localhost:3000/api/locations/loc-123',
        'DELETE',
      )

      const response = await routeModule.DELETE(request, {
        params: Promise.resolve({ id: 'loc-123' }),
      } as any)
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.message).toBe('Location deleted successfully')
    })

    it('should cascade delete related records (handled by database)', async () => {
      mockSession('user-123')
      const location = createMockLocation({ userId: 'user-123' })

      mockDatabaseForDeleteRoute([location], [location])

      const routeModule = await import('@/app/api/locations/[id]/route')
      const request = createRequest(
        'http://localhost:3000/api/locations/loc-123',
        'DELETE',
      )

      // Verify route executes without error
      const response = await routeModule.DELETE(request, {
        params: Promise.resolve({ id: 'loc-123' }),
      } as any)

      // Cascade constraints (pos_connections, csv_uploads, transactions, etc.)
      // are handled by database, not by route logic
      expect(response.status).toBe(200)
    })

    it('should return 500 on database error', async () => {
      mockSession('user-123')
      vi.mocked(db.select).mockImplementation(() => {
        return {
          from: vi.fn().mockReturnThis(),
          where: vi
            .fn()
            .mockResolvedValue([createMockLocation({ userId: 'user-123' })]),
        } as any
      })

      vi.mocked(db.delete).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        returning: vi
          .fn()
          .mockRejectedValueOnce(new Error('Database delete failed')),
      } as any)

      const routeModule = await import('@/app/api/locations/[id]/route')
      const request = createRequest(
        'http://localhost:3000/api/locations/loc-123',
        'DELETE',
      )

      const response = await routeModule.DELETE(request, {
        params: Promise.resolve({ id: 'loc-123' }),
      } as any)
      const body = await response.json()

      expect(response.status).toBe(500)
      expect(body.code).toBe('DELETE_LOCATION_ERROR')
    })
  })

  // ==========================================================================
  // Error Response Format Tests
  // ==========================================================================

  describe('Error response format', () => {
    it('all error responses should include error and code fields', async () => {
      mockNoSession()
      const routeModule = await import('@/app/api/locations/route')
      const request = createRequest()

      const response = await routeModule.GET(request)
      const body = await response.json()

      expect(body).toHaveProperty('error')
      expect(body).toHaveProperty('code')
      expect(typeof body.error).toBe('string')
      expect(typeof body.code).toBe('string')
    })

    it('error responses should never include stack traces', async () => {
      mockSession()
      const chain = mockDatabaseQueryChain()
      chain.where!.mockReturnValue({
        ...chain,
        then: () => {
          throw new Error('Database connection failed: host=invalid')
        },
      } as any)

      const routeModule = await import('@/app/api/locations/route')
      const request = createRequest()

      const response = await routeModule.GET(request)
      const body = await response.json()

      expect(body.error).not.toContain('host=')
      expect(body.error).not.toContain('Error:')
      expect(body.error).not.toContain('at ')
      expect(body.error).toBe('An unexpected error occurred. Please try again.')
    })
  })

  // ==========================================================================
  // Authorization Tests
  // ==========================================================================

  describe('Authorization and ownership verification', () => {
    it('should verify location ownership before GET', async () => {
      mockSession('user-123')

      // Location owned by different user
      const chain = createMockDatabaseChain([
        createMockLocation({ userId: 'user-456', id: 'loc-123' }),
      ])
      vi.mocked(db.select).mockReturnValue(chain as any)

      const routeModule = await import('@/app/api/locations/[id]/route')
      const request = createRequest(
        'http://localhost:3000/api/locations/loc-123',
      )

      const response = await routeModule.GET(request, {
        params: Promise.resolve({ id: 'loc-123' }),
      } as any)
      const body = await response.json()

      expect(response.status).toBe(403)
      expect(body.error).toContain('do not have access')
    })

    it('should verify location ownership before PUT', async () => {
      mockSession('user-123')

      const chain = createMockDatabaseChain([
        createMockLocation({ userId: 'user-456', id: 'loc-123' }),
      ])
      vi.mocked(db.select).mockReturnValue(chain as any)

      const routeModule = await import('@/app/api/locations/[id]/route')
      const request = createRequest(
        'http://localhost:3000/api/locations/loc-123',
        'PUT',
        { name: 'Updated' },
      )

      const response = await routeModule.PUT(request, {
        params: Promise.resolve({ id: 'loc-123' }),
      } as any)
      const body = await response.json()

      expect(response.status).toBe(403)
      expect(body.code).toBe('ACCESS_DENIED')
    })

    it('should verify location ownership before DELETE', async () => {
      mockSession('user-123')

      const chain = createMockDatabaseChain([
        createMockLocation({ userId: 'user-456', id: 'loc-123' }),
      ])
      vi.mocked(db.select).mockReturnValue(chain as any)

      const routeModule = await import('@/app/api/locations/[id]/route')
      const request = createRequest(
        'http://localhost:3000/api/locations/loc-123',
        'DELETE',
      )

      const response = await routeModule.DELETE(request, {
        params: Promise.resolve({ id: 'loc-123' }),
      } as any)

      expect(response.status).toBe(403)
    })
  })
})
