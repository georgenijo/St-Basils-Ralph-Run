import { updateSession } from '@/lib/supabase/middleware'
import { logger } from '@/lib/logger'
import { requiresSessionRefresh } from '@/lib/session-paths'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const startedAt = performance.now()
  const incomingRequestId = request.headers.get('x-request-id')
  const requestId =
    incomingRequestId && /^[A-Za-z0-9._:-]{1,128}$/.test(incomingRequestId)
      ? incomingRequestId
      : crypto.randomUUID()
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-request-id', requestId)
  requestHeaders.set('x-request-path', request.nextUrl.pathname)
  requestHeaders.set('x-request-method', request.method)
  // Never trust identity context supplied by the caller. updateSession only
  // restores this header after Supabase validates the session.
  requestHeaders.delete('x-auth-user-id')

  const requestLogger = logger.child({
    scope: 'middleware',
    requestId,
    route: request.nextUrl.pathname,
    method: request.method,
  })
  requestLogger.debug('request.received')

  // Anonymous public pages do not consume identity. Avoid a Supabase
  // auth.getUser() round trip on every page/RSC request and leave those routes
  // eligible for Next/Vercel caching. Auth, protected, RSVP, and API routes keep
  // the normal session refresh behavior.
  const response = requiresSessionRefresh(request.nextUrl.pathname)
    ? await updateSession(request, requestHeaders)
    : NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set('x-request-id', requestId)
  requestLogger.debug('middleware.completed', {
    status: response.status,
    durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
  })
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api/health (public uptime probe — skip the per-request auth lookup)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|api/health|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
