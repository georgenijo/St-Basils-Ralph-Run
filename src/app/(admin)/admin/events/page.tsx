import type { Metadata } from 'next'

import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui'
import { EventsTable } from '@/components/features/EventsTable'

export const metadata: Metadata = {
  title: 'Events',
}

export default async function EventsPage() {
  const supabase = await createClient()

  const { data: events } = await supabase
    .from('events')
    .select('id, title, slug, start_at, end_at, category, is_recurring, created_at')
    .order('start_at', { ascending: false })

  return (
    <main className="admin-page">
      <div className="admin-page-head">
        <div>
          <h1>Events</h1>
          <p className="admin-page-subtitle">
            Manage parish events, liturgical services, and community gatherings.
          </p>
        </div>
        <Button href="/admin/events/new" size="sm" className="admin-button admin-button-primary">
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
            New Event
          </span>
        </Button>
      </div>

      <div className="admin-toolbar">
        <Button
          href="/admin/events/calendar"
          variant="ghost"
          size="sm"
          className="admin-button admin-button-quiet"
        >
          Calendar view
        </Button>
        <span className="admin-toolbar-spacer" />
        <span className="admin-meta">{events?.length ?? 0} events</span>
      </div>

      <EventsTable events={events ?? []} />
    </main>
  )
}
