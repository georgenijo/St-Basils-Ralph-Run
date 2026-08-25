import type { Metadata } from 'next'

import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui'
import { AnnouncementsTable } from '@/components/features/AnnouncementsTable'

export const metadata: Metadata = {
  title: 'Announcements',
}

export default async function AnnouncementsPage() {
  const supabase = await createClient()

  const { data: announcements } = await supabase
    .from('announcements')
    .select('id, title, slug, priority, is_pinned, published_at, expires_at, created_at')
    .order('created_at', { ascending: false })

  return (
    <main className="admin-page">
      <div className="admin-page-head">
        <div>
          <h1>Announcements</h1>
          <p className="admin-page-subtitle">
            Manage parish announcements, updates, and notifications.
          </p>
        </div>
        <Button
          href="/admin/announcements/new"
          size="sm"
          className="admin-button admin-button-primary"
        >
          <span className="flex items-center gap-2">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Announcement
          </span>
        </Button>
      </div>

      <AnnouncementsTable announcements={announcements ?? []} />
    </main>
  )
}
