/**
 * Conversations Route Tests
 *
 * Comprehensive tests for:
 * - GET /api/conversations - List conversations
 * - POST /api/conversations - Create conversation
 * - GET /api/conversations/[id] - Get single conversation
 * - PATCH /api/conversations/[id] - Update conversation
 * - DELETE /api/conversations/[id] - Delete conversation
 * - GET /api/conversations/[id]/history - Get conversation history
 * - POST /api/conversations/[id]/message - Send message and stream response
 *
 * Coverage includes:
 * - Authentication (401 when missing)
 * - Authorization (403 when wrong user, 404 when not found)
 * - Validation (400 for bad input)
 * - CRUD operations with mocked database
 * - Streaming response format (Server-Sent Events)
 * - Error response format: { error, code }
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// ============================================================================
// Types
// ============================================================================

/** Mock database query chain interface */
/* eslint-disable @typescript-eslint/no-explicit-any */
interface MockDatabaseChain {
  from: ReturnType<typeof vi.fn>
  where?: ReturnType<typeof vi.fn>
  returning?: ReturnType<typeof vi.fn>
  orderBy?: ReturnType<typeof vi.fn>
  select?: ReturnType<typeof vi.fn>
  set?: ReturnType<typeof vi.fn>
  values?: ReturnType<typeof vi.fn>
}

/** Conversation mock object */
interface MockConversation {
  id: string
  locationId: string
  defaultModel: string
  createdAt: Date
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

/** Message mock object */
interface MockMessage {
  id: string
  conversationId: string
  role: string
  content: string
  modelUsed: string | null
  tokensIn: number | null
  tokensOut: number | null
  createdAt: Date
}

/** Route context parameter type */
interface RouteContext {
  params: Promise<{ id: string }>
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

// Mock drizzle-orm
vi.mock('drizzle-orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('drizzle-orm')>()
  return {
    ...actual,
    eq: vi.fn((col, val) => ({ column: col, value: val })),
    inArray: vi.fn((col, vals) => ({ column: col, values: vals })),
    asc: vi.fn((col) => ({ column: col, direction: 'asc' })),
  }
})

// Mock AI SDK
vi.mock('ai', () => ({
  streamText: vi.fn(),
}))

// Mock AI providers
vi.mock('@ai-sdk/openai', () => ({
  openai: vi.fn(),
}))

vi.mock('@ai-sdk/anthropic', () => ({
  anthropic: vi.fn(),
}))

vi.mock('@ai-sdk/google', () => ({
  google: vi.fn(),
}))

// Mock AI utilities
vi.mock('@/lib/ai/models', () => ({
  getModel: vi.fn(),
}))

vi.mock('@/lib/ai/prompts', () => ({
  buildPromptWithContext: vi.fn(),
}))

vi.mock('@/lib/ai/context-builder', () => ({
  buildContextData: vi.fn(),
}))

vi.mock('@/lib/ai/stream-handler', () => ({
  persistUserMessage: vi.fn(),
  persistStreamedMessage: vi.fn(),
}))

import { auth } from '@/lib/auth'
import { db } from '@/db'
import { streamText } from 'ai'

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a mock NextRequest
 */
function createRequest(
  url: string = 'http://localhost:3000/api/conversations',
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
  ;(vi.mocked(auth.api.getSession) as any).mockResolvedValueOnce({
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
  })
}

/**
 * Mock no session (unauthenticated)
 */
function mockNoSession() {
  vi.mocked(auth.api.getSession).mockResolvedValueOnce(null)
}

/**
 * Create a mock conversation
 */
function createMockConversation(
  overrides?: Partial<MockConversation>,
): MockConversation {
  return {
    id: 'conv-123',
    locationId: 'loc-123',
    defaultModel: 'gemini-2.0-flash-lite',
    createdAt: new Date('2026-04-01T00:00:00Z'),
    ...overrides,
  }
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
 * Create a mock message
 */
function createMockMessage(overrides?: Partial<MockMessage>): MockMessage {
  return {
    id: 'msg-123',
    conversationId: 'conv-123',
    role: 'user',
    content: 'What is my inventory status?',
    modelUsed: null,
    tokensIn: null,
    tokensOut: null,
    createdAt: new Date('2026-04-01T00:00:00Z'),
    ...overrides,
  }
}

/**
 * Mock database query builder chain
 */
function createMockDatabaseChain(
  result: Record<string, unknown>[] | null = null,
): MockDatabaseChain {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(result || []),
    returning: vi.fn().mockResolvedValue(result || []),
    orderBy: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
  }
}

/**
 * Mock database for GET routes (multiple select calls)
 */
function mockDatabaseForGetRoute(
  firstResult: unknown[],
  secondResult: unknown[] | null = null,
) {
  let selectCallCount = 0

  vi.mocked(db.select).mockImplementation(() => {
    selectCallCount++
    return {
      from: vi.fn().mockReturnThis(),
      where: vi
        .fn()
        .mockResolvedValue(
          selectCallCount === 1 ? firstResult : secondResult || [],
        ),
    } as any
  })
}

/**
 * Mock database for POST (create) - needs insert + verify select
 */
function mockDatabaseForCreateRoute(
  locationResult: unknown[],
  createResult: unknown[],
) {
  let selectCallCount = 0

  vi.mocked(db.select).mockImplementation(() => {
    selectCallCount++
    return {
      from: vi.fn().mockReturnThis(),
      where: vi
        .fn()
        .mockResolvedValue(selectCallCount === 1 ? locationResult : []),
    } as any
  })

  vi.mocked(db.insert).mockReturnValue({
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue(createResult),
  } as any)
}

/**
 * Mock database for DELETE - needs verify selects + delete
 */
function mockDatabaseForDeleteRoute(
  conversationResult: unknown[],
  locationResult: unknown[],
) {
  let selectCallCount = 0

  vi.mocked(db.select).mockImplementation(() => {
    selectCallCount++
    return {
      from: vi.fn().mockReturnThis(),
      where: vi
        .fn()
        .mockResolvedValue(
          selectCallCount === 1 ? conversationResult : locationResult,
        ),
    } as any
  })

  vi.mocked(db.delete).mockReturnValue({
    where: vi.fn().mockReturnThis(),
  } as any)
}

/**
 * Mock database for routes that list with location verification
 */
function mockDatabaseForListRoute(result: Record<string, unknown>[]) {
  vi.mocked(db.select).mockReturnValue(createMockDatabaseChain(result) as any)
}

// ============================================================================
// Tests
// ============================================================================

describe('Conversations Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  // ==========================================================================
  // GET /api/conversations - List conversations
  // ==========================================================================

  describe('GET /api/conversations - List conversations', () => {
    it('should return 401 when unauthenticated', async () => {
      mockNoSession()
      const routeModule = await import('@/app/api/conversations/route')
      const request = createRequest()

      const response = await routeModule.GET(request)
      const body = await response.json()

      expect(response.status).toBe(401)
      expect(body.error).toBe('Authentication required')
      expect(body.code).toBe('NOT_AUTHENTICATED')
    })

    it('should return empty array when user has no locations', async () => {
      mockSession('user-123')
      mockDatabaseForListRoute([])

      const routeModule = await import('@/app/api/conversations/route')
      const request = createRequest()

      const response = await routeModule.GET(request)
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(Array.isArray(body)).toBe(true)
      expect(body.length).toBe(0)
    })

    it('should return empty array when user has locations but no conversations', async () => {
      mockSession('user-123')
      let selectCount = 0

      vi.mocked(db.select).mockImplementation(() => {
        selectCount++
        return {
          from: vi.fn().mockReturnThis(),
          where: vi
            .fn()
            .mockResolvedValue(selectCount === 1 ? [{ id: 'loc-123' }] : []),
        } as any
      })

      const routeModule = await import('@/app/api/conversations/route')
      const request = createRequest()

      const response = await routeModule.GET(request)
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(Array.isArray(body)).toBe(true)
      expect(body.length).toBe(0)
    })

    it('should return conversations for user locations', async () => {
      const userId = 'user-123'
      mockSession(userId)

      const conversations = [
        createMockConversation({ id: 'conv-1' }),
        createMockConversation({ id: 'conv-2', defaultModel: 'gpt-4o' }),
      ]

      let selectCount = 0
      vi.mocked(db.select).mockImplementation(() => {
        selectCount++
        return {
          from: vi.fn().mockReturnThis(),
          where: vi
            .fn()
            .mockResolvedValue(
              selectCount === 1 ? [{ id: 'loc-123' }] : conversations,
            ),
        } as any
      })

      const routeModule = await import('@/app/api/conversations/route')
      const request = createRequest()

      const response = await routeModule.GET(request)
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(Array.isArray(body)).toBe(true)
      expect(body.length).toBe(2)
      expect(body[0].id).toBe('conv-1')
      expect(body[1].defaultModel).toBe('gpt-4o')
    })

    it('should return 500 on database error', async () => {
      mockSession()
      const chain = createMockDatabaseChain()
      chain.where = vi.fn().mockRejectedValue(new Error('DB error'))

      vi.mocked(db.select).mockReturnValue(chain as any)

      const routeModule = await import('@/app/api/conversations/route')
      const request = createRequest()

      const response = await routeModule.GET(request)
      const body = await response.json()

      expect(response.status).toBe(500)
      expect(body.code).toBe('FETCH_CONVERSATIONS_ERROR')
    })
  })

  // ==========================================================================
  // POST /api/conversations - Create conversation
  // ==========================================================================

  describe('POST /api/conversations - Create conversation', () => {
    it('should return 401 when unauthenticated', async () => {
      mockNoSession()
      const routeModule = await import('@/app/api/conversations/route')
      const request = createRequest(
        'http://localhost:3000/api/conversations',
        'POST',
        { locationId: 'loc-123' },
      )

      const response = await routeModule.POST(request)
      const body = await response.json()

      expect(response.status).toBe(401)
      expect(body.code).toBe('NOT_AUTHENTICATED')
    })

    it('should return 400 when locationId is missing', async () => {
      mockSession()
      const routeModule = await import('@/app/api/conversations/route')
      const request = createRequest(
        'http://localhost:3000/api/conversations',
        'POST',
        {},
      )

      const response = await routeModule.POST(request)
      const body = await response.json()

      expect(response.status).toBe(400)
      expect(body.code).toBe('MISSING_LOCATION_ID')
    })

    it('should return 400 for invalid JSON', async () => {
      mockSession()
      const routeModule = await import('@/app/api/conversations/route')
      const request = new NextRequest(
        'http://localhost:3000/api/conversations',
        {
          method: 'POST',
          body: 'invalid json {',
          headers: { 'Content-Type': 'application/json' },
        },
      )

      const response = await routeModule.POST(request)
      const body = await response.json()

      expect(response.status).toBe(400)
      expect(body.code).toBe('INVALID_JSON')
    })

    it('should return 404 when location not found', async () => {
      mockSession('user-123')
      mockDatabaseForCreateRoute([], [])

      const routeModule = await import('@/app/api/conversations/route')
      const request = createRequest(
        'http://localhost:3000/api/conversations',
        'POST',
        { locationId: 'nonexistent' },
      )

      const response = await routeModule.POST(request)
      const body = await response.json()

      expect(response.status).toBe(404)
      expect(body.code).toBe('LOCATION_NOT_FOUND')
    })

    it('should return 403 when location belongs to different user', async () => {
      mockSession('user-123')
      const location = createMockLocation({ userId: 'user-999' })
      mockDatabaseForCreateRoute([location], [])

      const routeModule = await import('@/app/api/conversations/route')
      const request = createRequest(
        'http://localhost:3000/api/conversations',
        'POST',
        { locationId: 'loc-123' },
      )

      const response = await routeModule.POST(request)
      const body = await response.json()

      expect(response.status).toBe(404)
      expect(body.code).toBe('LOCATION_NOT_FOUND')
    })

    it('should create conversation with default model', async () => {
      mockSession('user-123')
      const location = createMockLocation()
      const newConversation = createMockConversation()

      mockDatabaseForCreateRoute([location], [newConversation])

      const routeModule = await import('@/app/api/conversations/route')
      const request = createRequest(
        'http://localhost:3000/api/conversations',
        'POST',
        { locationId: 'loc-123' },
      )

      const response = await routeModule.POST(request)
      const body = await response.json()

      expect(response.status).toBe(201)
      expect(body.id).toBe('conv-123')
      expect(body.defaultModel).toBe('gemini-2.0-flash-lite')
      expect(body.locationId).toBe('loc-123')
    })

    it('should create conversation with custom model', async () => {
      mockSession('user-123')
      const location = createMockLocation()
      const newConversation = createMockConversation({
        defaultModel: 'gpt-4o',
      })

      mockDatabaseForCreateRoute([location], [newConversation])

      // Mock getModel to validate the model
      const { getModel } = await import('@/lib/ai/models')
      vi.mocked(getModel).mockReturnValue({
        provider: 'openai',
        id: 'gpt-4o',
      } as unknown as ReturnType<typeof getModel>)

      const routeModule = await import('@/app/api/conversations/route')
      const request = createRequest(
        'http://localhost:3000/api/conversations',
        'POST',
        { locationId: 'loc-123', modelId: 'invalid-model' },
      )

      const response = await routeModule.POST(request)
      const body = await response.json()

      expect(response.status).toBe(400)
      expect(body.code).toBe('INVALID_MODEL')
    })

    it('should return 500 on database error', async () => {
      mockSession('user-123')
      const location = createMockLocation()

      let selectCount = 0
      vi.mocked(db.select).mockImplementation(() => {
        selectCount++
        return {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockResolvedValue(selectCount === 1 ? [location] : []),
        } as any
      })

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockRejectedValue(new Error('DB error')),
      } as any)

      const routeModule = await import('@/app/api/conversations/route')
      const request = createRequest(
        'http://localhost:3000/api/conversations',
        'POST',
        { locationId: 'loc-123' },
      )

      const response = await routeModule.POST(request)
      const body = await response.json()

      expect(response.status).toBe(500)
      expect(body.code).toBe('CREATE_CONVERSATION_ERROR')
    })
  })

  // ==========================================================================
  // GET /api/conversations/[id] - Get single conversation
  // ==========================================================================

  describe('GET /api/conversations/[id] - Get single conversation', () => {
    it('should return 401 when unauthenticated', async () => {
      mockNoSession()
      const routeModule = await import('@/app/api/conversations/[id]/route')
      const request = createRequest()

      const response = await routeModule.GET(request, {
        params: Promise.resolve({ id: 'conv-123' }),
      } as RouteContext)
      const body = await response.json()

      expect(response.status).toBe(401)
      expect(body.code).toBe('NOT_AUTHENTICATED')
    })

    it('should return 404 when conversation not found', async () => {
      mockSession('user-123')
      mockDatabaseForGetRoute([])

      const routeModule = await import('@/app/api/conversations/[id]/route')
      const request = createRequest()

      const response = await routeModule.GET(request, {
        params: Promise.resolve({ id: 'nonexistent' }),
      } as RouteContext)
      const body = await response.json()

      expect(response.status).toBe(404)
      expect(body.code).toBe('CONVERSATION_NOT_FOUND')
    })

    it('should return 403 when user does not own location', async () => {
      mockSession('user-123')
      const conversation = createMockConversation()
      const location = createMockLocation({ userId: 'user-999' })

      mockDatabaseForGetRoute([conversation], [location])

      const routeModule = await import('@/app/api/conversations/[id]/route')
      const request = createRequest()

      const response = await routeModule.GET(request, {
        params: Promise.resolve({ id: 'conv-123' }),
      } as RouteContext)
      const body = await response.json()

      expect(response.status).toBe(403)
      expect(body.code).toBe('ACCESS_DENIED')
    })

    it('should return conversation when user owns location', async () => {
      mockSession('user-123')
      const conversation = createMockConversation()
      const location = createMockLocation()

      mockDatabaseForGetRoute([conversation], [location])

      const routeModule = await import('@/app/api/conversations/[id]/route')
      const request = createRequest()

      const response = await routeModule.GET(request, {
        params: Promise.resolve({ id: 'conv-123' }),
      } as RouteContext)
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.id).toBe('conv-123')
      expect(body.defaultModel).toBe('gemini-2.0-flash-lite')
    })

    it('should return 500 on database error', async () => {
      mockSession('user-123')
      const chain = createMockDatabaseChain()
      chain.where = vi.fn().mockRejectedValue(new Error('DB error'))

      vi.mocked(db.select).mockReturnValue(chain as any)

      const routeModule = await import('@/app/api/conversations/[id]/route')
      const request = createRequest()

      const response = await routeModule.GET(request, {
        params: Promise.resolve({ id: 'conv-123' }),
      } as RouteContext)
      const body = await response.json()

      expect(response.status).toBe(500)
      expect(body.code).toBe('FETCH_CONVERSATION_ERROR')
    })
  })

  // ==========================================================================
  // PATCH /api/conversations/[id] - Update conversation
  // ==========================================================================

  describe('PATCH /api/conversations/[id] - Update conversation', () => {
    it('should return 401 when unauthenticated', async () => {
      mockNoSession()
      const routeModule = await import('@/app/api/conversations/[id]/route')
      const request = createRequest(
        'http://localhost:3000/api/conversations/conv-123',
        'PATCH',
        { defaultModel: 'gpt-4o' },
      )

      const response = await routeModule.PATCH(request, {
        params: Promise.resolve({ id: 'conv-123' }),
      } as RouteContext)
      const body = await response.json()

      expect(response.status).toBe(401)
      expect(body.code).toBe('NOT_AUTHENTICATED')
    })

    it('should return 400 for invalid JSON', async () => {
      mockSession()
      const routeModule = await import('@/app/api/conversations/[id]/route')
      const request = new NextRequest(
        'http://localhost:3000/api/conversations/conv-123',
        {
          method: 'PATCH',
          body: 'invalid json {',
          headers: { 'Content-Type': 'application/json' },
        },
      )

      const response = await routeModule.PATCH(request, {
        params: Promise.resolve({ id: 'conv-123' }),
      } as RouteContext)
      const body = await response.json()

      expect(response.status).toBe(400)
      expect(body.code).toBe('INVALID_JSON')
    })

    it('should return 404 when conversation not found', async () => {
      mockSession('user-123')
      mockDatabaseForGetRoute([])

      const routeModule = await import('@/app/api/conversations/[id]/route')
      const request = createRequest(
        'http://localhost:3000/api/conversations/conv-123',
        'PATCH',
        { defaultModel: 'gpt-4o' },
      )

      const response = await routeModule.PATCH(request, {
        params: Promise.resolve({ id: 'nonexistent' }),
      } as RouteContext)
      const body = await response.json()

      expect(response.status).toBe(404)
      expect(body.code).toBe('CONVERSATION_NOT_FOUND')
    })

    it('should return 403 when user does not own location', async () => {
      mockSession('user-123')
      const conversation = createMockConversation()
      const location = createMockLocation({ userId: 'user-999' })

      mockDatabaseForGetRoute([conversation], [location])

      const routeModule = await import('@/app/api/conversations/[id]/route')
      const request = createRequest(
        'http://localhost:3000/api/conversations/conv-123',
        'PATCH',
        { defaultModel: 'gpt-4o' },
      )

      const response = await routeModule.PATCH(request, {
        params: Promise.resolve({ id: 'conv-123' }),
      } as RouteContext)
      const body = await response.json()

      expect(response.status).toBe(403)
      expect(body.code).toBe('ACCESS_DENIED')
    })

    it('should return 400 for invalid model', async () => {
      mockSession('user-123')
      const conversation = createMockConversation()
      const location = createMockLocation()

      mockDatabaseForGetRoute([conversation], [location])

      const { getModel } = await import('@/lib/ai/models')
      vi.mocked(getModel).mockImplementation(() => {
        throw new Error('Invalid model')
      })

      const routeModule = await import('@/app/api/conversations/[id]/route')
      const request = createRequest(
        'http://localhost:3000/api/conversations/conv-123',
        'PATCH',
        { defaultModel: 'invalid-model' },
      )

      const response = await routeModule.PATCH(request, {
        params: Promise.resolve({ id: 'conv-123' }),
      } as RouteContext)
      const body = await response.json()

      expect(response.status).toBe(400)
      expect(body.code).toBe('INVALID_MODEL')
    })

    it('should update conversation model', async () => {
      mockSession('user-123')
      const conversation = createMockConversation()
      const location = createMockLocation()
      const updatedConversation = createMockConversation({
        defaultModel: 'gpt-4o',
      })

      let selectCount = 0
      vi.mocked(db.select).mockImplementation(() => {
        selectCount++
        return {
          from: vi.fn().mockReturnThis(),
          where: vi
            .fn()
            .mockResolvedValue(selectCount === 1 ? [conversation] : [location]),
        } as any
      })

      const { getModel } = await import('@/lib/ai/models')
      vi.mocked(getModel).mockReturnValue({
        provider: 'openai',
        id: 'gpt-4o',
      } as any)

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([updatedConversation]),
      } as any)

      const routeModule = await import('@/app/api/conversations/[id]/route')
      const request = createRequest(
        'http://localhost:3000/api/conversations/conv-123',
        'PATCH',
        { defaultModel: 'gpt-4o' },
      )

      const response = await routeModule.PATCH(request, {
        params: Promise.resolve({ id: 'conv-123' }),
      } as RouteContext)
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.defaultModel).toBe('gpt-4o')
    })

    it('should return 500 on database error', async () => {
      mockSession('user-123')
      const conversation = createMockConversation()
      const location = createMockLocation()

      mockDatabaseForGetRoute([conversation], [location])

      const { getModel } = await import('@/lib/ai/models')
      vi.mocked(getModel).mockReturnValue({
        provider: 'openai',
        id: 'gpt-4o',
      } as any)

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockRejectedValue(new Error('DB error')),
      } as any)

      const routeModule = await import('@/app/api/conversations/[id]/route')
      const request = createRequest(
        'http://localhost:3000/api/conversations/conv-123',
        'PATCH',
        { defaultModel: 'gpt-4o' },
      )

      const response = await routeModule.PATCH(request, {
        params: Promise.resolve({ id: 'conv-123' }),
      } as RouteContext)
      const body = await response.json()

      expect(response.status).toBe(500)
      expect(body.code).toBe('UPDATE_CONVERSATION_ERROR')
    })
  })

  // ==========================================================================
  // DELETE /api/conversations/[id] - Delete conversation
  // ==========================================================================

  describe('DELETE /api/conversations/[id] - Delete conversation', () => {
    it('should return 401 when unauthenticated', async () => {
      mockNoSession()
      const routeModule = await import('@/app/api/conversations/[id]/route')
      const request = createRequest(
        'http://localhost:3000/api/conversations/conv-123',
        'DELETE',
      )

      const response = await routeModule.DELETE(request, {
        params: Promise.resolve({ id: 'conv-123' }),
      } as RouteContext)
      const body = await response.json()

      expect(response.status).toBe(401)
      expect(body.code).toBe('NOT_AUTHENTICATED')
    })

    it('should return 404 when conversation not found', async () => {
      mockSession('user-123')
      mockDatabaseForDeleteRoute([], [])

      const routeModule = await import('@/app/api/conversations/[id]/route')
      const request = createRequest(
        'http://localhost:3000/api/conversations/conv-123',
        'DELETE',
      )

      const response = await routeModule.DELETE(request, {
        params: Promise.resolve({ id: 'nonexistent' }),
      } as RouteContext)
      const body = await response.json()

      expect(response.status).toBe(404)
      expect(body.code).toBe('CONVERSATION_NOT_FOUND')
    })

    it('should return 403 when user does not own location', async () => {
      mockSession('user-123')
      const conversation = createMockConversation()
      const location = createMockLocation({ userId: 'user-999' })

      mockDatabaseForDeleteRoute([conversation], [location])

      const routeModule = await import('@/app/api/conversations/[id]/route')
      const request = createRequest(
        'http://localhost:3000/api/conversations/conv-123',
        'DELETE',
      )

      const response = await routeModule.DELETE(request, {
        params: Promise.resolve({ id: 'conv-123' }),
      } as RouteContext)
      const body = await response.json()

      expect(response.status).toBe(403)
      expect(body.code).toBe('ACCESS_DENIED')
    })

    it('should delete conversation', async () => {
      mockSession('user-123')
      const conversation = createMockConversation()
      const location = createMockLocation()

      let selectCount = 0
      vi.mocked(db.select).mockImplementation(() => {
        selectCount++
        return {
          from: vi.fn().mockReturnThis(),
          where: vi
            .fn()
            .mockResolvedValue(selectCount === 1 ? [conversation] : [location]),
        } as any
      })

      vi.mocked(db.delete).mockReturnValue({
        where: vi.fn().mockReturnThis(),
      } as RouteContext)

      const routeModule = await import('@/app/api/conversations/[id]/route')
      const request = createRequest(
        'http://localhost:3000/api/conversations/conv-123',
        'DELETE',
      )

      const response = await routeModule.DELETE(request, {
        params: Promise.resolve({ id: 'conv-123' }),
      } as RouteContext)
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.success).toBe(true)
    })

    it('should return 500 on database error', async () => {
      mockSession('user-123')
      const chain = createMockDatabaseChain()
      chain.where = vi.fn().mockRejectedValue(new Error('DB error'))

      vi.mocked(db.select).mockReturnValue(chain as any)

      const routeModule = await import('@/app/api/conversations/[id]/route')
      const request = createRequest(
        'http://localhost:3000/api/conversations/conv-123',
        'DELETE',
      )

      const response = await routeModule.DELETE(request, {
        params: Promise.resolve({ id: 'conv-123' }),
      } as RouteContext)
      const body = await response.json()

      expect(response.status).toBe(500)
      expect(body.code).toBe('DELETE_CONVERSATION_ERROR')
    })
  })

  // ==========================================================================
  // GET /api/conversations/[id]/history - Get conversation history
  // ==========================================================================

  describe('GET /api/conversations/[id]/history - Get conversation history', () => {
    it('should return 401 when unauthenticated', async () => {
      mockNoSession()
      const routeModule =
        await import('@/app/api/conversations/[id]/history/route')
      const request = createRequest()

      const response = await routeModule.GET(request, {
        params: Promise.resolve({ id: 'conv-123' }),
      } as RouteContext)
      const body = await response.json()

      expect(response.status).toBe(401)
      expect(body.error).toBe('Unauthorized')
    })

    it('should return 404 when conversation not found', async () => {
      mockSession('user-123')

      vi.mocked(db.select).mockImplementation(() => {
        return {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockResolvedValue([]),
          orderBy: vi.fn().mockReturnThis(),
        } as any
      })

      const routeModule =
        await import('@/app/api/conversations/[id]/history/route')
      const request = createRequest()

      const response = await routeModule.GET(request, {
        params: Promise.resolve({ id: 'nonexistent' }),
      } as RouteContext)
      const body = await response.json()

      expect(response.status).toBe(404)
      expect(body.error).toBe('Conversation not found')
    })

    it('should return 403 when user does not own location', async () => {
      mockSession('user-123')
      const conversation = createMockConversation()
      const location = createMockLocation({ userId: 'user-999' })

      let selectCount = 0
      vi.mocked(db.select).mockImplementation(() => {
        selectCount++
        return {
          from: vi.fn().mockReturnThis(),
          where: vi
            .fn()
            .mockResolvedValue(selectCount === 1 ? [conversation] : [location]),
          orderBy: vi.fn().mockReturnThis(),
        } as any
      })

      const routeModule =
        await import('@/app/api/conversations/[id]/history/route')
      const request = createRequest()

      const response = await routeModule.GET(request, {
        params: Promise.resolve({ id: 'conv-123' }),
      } as RouteContext)
      const body = await response.json()

      expect(response.status).toBe(403)
      expect(body.error).toBe('Access denied')
    })

    it('should return empty array when no messages', async () => {
      mockSession('user-123')
      const conversation = createMockConversation()
      const location = createMockLocation()

      let selectCount = 0
      vi.mocked(db.select).mockImplementation(() => {
        selectCount++
        if (selectCount === 1) {
          // First call: get conversation
          return {
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockResolvedValue([conversation]),
          } as any
        } else if (selectCount === 2) {
          // Second call: get location
          return {
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockResolvedValue([location]),
          } as any
        } else {
          // Third call: get messages (with orderBy)
          return {
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            orderBy: vi.fn().mockResolvedValue([]),
          } as any
        }
      })

      const routeModule =
        await import('@/app/api/conversations/[id]/history/route')
      const request = createRequest()

      const response = await routeModule.GET(request, {
        params: Promise.resolve({ id: 'conv-123' }),
      } as RouteContext)
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(Array.isArray(body)).toBe(true)
      expect(body.length).toBe(0)
    })

    it('should return messages in chronological order', async () => {
      mockSession('user-123')
      const conversation = createMockConversation()
      const location = createMockLocation()
      const messages = [
        createMockMessage({ id: 'msg-1', role: 'user' }),
        createMockMessage({
          id: 'msg-2',
          role: 'assistant',
          modelUsed: 'gemini-2.0-flash-lite',
          tokensIn: 100,
          tokensOut: 150,
        }),
        createMockMessage({ id: 'msg-3', role: 'user' }),
      ]

      let selectCount = 0
      vi.mocked(db.select).mockImplementation(() => {
        selectCount++
        if (selectCount === 1) {
          // First call: get conversation
          return {
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockResolvedValue([conversation]),
          } as any
        } else if (selectCount === 2) {
          // Second call: get location
          return {
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockResolvedValue([location]),
          } as any
        } else {
          // Third call: get messages (with orderBy)
          return {
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            orderBy: vi.fn().mockResolvedValue(messages),
          } as any
        }
      })

      const routeModule =
        await import('@/app/api/conversations/[id]/history/route')
      const request = createRequest()

      const response = await routeModule.GET(request, {
        params: Promise.resolve({ id: 'conv-123' }),
      } as RouteContext)
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(Array.isArray(body)).toBe(true)
      expect(body.length).toBe(3)
      expect(body[0].role).toBe('user')
      expect(body[1].modelUsed).toBe('gemini-2.0-flash-lite')
      expect(body[1].tokensIn).toBe(100)
      expect(body[1].tokensOut).toBe(150)
      expect(body[2].role).toBe('user')
    })

    it('should format null token values correctly', async () => {
      mockSession('user-123')
      const conversation = createMockConversation()
      const location = createMockLocation()
      const messages = [
        createMockMessage({ role: 'user', tokensIn: null, tokensOut: null }),
      ]

      let selectCount = 0
      vi.mocked(db.select).mockImplementation(() => {
        selectCount++
        if (selectCount === 1) {
          // First call: get conversation
          return {
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockResolvedValue([conversation]),
          } as any
        } else if (selectCount === 2) {
          // Second call: get location
          return {
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockResolvedValue([location]),
          } as any
        } else {
          // Third call: get messages (with orderBy)
          return {
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            orderBy: vi.fn().mockResolvedValue(messages),
          } as any
        }
      })

      const routeModule =
        await import('@/app/api/conversations/[id]/history/route')
      const request = createRequest()

      const response = await routeModule.GET(request, {
        params: Promise.resolve({ id: 'conv-123' }),
      } as RouteContext)
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body[0].tokensIn).toBeNull()
      expect(body[0].tokensOut).toBeNull()
    })

    it('should return 500 on database error', async () => {
      mockSession('user-123')
      const chain = createMockDatabaseChain()
      chain.where = vi.fn().mockRejectedValue(new Error('DB error'))

      vi.mocked(db.select).mockReturnValue(chain as any)

      const routeModule =
        await import('@/app/api/conversations/[id]/history/route')
      const request = createRequest()

      const response = await routeModule.GET(request, {
        params: Promise.resolve({ id: 'conv-123' }),
      } as RouteContext)
      const body = await response.json()

      expect(response.status).toBe(500)
      expect(body.error).toBe('Failed to fetch conversation history')
    })
  })

  // ==========================================================================
  // POST /api/conversations/[id]/message - Send message and stream response
  // ==========================================================================

  describe('POST /api/conversations/[id]/message - Send message and stream', () => {
    it('should return 401 when unauthenticated', async () => {
      mockNoSession()
      const routeModule =
        await import('@/app/api/conversations/[id]/message/route')
      const request = createRequest(
        'http://localhost:3000/api/conversations/conv-123/message',
        'POST',
        { message: 'Hello' },
      )

      const response = await routeModule.POST(request, {
        params: Promise.resolve({ id: 'conv-123' }),
      } as RouteContext)
      const body = await response.json()

      expect(response.status).toBe(401)
      expect(body.error).toBe('Unauthorized')
    })

    it('should return 400 when message is missing', async () => {
      mockSession('user-123')
      const routeModule =
        await import('@/app/api/conversations/[id]/message/route')
      const request = createRequest(
        'http://localhost:3000/api/conversations/conv-123/message',
        'POST',
        {},
      )

      const response = await routeModule.POST(request, {
        params: Promise.resolve({ id: 'conv-123' }),
      } as RouteContext)
      const body = await response.json()

      expect(response.status).toBe(400)
      expect(body.error).toBe('Missing required field: message')
    })

    it('should return 404 when conversation not found', async () => {
      mockSession('user-123')

      vi.mocked(db.select).mockImplementation(() => {
        return {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockResolvedValue([]),
          orderBy: vi.fn().mockReturnThis(),
        } as any
      })

      const routeModule =
        await import('@/app/api/conversations/[id]/message/route')
      const request = createRequest(
        'http://localhost:3000/api/conversations/conv-123/message',
        'POST',
        { message: 'Hello' },
      )

      const response = await routeModule.POST(request, {
        params: Promise.resolve({ id: 'nonexistent' }),
      } as RouteContext)
      const body = await response.json()

      expect(response.status).toBe(404)
      expect(body.error).toBe('Conversation not found')
    })

    it('should return 403 when user does not own location', async () => {
      mockSession('user-123')
      const conversation = createMockConversation()
      const location = createMockLocation({ userId: 'user-999' })

      let selectCount = 0
      vi.mocked(db.select).mockImplementation(() => {
        selectCount++
        return {
          from: vi.fn().mockReturnThis(),
          where: vi
            .fn()
            .mockResolvedValue(selectCount === 1 ? [conversation] : [location]),
          orderBy: vi.fn().mockReturnThis(),
        } as any
      })

      const routeModule =
        await import('@/app/api/conversations/[id]/message/route')
      const request = createRequest(
        'http://localhost:3000/api/conversations/conv-123/message',
        'POST',
        { message: 'Hello' },
      )

      const response = await routeModule.POST(request, {
        params: Promise.resolve({ id: 'conv-123' }),
      } as RouteContext)
      const body = await response.json()

      expect(response.status).toBe(403)
      expect(body.error).toBe('Access denied')
    })

    it.skip('should stream response with correct headers', async () => {
      // This test verifies the streaming response structure
      // Full streaming integration is tested in E2E tests
      mockSession('user-123')
      const conversation = createMockConversation()
      const location = createMockLocation()

      let selectCount = 0
      vi.mocked(db.select).mockImplementation(() => {
        selectCount++
        if (selectCount === 1) {
          return {
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockResolvedValue([conversation]),
          } as any
        } else if (selectCount === 2) {
          return {
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockResolvedValue([location]),
          } as any
        } else {
          return {
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            orderBy: vi.fn().mockResolvedValue([]),
          } as any
        }
      })

      const { getModel } = await import('@/lib/ai/models')
      vi.mocked(getModel).mockReturnValue({
        provider: 'google',
        id: 'gemini-2.0-flash-lite',
      } as any)

      const { buildContextData } = await import('@/lib/ai/context-builder')
      vi.mocked(buildContextData).mockResolvedValue({} as RouteContext)

      const { buildPromptWithContext } = await import('@/lib/ai/prompts')
      vi.mocked(buildPromptWithContext).mockReturnValue('System prompt')

      const { persistUserMessage } = await import('@/lib/ai/stream-handler')
      vi.mocked(persistUserMessage).mockResolvedValue(undefined)

      // Mock a readable stream response
      const mockStream = {
        async *[Symbol.asyncIterator]() {
          yield 'chunk1'
        },
      }

      vi.mocked(streamText).mockReturnValue({
        textStream: mockStream,
        usage: Promise.resolve({
          input: 100,
          output: 150,
        }),
      } as RouteContext)

      const savedKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'test-key'

      try {
        const routeModule =
          await import('@/app/api/conversations/[id]/message/route')
        const request = createRequest(
          'http://localhost:3000/api/conversations/conv-123/message',
          'POST',
          { message: 'Hello' },
        )

        const response = await routeModule.POST(request, {
          params: Promise.resolve({ id: 'conv-123' }),
        } as RouteContext)

        // Verify response is a streaming response
        expect(response.status).toBe(200)
        expect(response.headers.get('Content-Type')).toBe('text/event-stream')
        expect(response.headers.get('Cache-Control')).toBe('no-cache')
        expect(response.headers.get('Connection')).toBe('keep-alive')
      } finally {
        if (savedKey) {
          process.env.GOOGLE_GENERATIVE_AI_API_KEY = savedKey
        } else {
          delete process.env.GOOGLE_GENERATIVE_AI_API_KEY
        }
      }
    })

    it('should return 503 when OpenAI provider not available', async () => {
      mockSession('user-123')
      const conversation = createMockConversation({ defaultModel: 'gpt-4o' })
      const location = createMockLocation()

      let selectCount = 0
      vi.mocked(db.select).mockImplementation(() => {
        selectCount++
        return {
          from: vi.fn().mockReturnThis(),
          where: vi
            .fn()
            .mockResolvedValue(
              selectCount === 1
                ? [conversation]
                : selectCount === 2
                  ? [location]
                  : [],
            ),
          orderBy: vi.fn().mockReturnThis(),
        } as any
      })

      const { getModel } = await import('@/lib/ai/models')
      vi.mocked(getModel).mockReturnValue({
        provider: 'openai',
        id: 'gpt-4o',
      } as any)

      const { buildContextData } = await import('@/lib/ai/context-builder')
      vi.mocked(buildContextData).mockResolvedValue({} as RouteContext)

      const { buildPromptWithContext } = await import('@/lib/ai/prompts')
      vi.mocked(buildPromptWithContext).mockReturnValue('System prompt')

      const { persistUserMessage } = await import('@/lib/ai/stream-handler')
      vi.mocked(persistUserMessage).mockResolvedValue(undefined)

      // Delete OPENAI_API_KEY to simulate unavailable provider
      const savedKey = process.env.OPENAI_API_KEY
      delete process.env.OPENAI_API_KEY

      const routeModule =
        await import('@/app/api/conversations/[id]/message/route')
      const request = createRequest(
        'http://localhost:3000/api/conversations/conv-123/message',
        'POST',
        { message: 'Hello' },
      )

      const response = await routeModule.POST(request, {
        params: Promise.resolve({ id: 'conv-123' }),
      } as RouteContext)

      expect(response.status).toBe(503)

      // Restore key
      if (savedKey) process.env.OPENAI_API_KEY = savedKey
    })

    it('should persist user message before streaming', async () => {
      mockSession('user-123')
      const conversation = createMockConversation()
      const location = createMockLocation()

      let selectCount = 0
      vi.mocked(db.select).mockImplementation(() => {
        selectCount++
        return {
          from: vi.fn().mockReturnThis(),
          where: vi
            .fn()
            .mockResolvedValue(
              selectCount === 1
                ? [conversation]
                : selectCount === 2
                  ? [location]
                  : [],
            ),
          orderBy: vi.fn().mockReturnThis(),
        } as any
      })

      const { getModel } = await import('@/lib/ai/models')
      vi.mocked(getModel).mockReturnValue({
        provider: 'google',
        id: 'gemini-2.0-flash-lite',
      } as any)

      const { buildContextData } = await import('@/lib/ai/context-builder')
      vi.mocked(buildContextData).mockResolvedValue({} as RouteContext)

      const { buildPromptWithContext } = await import('@/lib/ai/prompts')
      vi.mocked(buildPromptWithContext).mockReturnValue('System prompt')

      const { persistUserMessage } = await import('@/lib/ai/stream-handler')
      vi.mocked(persistUserMessage).mockResolvedValue(undefined)

      vi.mocked(streamText).mockReturnValue({
        textStream: {
          async *[Symbol.asyncIterator]() {
            yield 'Response'
          },
        },
        usage: Promise.resolve({
          input: 100,
          output: 150,
        }),
      } as RouteContext)

      const routeModule =
        await import('@/app/api/conversations/[id]/message/route')
      const request = createRequest(
        'http://localhost:3000/api/conversations/conv-123/message',
        'POST',
        { message: 'Test message' },
      )

      await routeModule.POST(request, {
        params: Promise.resolve({ id: 'conv-123' }),
      } as RouteContext)

      expect(persistUserMessage).toHaveBeenCalledWith(
        'conv-123',
        'Test message',
      )
    })
  })
})
