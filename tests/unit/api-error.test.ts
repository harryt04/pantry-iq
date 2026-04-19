import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  ApiError,
  logErrorSafely,
  type ApiErrorResponse,
} from '@/lib/api-error'
import { cn } from '@/lib/utils'

describe('ApiError', () => {
  describe('badRequest()', () => {
    it('should return 400 status code', async () => {
      const response = ApiError.badRequest('Invalid input', 'INVALID_INPUT')
      expect(response.status).toBe(400)
    })

    it('should return correct error message and code', async () => {
      const response = ApiError.badRequest(
        'Missing email field',
        'MISSING_EMAIL',
      )
      const body = (await response.json()) as ApiErrorResponse
      expect(body.error).toBe('Missing email field')
      expect(body.code).toBe('MISSING_EMAIL')
    })

    it('should use default code when not provided', async () => {
      const response = ApiError.badRequest('Something went wrong')
      const body = (await response.json()) as ApiErrorResponse
      expect(body.code).toBe('BAD_REQUEST')
    })

    it('should have correct content-type header', () => {
      const response = ApiError.badRequest('Test', 'TEST_ERROR')
      expect(response.headers.get('content-type')).toBe('application/json')
    })
  })

  describe('unauthorized()', () => {
    it('should return 401 status code', async () => {
      const response = ApiError.unauthorized(
        'Not authenticated',
        'NOT_AUTHENTICATED',
      )
      expect(response.status).toBe(401)
    })

    it('should return correct error message and code', async () => {
      const response = ApiError.unauthorized(
        'Please log in first',
        'AUTHENTICATION_REQUIRED',
      )
      const body = (await response.json()) as ApiErrorResponse
      expect(body.error).toBe('Please log in first')
      expect(body.code).toBe('AUTHENTICATION_REQUIRED')
    })

    it('should use default message when not provided', async () => {
      const response = ApiError.unauthorized()
      const body = (await response.json()) as ApiErrorResponse
      expect(body.error).toBe('Unauthorized')
    })

    it('should use default code when not provided', async () => {
      const response = ApiError.unauthorized('Auth failed')
      const body = (await response.json()) as ApiErrorResponse
      expect(body.code).toBe('UNAUTHORIZED')
    })
  })

  describe('forbidden()', () => {
    it('should return 403 status code', async () => {
      const response = ApiError.forbidden('Access denied', 'ACCESS_DENIED')
      expect(response.status).toBe(403)
    })

    it('should return correct error message and code', async () => {
      const response = ApiError.forbidden(
        'You do not have permission',
        'INSUFFICIENT_PERMISSIONS',
      )
      const body = (await response.json()) as ApiErrorResponse
      expect(body.error).toBe('You do not have permission')
      expect(body.code).toBe('INSUFFICIENT_PERMISSIONS')
    })

    it('should use default message when not provided', async () => {
      const response = ApiError.forbidden()
      const body = (await response.json()) as ApiErrorResponse
      expect(body.error).toBe('Access denied')
    })

    it('should use default code when not provided', async () => {
      const response = ApiError.forbidden('No access')
      const body = (await response.json()) as ApiErrorResponse
      expect(body.code).toBe('FORBIDDEN')
    })
  })

  describe('notFound()', () => {
    it('should return 404 status code', async () => {
      const response = ApiError.notFound('Item not found', 'ITEM_NOT_FOUND')
      expect(response.status).toBe(404)
    })

    it('should return correct error message and code', async () => {
      const response = ApiError.notFound(
        'User profile not found',
        'PROFILE_NOT_FOUND',
      )
      const body = (await response.json()) as ApiErrorResponse
      expect(body.error).toBe('User profile not found')
      expect(body.code).toBe('PROFILE_NOT_FOUND')
    })

    it('should use default message when not provided', async () => {
      const response = ApiError.notFound()
      const body = (await response.json()) as ApiErrorResponse
      expect(body.error).toBe('Resource not found')
    })

    it('should use default code when not provided', async () => {
      const response = ApiError.notFound('Not found')
      const body = (await response.json()) as ApiErrorResponse
      expect(body.code).toBe('NOT_FOUND')
    })
  })

  describe('internalServerError()', () => {
    it('should return 500 status code', async () => {
      const response = ApiError.internalServerError(
        'Database error',
        'DATABASE_ERROR',
      )
      expect(response.status).toBe(500)
    })

    it('should return correct error message and code', async () => {
      const response = ApiError.internalServerError(
        'Failed to process request',
        'PROCESSING_FAILED',
      )
      const body = (await response.json()) as ApiErrorResponse
      expect(body.error).toBe('Failed to process request')
      expect(body.code).toBe('PROCESSING_FAILED')
    })

    it('should use default message when not provided', async () => {
      const response = ApiError.internalServerError()
      const body = (await response.json()) as ApiErrorResponse
      expect(body.error).toBe('An unexpected error occurred')
    })

    it('should use default code when not provided', async () => {
      const response = ApiError.internalServerError('Server crashed')
      const body = (await response.json()) as ApiErrorResponse
      expect(body.code).toBe('INTERNAL_SERVER_ERROR')
    })
  })

  describe('conflict()', () => {
    it('should return 409 status code', async () => {
      const response = ApiError.conflict('Resource already exists', 'DUPLICATE')
      expect(response.status).toBe(409)
    })

    it('should return correct error message and code', async () => {
      const response = ApiError.conflict(
        'Email already registered',
        'EMAIL_EXISTS',
      )
      const body = (await response.json()) as ApiErrorResponse
      expect(body.error).toBe('Email already registered')
      expect(body.code).toBe('EMAIL_EXISTS')
    })

    it('should use default code when not provided', async () => {
      const response = ApiError.conflict('Duplicate entry')
      const body = (await response.json()) as ApiErrorResponse
      expect(body.code).toBe('CONFLICT')
    })
  })

  describe('unprocessable()', () => {
    it('should return 422 status code', async () => {
      const response = ApiError.unprocessable('Invalid data', 'INVALID_DATA')
      expect(response.status).toBe(422)
    })

    it('should return correct error message and code', async () => {
      const response = ApiError.unprocessable(
        'CSV format invalid',
        'CSV_INVALID',
      )
      const body = (await response.json()) as ApiErrorResponse
      expect(body.error).toBe('CSV format invalid')
      expect(body.code).toBe('CSV_INVALID')
    })

    it('should use default code when not provided', async () => {
      const response = ApiError.unprocessable('Bad input')
      const body = (await response.json()) as ApiErrorResponse
      expect(body.code).toBe('UNPROCESSABLE_ENTITY')
    })
  })
})

describe('logErrorSafely()', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  describe('Error object handling', () => {
    it('should handle Error instances', () => {
      const error = new Error('Test error message')
      const result = logErrorSafely(error, 'TEST_CONTEXT')

      expect(result).toBe('An unexpected error occurred. Please try again.')
      expect(consoleErrorSpy).toHaveBeenCalled()
    })

    it('should not include stack trace in return value', () => {
      const error = new Error('Database connection failed')
      const result = logErrorSafely(error, 'DATABASE_CONTEXT')

      expect(result).not.toContain('at ')
      expect(result).not.toContain('Error:')
      expect(result).not.toContain('node_modules')
      expect(result).toBe('An unexpected error occurred. Please try again.')
    })

    it('should log stack trace server-side', () => {
      const error = new Error('Server error')
      logErrorSafely(error, 'SERVER_CONTEXT')

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[SERVER_CONTEXT]',
        expect.objectContaining({
          message: 'Server error',
          stack: expect.any(String),
          timestamp: expect.any(String),
        }),
      )
    })

    it('should include context in server-side log', () => {
      const error = new Error('Test')
      logErrorSafely(error, 'GET /api/users')

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[GET /api/users]',
        expect.any(Object),
      )
    })
  })

  describe('String error handling', () => {
    it('should handle string inputs', () => {
      const result = logErrorSafely('String error message', 'STRING_CONTEXT')

      expect(result).toBe('An unexpected error occurred. Please try again.')
      expect(consoleErrorSpy).toHaveBeenCalled()
    })

    it('should log string message server-side', () => {
      logErrorSafely('Something went wrong', 'STRING_CONTEXT')

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[STRING_CONTEXT]',
        expect.objectContaining({
          message: 'Something went wrong',
          stack: undefined,
        }),
      )
    })
  })

  describe('Null/undefined handling', () => {
    it('should handle null input', () => {
      const result = logErrorSafely(null, 'NULL_CONTEXT')

      expect(result).toBe('An unexpected error occurred. Please try again.')
      expect(consoleErrorSpy).toHaveBeenCalled()
    })

    it('should handle undefined input', () => {
      const result = logErrorSafely(undefined, 'UNDEFINED_CONTEXT')

      expect(result).toBe('An unexpected error occurred. Please try again.')
      expect(consoleErrorSpy).toHaveBeenCalled()
    })

    it('should log "null" string for null input', () => {
      logErrorSafely(null, 'NULL_CONTEXT')

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[NULL_CONTEXT]',
        expect.objectContaining({
          message: 'null',
        }),
      )
    })
  })

  describe('Object error handling', () => {
    it('should handle plain objects', () => {
      const error = { message: 'Object error', details: 'something' }
      const result = logErrorSafely(error, 'OBJECT_CONTEXT')

      expect(result).toBe('An unexpected error occurred. Please try again.')
      expect(consoleErrorSpy).toHaveBeenCalled()
    })

    it('should stringify object errors', () => {
      const error = { message: 'Test', code: 'ERROR_CODE' }
      logErrorSafely(error, 'OBJECT_CONTEXT')

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[OBJECT_CONTEXT]',
        expect.objectContaining({
          message: '[object Object]',
        }),
      )
    })
  })

  describe('Timestamp logging', () => {
    it('should include ISO timestamp in server-side log', () => {
      const error = new Error('Test')
      logErrorSafely(error, 'TEST_CONTEXT')

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[TEST_CONTEXT]',
        expect.objectContaining({
          timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
        }),
      )
    })

    it('should have valid ISO 8601 timestamp format', () => {
      const error = new Error('Test')
      logErrorSafely(error, 'TEST_CONTEXT')

      const callArgs = consoleErrorSpy.mock.calls[0]?.[1]
      if (callArgs && typeof callArgs === 'object' && 'timestamp' in callArgs) {
        const timestamp = callArgs.timestamp as string
        expect(new Date(timestamp).toISOString()).toBe(timestamp)
      }
    })
  })

  describe('Security - no data leakage', () => {
    it('should never return stack trace', () => {
      const error = new Error('Sensitive database error at line 42')
      error.stack = `Error: Sensitive database error at line 42
    at connectToDb (database.ts:42:15)
    at setupServer (server.ts:10:5)`

      const result = logErrorSafely(error, 'DB_CONTEXT')

      // Stack trace should NOT be in the returned message
      expect(result).not.toContain('connectToDb')
      expect(result).not.toContain('database.ts')
      expect(result).not.toContain('line 42')
      expect(result).not.toContain('at ')
    })

    it('should return consistent generic message regardless of error', () => {
      const error1 = logErrorSafely(new Error('SQL Injection attempt'), 'CTX1')
      const error2 = logErrorSafely(
        new Error('Database credentials wrong'),
        'CTX2',
      )
      const error3 = logErrorSafely('API key expired', 'CTX3')

      expect(error1).toBe(error2)
      expect(error2).toBe(error3)
      expect(error1).toBe('An unexpected error occurred. Please try again.')
    })
  })
})

describe('cn() - Tailwind class merge', () => {
  describe('Basic class merging', () => {
    it('should merge multiple classes', () => {
      const result = cn('px-2', 'py-1')
      expect(result).toContain('px-2')
      expect(result).toContain('py-1')
    })

    it('should handle simple class list', () => {
      const result = cn('text-red-500', 'bg-blue-100')
      expect(result).toContain('text-red-500')
      expect(result).toContain('bg-blue-100')
    })

    it('should handle empty string input', () => {
      const result = cn('', 'px-2')
      expect(result).toContain('px-2')
    })

    it('should handle all empty strings', () => {
      const result = cn('', '', '')
      expect(result).toBe('')
    })
  })

  describe('Conflicting class resolution', () => {
    it('should resolve conflicting padding classes (p-4 vs p-2)', () => {
      const result = cn('p-4', 'p-2')
      // The last class should win
      expect(result).toContain('p-2')
      expect(result).not.toContain('p-4')
    })

    it('should resolve conflicting margin classes', () => {
      const result = cn('m-8', 'm-4')
      expect(result).toContain('m-4')
    })

    it('should resolve conflicting display classes', () => {
      const result = cn('block', 'hidden')
      expect(result).toContain('hidden')
      expect(result).not.toContain('block')
    })

    it('should resolve conflicting text color', () => {
      const result = cn('text-red-500', 'text-blue-500')
      expect(result).toContain('text-blue-500')
      expect(result).not.toContain('text-red-500')
    })

    it('should resolve conflicting background color', () => {
      const result = cn('bg-gray-100', 'bg-white')
      expect(result).toContain('bg-white')
      expect(result).not.toContain('bg-gray-100')
    })
  })

  describe('Complex scenarios', () => {
    it('should handle three conflicting classes', () => {
      const result = cn('p-2', 'p-4', 'p-6')
      expect(result).toContain('p-6')
      expect(result).not.toContain('p-2')
      expect(result).not.toContain('p-4')
    })

    it('should preserve non-conflicting classes with conflicting ones', () => {
      const result = cn('p-4', 'p-2', 'bg-red-500', 'text-white')
      expect(result).toContain('p-2')
      expect(result).toContain('bg-red-500')
      expect(result).toContain('text-white')
      expect(result).not.toContain('p-4')
    })

    it('should handle conditional classes', () => {
      const isActive = true
      const result = cn('px-4 py-2', isActive && 'bg-blue-500')
      expect(result).toContain('px-4')
      expect(result).toContain('py-2')
      expect(result).toContain('bg-blue-500')
    })

    it('should handle false conditional classes', () => {
      const isActive = false
      const result = cn('px-4', isActive && 'bg-blue-500')
      expect(result).toContain('px-4')
      expect(result).not.toContain('bg-blue-500')
    })
  })

  describe('Array and object inputs', () => {
    it('should handle array inputs', () => {
      const result = cn(['px-2', 'py-1'])
      expect(result).toContain('px-2')
      expect(result).toContain('py-1')
    })

    it('should handle array with conflicts', () => {
      const result = cn(['p-4', 'p-2'])
      expect(result).toContain('p-2')
    })

    it('should handle object inputs with true values', () => {
      const result = cn({ 'px-2': true, 'py-1': true })
      expect(result).toContain('px-2')
      expect(result).toContain('py-1')
    })

    it('should ignore object inputs with false values', () => {
      const result = cn({ 'px-2': true, 'bg-red-500': false })
      expect(result).toContain('px-2')
      expect(result).not.toContain('bg-red-500')
    })
  })

  describe('Real-world scenarios', () => {
    it('should handle button styling override', () => {
      const baseStyles = 'px-4 py-2 rounded bg-blue-500 text-white'
      const override = 'bg-red-500'
      const result = cn(baseStyles, override)
      expect(result).toContain('px-4')
      expect(result).toContain('py-2')
      expect(result).toContain('rounded')
      expect(result).toContain('text-white')
      expect(result).toContain('bg-red-500')
      expect(result).not.toContain('bg-blue-500')
    })

    it('should handle responsive class merging', () => {
      const result = cn('w-full md:w-1/2', 'md:w-1/3')
      expect(result).toContain('w-full')
      expect(result).toContain('md:w-1/3')
      expect(result).not.toContain('md:w-1/2')
    })

    it('should handle hover state conflicts', () => {
      const result = cn('hover:bg-gray-100', 'hover:bg-gray-200')
      expect(result).toContain('hover:bg-gray-200')
      expect(result).not.toContain('hover:bg-gray-100')
    })

    it('should merge form input styles', () => {
      const baseInputStyle = 'border border-gray-300 rounded px-3 py-2'
      const errorStyle = 'border-red-500 bg-red-50'
      const result = cn(baseInputStyle, errorStyle)
      expect(result).toContain('rounded')
      expect(result).toContain('px-3')
      expect(result).toContain('py-2')
      expect(result).toContain('border-red-500')
      expect(result).toContain('bg-red-50')
    })
  })

  describe('Edge cases', () => {
    it('should handle undefined input', () => {
      const result = cn(undefined, 'px-2')
      expect(result).toContain('px-2')
    })

    it('should handle null input', () => {
      const result = cn(null as Record<string, unknown> | null, 'px-2')
      expect(result).toContain('px-2')
    })

    it('should handle mixed valid and invalid inputs', () => {
      const result = cn(
        'px-2',
        undefined,
        'py-1',
        null as Record<string, unknown> | null,
        'bg-white',
      )
      expect(result).toContain('px-2')
      expect(result).toContain('py-1')
      expect(result).toContain('bg-white')
    })

    it('should return string type', () => {
      const result = cn('px-2', 'py-1')
      expect(typeof result).toBe('string')
    })

    it('should not include undefined in output string', () => {
      const result = cn('px-2', undefined, 'py-1')
      expect(result).not.toContain('undefined')
    })
  })
})
