/**
 * Auth Route Tests
 *
 * Tests for GET|POST /api/auth/[...all] handler
 *
 * Coverage includes:
 * - Route delegates to Better Auth handler
 * - GET requests route through handler
 * - POST requests route through handler
 * - Both methods pass request object correctly
 *
 * Note: Deep auth logic (signup, login, session, etc.) is tested by Better Auth itself
 * and via E2E tests. This suite focuses on route wiring and request/response delegation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock the auth module
vi.mock('@/lib/auth', () => ({
  auth: {
    handler: vi.fn(),
  },
}))

import { auth } from '@/lib/auth'

// ============================================================================
// Test Suite
// ============================================================================

describe('Auth Route Handler (/api/auth/[...all])', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // =========================================================================
  // Route Wiring Tests
  // =========================================================================

  describe('Route Exports', () => {
    it('should export GET and POST methods', async () => {
      // Dynamically import the route to check exports
      const routeModule = await import('@/app/api/auth/[...all]/route')

      expect(routeModule.GET).toBeDefined()
      expect(routeModule.POST).toBeDefined()
      expect(typeof routeModule.GET).toBe('function')
      expect(typeof routeModule.POST).toBe('function')
    })

    it('should both export callable functions', async () => {
      const routeModule = await import('@/app/api/auth/[...all]/route')

      expect(routeModule.GET).toBeInstanceOf(Function)
      expect(routeModule.POST).toBeInstanceOf(Function)
    })
  })

  // =========================================================================
  // GET Request Tests
  // =========================================================================

  describe('GET Handler', () => {
    it('should call auth.handler with GET request', async () => {
      const mockResponse = new Response(JSON.stringify({ status: 'ok' }), {
        status: 200,
      })
      vi.mocked(auth.handler).mockResolvedValueOnce(mockResponse)

      const routeModule = await import('@/app/api/auth/[...all]/route')
      const mockRequest = new Request('http://localhost:3000/api/auth/signin', {
        method: 'GET',
      })

      await routeModule.GET(mockRequest)

      expect(auth.handler).toHaveBeenCalledWith(mockRequest)
      expect(auth.handler).toHaveBeenCalledTimes(1)
    })

    it('should delegate GET request to auth handler', async () => {
      const mockResponse = new Response(
        JSON.stringify({ authenticated: true }),
        {
          status: 200,
        },
      )
      vi.mocked(auth.handler).mockResolvedValueOnce(mockResponse)

      const routeModule = await import('@/app/api/auth/[...all]/route')
      const mockRequest = new Request(
        'http://localhost:3000/api/auth/session',
        {
          method: 'GET',
        },
      )

      const result = await routeModule.GET(mockRequest)

      // Verify handler was called and response is returned
      expect(result.status).toBe(200)
      expect(auth.handler).toHaveBeenCalledWith(mockRequest)
    })

    it('should pass request with query parameters to handler', async () => {
      const mockResponse = new Response(JSON.stringify({ data: 'response' }), {
        status: 200,
      })
      vi.mocked(auth.handler).mockResolvedValueOnce(mockResponse)

      const routeModule = await import('@/app/api/auth/[...all]/route')
      const mockRequest = new Request(
        'http://localhost:3000/api/auth/callback?code=abc123&state=xyz',
        { method: 'GET' },
      )

      await routeModule.GET(mockRequest)

      expect(auth.handler).toHaveBeenCalledWith(mockRequest)
      // Verify the URL is preserved in the request
      expect(mockRequest.url).toContain('code=abc123')
      expect(mockRequest.url).toContain('state=xyz')
    })

    it('should handle GET request for different auth endpoints', async () => {
      const mockResponse = new Response('{}', { status: 200 })
      vi.mocked(auth.handler).mockResolvedValue(mockResponse)

      const routeModule = await import('@/app/api/auth/[...all]/route')
      const endpoints = ['signin', 'signup', 'session', 'signout']

      for (const endpoint of endpoints) {
        vi.mocked(auth.handler).mockResolvedValueOnce(mockResponse)
        const request = new Request(
          `http://localhost:3000/api/auth/${endpoint}`,
          { method: 'GET' },
        )
        await routeModule.GET(request)
        expect(auth.handler).toHaveBeenCalledWith(request)
      }

      expect(auth.handler).toHaveBeenCalledTimes(endpoints.length)
    })

    it('should return response from auth handler', async () => {
      const expectedData = { user: { id: '123', email: 'test@example.com' } }
      const mockResponse = new Response(JSON.stringify(expectedData), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
      vi.mocked(auth.handler).mockResolvedValueOnce(mockResponse)

      const routeModule = await import('@/app/api/auth/[...all]/route')
      const mockRequest = new Request(
        'http://localhost:3000/api/auth/session',
        {
          method: 'GET',
        },
      )

      const result = await routeModule.GET(mockRequest)

      // Verify response status
      expect(result.status).toBe(200)
      expect(auth.handler).toHaveBeenCalledWith(mockRequest)
    })
  })

  // =========================================================================
  // POST Request Tests
  // =========================================================================

  describe('POST Handler', () => {
    it('should call auth.handler with POST request', async () => {
      const mockResponse = new Response(JSON.stringify({ status: 'ok' }), {
        status: 200,
      })
      vi.mocked(auth.handler).mockResolvedValueOnce(mockResponse)

      const routeModule = await import('@/app/api/auth/[...all]/route')
      const mockRequest = new Request('http://localhost:3000/api/auth/signin', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'pass123',
        }),
      })

      await routeModule.POST(mockRequest)

      expect(auth.handler).toHaveBeenCalledWith(mockRequest)
      expect(auth.handler).toHaveBeenCalledTimes(1)
    })

    it('should delegate POST request to auth handler', async () => {
      const mockResponse = new Response(
        JSON.stringify({ authenticated: true }),
        {
          status: 200,
        },
      )
      vi.mocked(auth.handler).mockResolvedValueOnce(mockResponse)

      const routeModule = await import('@/app/api/auth/[...all]/route')
      const mockRequest = new Request('http://localhost:3000/api/auth/signin', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'pass123',
        }),
      })

      const result = await routeModule.POST(mockRequest)

      // Verify handler called and response returned
      expect(result.status).toBe(200)
      expect(auth.handler).toHaveBeenCalledWith(mockRequest)
    })

    it('should pass POST request body through to handler', async () => {
      const mockResponse = new Response(JSON.stringify({ success: true }), {
        status: 200,
      })
      vi.mocked(auth.handler).mockResolvedValueOnce(mockResponse)

      const routeModule = await import('@/app/api/auth/[...all]/route')
      const body = {
        email: 'user@example.com',
        password: 'securepass123',
      }
      const mockRequest = new Request('http://localhost:3000/api/auth/signin', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'content-type': 'application/json' },
      })

      await routeModule.POST(mockRequest)

      expect(auth.handler).toHaveBeenCalledWith(mockRequest)
    })

    it('should handle POST request for different auth endpoints', async () => {
      const mockResponse = new Response('{}', { status: 200 })
      vi.mocked(auth.handler).mockResolvedValue(mockResponse)

      const routeModule = await import('@/app/api/auth/[...all]/route')
      const endpoints = ['signin', 'signup', 'signout', 'change-password']

      for (const endpoint of endpoints) {
        vi.mocked(auth.handler).mockResolvedValueOnce(mockResponse)
        const request = new Request(
          `http://localhost:3000/api/auth/${endpoint}`,
          {
            method: 'POST',
            body: JSON.stringify({ data: 'test' }),
          },
        )
        await routeModule.POST(request)
        expect(auth.handler).toHaveBeenCalledWith(request)
      }

      expect(auth.handler).toHaveBeenCalledTimes(endpoints.length)
    })

    it('should return response from auth handler', async () => {
      const expectedData = { token: 'jwt-token-here', expires: 3600 }
      const mockResponse = new Response(JSON.stringify(expectedData), {
        status: 201,
        headers: { 'content-type': 'application/json' },
      })
      vi.mocked(auth.handler).mockResolvedValueOnce(mockResponse)

      const routeModule = await import('@/app/api/auth/[...all]/route')
      const mockRequest = new Request('http://localhost:3000/api/auth/signin', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com', password: 'pass' }),
      })

      const result = await routeModule.POST(mockRequest)

      // Verify response status from handler
      expect(result.status).toBe(201)
      expect(auth.handler).toHaveBeenCalledWith(mockRequest)
    })
  })

  // =========================================================================
  // Cross-Method Tests
  // =========================================================================

  describe('GET and POST Consistency', () => {
    it('both methods should delegate to auth.handler', async () => {
      const mockResponse = new Response('{}', { status: 200 })
      vi.mocked(auth.handler).mockResolvedValue(mockResponse)

      const routeModule = await import('@/app/api/auth/[...all]/route')

      const getRequest = new Request('http://localhost:3000/api/auth/session', {
        method: 'GET',
      })
      const postRequest = new Request('http://localhost:3000/api/auth/signin', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com' }),
      })

      await routeModule.GET(getRequest)
      await routeModule.POST(postRequest)

      expect(auth.handler).toHaveBeenCalledTimes(2)
      expect(auth.handler).toHaveBeenNthCalledWith(1, getRequest)
      expect(auth.handler).toHaveBeenNthCalledWith(2, postRequest)
    })

    it('both methods should receive request object', async () => {
      const mockResponse = new Response('{}', { status: 200 })
      vi.mocked(auth.handler).mockResolvedValue(mockResponse)

      const routeModule = await import('@/app/api/auth/[...all]/route')

      const mockRequest = new Request('http://localhost:3000/api/auth/test', {
        method: 'GET',
      })

      // GET should pass request
      await routeModule.GET(mockRequest)
      const getCall = vi.mocked(auth.handler).mock.calls[0][0]
      expect(getCall).toBeInstanceOf(Request)

      // POST should pass request
      const postRequest = new Request('http://localhost:3000/api/auth/test', {
        method: 'POST',
      })
      await routeModule.POST(postRequest)
      const postCall = vi.mocked(auth.handler).mock.calls[1][0]
      expect(postCall).toBeInstanceOf(Request)
    })

    it('both methods should handle auth.handler responses', async () => {
      const mockGetResponse = new Response(JSON.stringify({ method: 'GET' }), {
        status: 200,
      })
      const mockPostResponse = new Response(
        JSON.stringify({ method: 'POST' }),
        {
          status: 201,
        },
      )

      vi.mocked(auth.handler)
        .mockResolvedValueOnce(mockGetResponse)
        .mockResolvedValueOnce(mockPostResponse)

      const routeModule = await import('@/app/api/auth/[...all]/route')

      const getRequest = new Request('http://localhost:3000/api/auth/test', {
        method: 'GET',
      })
      const postRequest = new Request('http://localhost:3000/api/auth/test', {
        method: 'POST',
      })

      const getResult = await routeModule.GET(getRequest)
      const postResult = await routeModule.POST(postRequest)

      expect(getResult.status).toBe(200)
      expect(postResult.status).toBe(201)
    })
  })

  // =========================================================================
  // Error Handling Tests
  // =========================================================================

  describe('Error Handling', () => {
    it('should propagate errors from auth.handler in GET', async () => {
      const error = new Error('Auth handler failed')
      vi.mocked(auth.handler).mockRejectedValueOnce(error)

      const routeModule = await import('@/app/api/auth/[...all]/route')
      const mockRequest = new Request(
        'http://localhost:3000/api/auth/session',
        {
          method: 'GET',
        },
      )

      await expect(routeModule.GET(mockRequest)).rejects.toThrow(
        'Auth handler failed',
      )
    })

    it('should propagate errors from auth.handler in POST', async () => {
      const error = new Error('Auth handler failed')
      vi.mocked(auth.handler).mockRejectedValueOnce(error)

      const routeModule = await import('@/app/api/auth/[...all]/route')
      const mockRequest = new Request('http://localhost:3000/api/auth/signin', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com' }),
      })

      await expect(routeModule.POST(mockRequest)).rejects.toThrow(
        'Auth handler failed',
      )
    })

    it('should handle auth.handler returning error response', async () => {
      const errorResponse = new Response(
        JSON.stringify({ error: 'Invalid credentials' }),
        { status: 401 },
      )
      vi.mocked(auth.handler).mockResolvedValueOnce(errorResponse)

      const routeModule = await import('@/app/api/auth/[...all]/route')
      const mockRequest = new Request('http://localhost:3000/api/auth/signin', {
        method: 'POST',
        body: JSON.stringify({ email: 'wrong@example.com', password: 'wrong' }),
      })

      const result = await routeModule.POST(mockRequest)

      expect(result.status).toBe(401)
    })

    it('should handle malformed requests gracefully', async () => {
      const mockResponse = new Response('{}', { status: 400 })
      vi.mocked(auth.handler).mockResolvedValueOnce(mockResponse)

      const routeModule = await import('@/app/api/auth/[...all]/route')
      const mockRequest = new Request('http://localhost:3000/api/auth/signin', {
        method: 'POST',
        body: 'invalid json',
      })

      const result = await routeModule.POST(mockRequest)

      expect(auth.handler).toHaveBeenCalledWith(mockRequest)
      expect(result.status).toBe(400)
    })
  })

  // =========================================================================
  // Request Headers & Context Tests
  // =========================================================================

  describe('Request Headers & Context', () => {
    it('should preserve request headers in GET', async () => {
      const mockResponse = new Response('{}', { status: 200 })
      vi.mocked(auth.handler).mockResolvedValueOnce(mockResponse)

      const routeModule = await import('@/app/api/auth/[...all]/route')
      const mockRequest = new Request(
        'http://localhost:3000/api/auth/session',
        {
          method: 'GET',
          headers: {
            'content-type': 'application/json',
            cookie: 'session=abc123',
          },
        },
      )

      await routeModule.GET(mockRequest)

      const passedRequest = vi.mocked(auth.handler).mock.calls[0][0]
      expect(passedRequest.headers.get('content-type')).toBe('application/json')
      expect(passedRequest.headers.get('cookie')).toBe('session=abc123')
    })

    it('should preserve request headers in POST', async () => {
      const mockResponse = new Response('{}', { status: 200 })
      vi.mocked(auth.handler).mockResolvedValueOnce(mockResponse)

      const routeModule = await import('@/app/api/auth/[...all]/route')
      const mockRequest = new Request('http://localhost:3000/api/auth/signin', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: 'Bearer token123',
        },
        body: JSON.stringify({ email: 'test@example.com' }),
      })

      await routeModule.POST(mockRequest)

      const passedRequest = vi.mocked(auth.handler).mock.calls[0][0]
      expect(passedRequest.headers.get('content-type')).toBe('application/json')
      expect(passedRequest.headers.get('authorization')).toBe('Bearer token123')
    })

    it('should preserve request URL path', async () => {
      const mockResponse = new Response('{}', { status: 200 })
      vi.mocked(auth.handler).mockResolvedValueOnce(mockResponse)

      const routeModule = await import('@/app/api/auth/[...all]/route')
      const mockRequest = new Request(
        'http://localhost:3000/api/auth/signin/oauth',
        { method: 'POST' },
      )

      await routeModule.POST(mockRequest)

      const passedRequest = vi.mocked(auth.handler).mock.calls[0][0]
      expect(passedRequest.url).toContain('/api/auth/signin/oauth')
    })
  })

  // =========================================================================
  // Integration Tests
  // =========================================================================

  describe('Integration with Better Auth', () => {
    it('should follow Better Auth handler delegation pattern', async () => {
      // This test verifies the route follows the pattern:
      // export const GET = (req: Request) => auth.handler(req)
      // export const POST = (req: Request) => auth.handler(req)

      const mockResponse = new Response('{}', { status: 200 })
      vi.mocked(auth.handler).mockResolvedValue(mockResponse)

      const routeModule = await import('@/app/api/auth/[...all]/route')

      const request = new Request('http://localhost:3000/api/auth/test', {
        method: 'GET',
      })

      // Should delegate directly to auth.handler
      const result = await routeModule.GET(request)
      expect(result.status).toBe(200)
      expect(auth.handler).toHaveBeenCalledWith(request)
    })

    it('should maintain Better Auth handler interface', async () => {
      // Verify that auth.handler is being called with the request object only
      const mockResponse = new Response('{}', { status: 200 })
      vi.mocked(auth.handler).mockResolvedValue(mockResponse)

      const routeModule = await import('@/app/api/auth/[...all]/route')
      const request = new Request('http://localhost:3000/api/auth/test', {
        method: 'POST',
      })

      await routeModule.POST(request)

      // Verify handler was called with exactly one argument (the request)
      expect(auth.handler).toHaveBeenCalledWith(expect.any(Request))
      const calls = vi.mocked(auth.handler).mock.calls
      expect(calls[0]).toHaveLength(1) // Only one argument
    })
  })
})
