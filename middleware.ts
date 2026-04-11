import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for API routes, static files, and other special routes
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/public') ||
    pathname.startsWith('/favicon') ||
    pathname === '/' ||
    pathname.startsWith('/(marketing)')
  ) {
    return NextResponse.next()
  }

  try {
    // Get session from cookies
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    const isAuthRoute =
      pathname.startsWith('/(auth)') ||
      pathname === '/login' ||
      pathname === '/signup'
    const isAppRoute =
      pathname.startsWith('/(app)') || pathname === '/dashboard'

    // If user is authenticated
    if (session?.user) {
      // Redirect authenticated users from auth routes to dashboard
      if (isAuthRoute) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
      return NextResponse.next()
    }

    // If user is not authenticated
    if (!session?.user) {
      // Redirect unauthenticated users from app routes to login
      if (isAppRoute) {
        return NextResponse.redirect(new URL('/login', request.url))
      }
      return NextResponse.next()
    }

    return NextResponse.next()
  } catch (error) {
    // On error, allow the request to proceed
    // but protect app routes by default
    if (pathname.startsWith('/(app)') || pathname === '/dashboard') {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}
