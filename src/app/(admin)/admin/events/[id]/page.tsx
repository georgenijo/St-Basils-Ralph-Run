import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { formatInChurchTimeZone, getChurchTimeZoneName } from '@/lib/event-time'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui'
import { RsvpAdminPanel } from '@/components/features/RsvpAdminPanel'

import type { RsvpSettings } from '@/lib/validators/rsvp'

export const metadata: Metadata = {
  title: 'Event Details',
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function AdminEventDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: event } = await supabase
    .from('events')
    .select('id, title, slug, location, start_at, end_at, category, rsvp_settings')
    .eq('id', id)
    .single()

  if (!event) notFound()

  const rsvpSettings = (event.rsvp_settings as RsvpSettings) ?? { enabled: false }

  // Fetch RSVPs if RSVP is enabled
  interface RsvpRow {
    id: string
    name: string
    headcount: number
    children_count: number | null
    dietary: string | null
    bringing: string | null
    notes: string | null
    family_id: string | null
    created_at: string
    families: { family_name: string } | null
  }

  let rsvps: RsvpRow[] = []

  if (rsvpSettings.enabled) {
    const { data } = await supabase
      .from('event_rsvps')
      .select(
        'id, name, headcount, children_count, dietary, bringing, notes, family_id, created_at, families!left(family_name)'
      )
      .eq('event_id', id)
      .order('created_at', { ascending: false })

    // Supabase returns joined table as array; flatten to single object
    rsvps = (data ?? []).map((row) => ({
      ...row,
      families: Array.isArray(row.families) ? (row.families[0] ?? null) : row.families,
    })) as RsvpRow[]
  }

  const date = formatInChurchTimeZone(event.start_at, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  const time = formatInChurchTimeZone(event.start_at, {
    hour: 'numeric',
    minute: '2-digit',
  })

  const timeZone = getChurchTimeZoneName(event.start_at)

  let timeRange = `${time} ${timeZone}`
  if (event.end_at) {
    const endTime = formatInChurchTimeZone(event.end_at, {
      hour: 'numeric',
      minute: '2-digit',
    })
    timeRange = `${time} \u2013 ${endTime} ${timeZone}`
  }

  return (
    <main className="admin-page">
      {/* Back link */}
      <div className="mb-6">
        <Link href="/admin/events" className="admin-button admin-button-bare">
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
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
          Back to Events
        </Link>
      </div>

      {/* Event header */}
      <div className="admin-page-head">
        <div>
          <h1>{event.title}</h1>
          <p className="admin-page-subtitle">
            {date} · {timeRange}
            {event.location ? ` · ${event.location}` : ''}
          </p>
        </div>
        <div>
          <Button
            href={`/admin/events/${id}/edit`}
            size="sm"
            variant="secondary"
            className="admin-button admin-button-primary"
          >
            Edit Event
          </Button>
        </div>
      </div>

      <div className="admin-toolbar">
        <Button
          href={`/admin/events/${id}/charges`}
          size="sm"
          variant="secondary"
          className="admin-button admin-button-quiet"
        >
          Manage charges
        </Button>
      </div>

      {/* RSVP Section */}
      {rsvpSettings.enabled ? (
        <RsvpAdminPanel
          eventId={event.id}
          eventSlug={event.slug}
          eventTitle={event.title}
          eventStartAt={event.start_at}
          eventLocation={event.location}
          rsvps={rsvps}
        />
      ) : (
        <div className="admin-empty">
          <p>RSVP is not enabled for this event.</p>
          <Button
            href={`/admin/events/${id}/edit`}
            size="sm"
            variant="ghost"
            className="admin-button admin-button-quiet mt-3"
          >
            Edit event to enable RSVP
          </Button>
        </div>
      )}
    </main>
  )
}
