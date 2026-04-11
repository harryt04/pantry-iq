import { NextResponse } from 'next/server'

export interface ApiErrorResponse {
  error: string
  code: string
}

export interface ApiSuccessResponse<T = Record<string, unknown>> {
  data?: T
  message?: string
}

/**
 * Standardized error response builder for API routes
 * Never exposes stack traces or internal details to client
 */
export class ApiError {
  static badRequest(
    message: string,
    code: string = 'BAD_REQUEST',
  ): NextResponse {
    return NextResponse.json({ error: message, code }, { status: 400 })
  }

  static unauthorized(
    message: string = 'Unauthorized',
    code: string = 'UNAUTHORIZED',
  ): NextResponse {
    return NextResponse.json({ error: message, code }, { status: 401 })
  }

  static forbidden(
    message: string = 'Access denied',
    code: string = 'FORBIDDEN',
  ): NextResponse {
    return NextResponse.json({ error: message, code }, { status: 403 })
  }

  static notFound(
    message: string = 'Resource not found',
    code: string = 'NOT_FOUND',
  ): NextResponse {
    return NextResponse.json({ error: message, code }, { status: 404 })
  }

  static internalServerError(
    message: string = 'An unexpected error occurred',
    code: string = 'INTERNAL_SERVER_ERROR',
  ): NextResponse {
    return NextResponse.json({ error: message, code }, { status: 500 })
  }

  static conflict(message: string, code: string = 'CONFLICT'): NextResponse {
    return NextResponse.json({ error: message, code }, { status: 409 })
  }

  static unprocessable(
    message: string,
    code: string = 'UNPROCESSABLE_ENTITY',
  ): NextResponse {
    return NextResponse.json({ error: message, code }, { status: 422 })
  }
}

/**
 * Safe error logging - logs full error server-side but returns generic message to client
 */
export function logErrorSafely(error: unknown, context: string): string {
  const errorMessage = error instanceof Error ? error.message : String(error)
  const stack = error instanceof Error ? error.stack : undefined

  // Log full details server-side for debugging
  console.error(`[${context}]`, {
    message: errorMessage,
    stack,
    timestamp: new Date().toISOString(),
  })

  // Return generic message for client
  return 'An unexpected error occurred. Please try again.'
}
