import { createServerClient } from '@supabase/ssr'
import type { EmailOtpType } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

import { logger } from '@/lib/logger'
import { withRequestLogging } from '@/lib/logger.server'

const log = logger.child({ scope: 'auth-callback' })

async function getImpl(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  // token_hash is the server-side verification path used by our branded
  // invite/recovery emails (generateLink → verifyOtp). code is the PKCE/OAuth path.
  const tokenHash = request.nextUrl.searchParams.get('token_hash')
  const type = request.nextUrl.searchParams.get('type')
  const isTokenFlow = type === 'invite' || type === 'recovery'

  if ((!code && !tokenHash) || (tokenHash && !isTokenFlow)) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.delete('code')
    url.searchParams.delete('token_hash')
    url.searchParams.delete('type')
    url.searchParams.set('error', 'missing_code')
    return NextResponse.redirect(url)
  }

  const redirectUrl = request.nextUrl.clone()
  redirectUrl.search = ''

  // Determine redirect destination based on auth flow type
  if (isTokenFlow) {
    redirectUrl.pathname = '/set-password'
    redirectUrl.searchParams.set('flow', type)
  } else {
    redirectUrl.pathname = '/'
  }

  const response = NextResponse.redirect(redirectUrl)

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

  const { error } = tokenHash
    ? await supabase.auth.verifyOtp({
        type: type as EmailOtpType,
        token_hash: tokenHash,
      })
    : await supabase.auth.exchangeCodeForSession(code!)

  if (error) {
    log.warn('auth.callback_failed', { error, flowType: type ?? 'code' })
    const errorUrl = request.nextUrl.clone()
    errorUrl.pathname = '/login'
    errorUrl.search = ''
    errorUrl.searchParams.set('error', 'auth_code_error')
    return NextResponse.redirect(errorUrl)
  }

  return response
}

export const GET = withRequestLogging('/api/auth/callback', getImpl)
