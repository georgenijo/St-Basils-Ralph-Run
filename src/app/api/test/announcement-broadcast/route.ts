import { NextRequest, NextResponse } from 'next/server'

import { AnnouncementBroadcast } from '@/emails/announcement-broadcast'
import { sendEmail } from '@/lib/email'
import { createAdminClient } from '@/lib/supabase/admin'
import { renderTiptapHTML } from '@/lib/tiptap'
import {
  isAuthorizedTestSupportRequest,
  isMockEmailTransportEnabled,
  isTestSupportEnabled,
} from '@/lib/test-support'

export const dynamic = 'force-dynamic'

function notFoundResponse() {
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}

export async function POST(request: NextRequest) {
  if (
    !isTestSupportEnabled() ||
    !isMockEmailTransportEnabled() ||
    !isAuthorizedTestSupportRequest(request.headers.get('x-test-secret'))
  ) {
    return notFoundResponse()
  }

  const { announcementId } = (await request.json()) as { announcementId?: string }
  if (!announcementId) {
    return NextResponse.json({ error: 'announcementId is required' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: announcement, error: announcementError } = await supabase
    .from('announcements')
    .select('id, title, slug, body, send_email, email_sent_at, published_at')
    .eq('id', announcementId)
    .single()

  if (announcementError || !announcement) {
    return NextResponse.json({ error: 'Announcement not found' }, { status: 404 })
  }

  if (!announcement.send_email || !announcement.published_at) {
    return NextResponse.json(
      { error: 'Announcement is not ready for email broadcast' },
      { status: 400 }
    )
  }

  const { data: subscribers, error: subscribersError } = await supabase
    .from('email_subscribers')
    .select('email, unsubscribe_token')
    .eq('confirmed', true)
    .is('unsubscribed_at', null)

  if (subscribersError) {
    return NextResponse.json({ error: 'Failed to fetch subscribers' }, { status: 500 })
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin
  const bodyHtml = announcement.body ? renderTiptapHTML(announcement.body) : '<p>No content</p>'

  for (const subscriber of subscribers ?? []) {
    const unsubscribeUrl = `${siteUrl}/api/newsletter/unsubscribe?token=${subscriber.unsubscribe_token}`
    const announcementUrl = `${siteUrl}/announcements/${announcement.slug}`

    const { error } = await sendEmail({
      from: "St. Basil's Church <announcements@stbasilsboston.org>",
      to: subscriber.email,
      subject: announcement.title,
      react: AnnouncementBroadcast({
        title: announcement.title,
        bodyHtml,
        slug: announcement.slug,
        unsubscribeToken: subscriber.unsubscribe_token,
        siteUrl,
      }),
      metadata: {
        template: 'announcement-broadcast',
        announcementId: announcement.id,
        announcementUrl,
        unsubscribeUrl,
      },
    })

    if (error) {
      return NextResponse.json({ error: 'Failed to send broadcast email' }, { status: 500 })
    }
  }

  await supabase
    .from('announcements')
    .update({ email_sent_at: new Date().toISOString() })
    .eq('id', announcement.id)

  return NextResponse.json({
    sent: subscribers?.length ?? 0,
    announcementId: announcement.id,
  })
}
