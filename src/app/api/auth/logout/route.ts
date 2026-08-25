import { type NextRequest, NextResponse } from 'next/server'

import { logger } from '@/lib/logger'
import { withRequestLogging } from '@/lib/logger.server'
import { createClient } from '@/lib/supabase/server'

const log = logger.child({ scope: 'auth-logout' })

async function postImpl(request: NextRequest) {
  const supabase = await createClient()
  const { error } = await supabase.auth.signOut()
  if (error) log.error('auth.logout_failed', { error })

  const url = request.nextUrl.clone()
  url.pathname = '/'
  url.search = ''

  return NextResponse.redirect(url, { status: 303 })
}

export const POST = withRequestLogging('/api/auth/logout', postImpl)
