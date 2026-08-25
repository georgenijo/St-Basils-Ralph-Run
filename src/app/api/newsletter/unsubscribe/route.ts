import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

import { logger } from '@/lib/logger'
import { withRequestLogging } from '@/lib/logger.server'
import { removeContactFromAudience } from '@/lib/resend'

const log = logger.child({ scope: 'newsletter-unsubscribe' })

async function getImpl(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')

  if (!token) {
    return NextResponse.redirect(new URL('/?unsubscribed=invalid', req.url))
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Deactivate subscription — preserve confirmed_at for audit trail
  const { data: subscriber, error } = await supabase
    .from('email_subscribers')
    .update({
      unsubscribed_at: new Date().toISOString(),
    })
    .eq('unsubscribe_token', token)
    .is('unsubscribed_at', null)
    .select('id, email')
    .single()

  if (error || !subscriber) {
    if (error) log.warn('newsletter.unsubscribe_failed', { error })
    return NextResponse.redirect(new URL('/?unsubscribed=invalid', req.url))
  }

  // Remove from Resend Audience
  await removeContactFromAudience(subscriber.email)

  return NextResponse.redirect(new URL('/?unsubscribed=success', req.url))
}

export const GET = withRequestLogging('/api/newsletter/unsubscribe', getImpl)
