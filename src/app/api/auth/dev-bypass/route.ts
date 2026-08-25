import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

import { logger } from '@/lib/logger'
import { withRequestLogging } from '@/lib/logger.server'

const log = logger.child({ scope: 'auth-dev-bypass' })

async function getImpl(request: NextRequest) {
  const isLocalDev = process.env.NODE_ENV === 'development' && !process.env.VERCEL

  // Blocked outside local dev even if DEV_ADMIN_BYPASS leaks into hosted envs.
  if (
    !isLocalDev ||
    process.env.DEV_ADMIN_BYPASS !== 'true' ||
    !process.env.DEV_ADMIN_EMAIL ||
    !process.env.DEV_ADMIN_PASSWORD
  ) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const rawRedirect = request.nextUrl.searchParams.get('redirectTo') || '/admin/dashboard'
  // Only allow internal paths
  const redirectTo =
    rawRedirect.startsWith('/') && !rawRedirect.startsWith('//') ? rawRedirect : '/admin/dashboard'
  const response = NextResponse.redirect(new URL(redirectTo, request.url))

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { error } = await supabase.auth.signInWithPassword({
    email: process.env.DEV_ADMIN_EMAIL!,
    password: process.env.DEV_ADMIN_PASSWORD!,
  })

  if (error) {
    log.warn('auth.dev_bypass_failed', { error })
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}

export const GET = withRequestLogging('/api/auth/dev-bypass', getImpl)
