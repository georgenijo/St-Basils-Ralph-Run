import type { Metadata } from 'next'
import { unstable_cache } from 'next/cache'

import { PUBLIC_EVENTS_CACHE_TAG } from '@/lib/cache-tags'
import { toRRuleUtcTimestamp } from '@/lib/event-time'
import { breadcrumbSchema } from '@/lib/structured-data'
import { getPublicSupabaseClient } from '@/lib/supabase/public'
import { PageHero, SectionHeader, ScrollReveal, JsonLd } from '@/components/ui'
import { EventCalendar } from '@/components/features/EventCalendar'
import { CalendarLegend } from '@/components/features/CalendarLegend'

import type { CalendarEvent } from '@/components/features/EventCalendar'

export const metadata: Metadata = {
  title: 'Events Calendar',
  description:
    "View upcoming services, community gatherings, and special events at St. Basil's Syriac Orthodox Church in Boston.",
  openGraph: {
    title: "Events Calendar | St. Basil's Syriac Orthodox Church",
    description:
      "View upcoming services, community gatherings, and special events at St. Basil's Syriac Orthodox Church.",
  },
}

interface EventInstanceRow {
  original_date: string
  is_cancelled: boolean
  start_at_override: string | null
  end_at_override: string | null
  location_override: string | null
  note: string | null
}

interface EventRow {
  id: string
  title: string
  slug: string
  description: unknown
  location: string | null
  start_at: string
  end_at: string | null
  is_recurring: boolean
  category: 'liturgical' | 'community' | 'special'
  recurrence_rules: {
    rrule_string: string
    dtstart: string
    until: string | null
  }[]
  event_instances: EventInstanceRow[]
}

function computeDuration(startAt: string, endAt: string | null): string | undefined {
  if (!endAt) return undefined
  const diffMs = new Date(endAt).getTime() - new Date(startAt).getTime()
  const hours = Math.floor(diffMs / 3600000)
  const minutes = Math.floor((diffMs % 3600000) / 60000)
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

function computeEndForDate(
  originalDate: string,
  eventStartAt: string,
  eventEndAt: string | null
): string | undefined {
  if (!eventEndAt) return undefined
  const diffMs = new Date(eventEndAt).getTime() - new Date(eventStartAt).getTime()
  return new Date(new Date(originalDate).getTime() + diffMs).toISOString()
}

function transformEvents(events: EventRow[]): CalendarEvent[] {
  const result: CalendarEvent[] = []

  for (const event of events) {
    const baseProps = {
      slug: event.slug,
      category: event.category,
      location: event.location,
    }

    // Non-recurring events
    if (!event.is_recurring || event.recurrence_rules.length === 0) {
      result.push({
        id: event.id,
        title: event.title,
        start: event.start_at,
        end: event.end_at || undefined,
        extendedProps: baseProps,
      })
      continue
    }

    // Recurring event
    const rule = event.recurrence_rules[0]
    const instances = event.event_instances || []

    // Build rrule string, adding EXDATE if there are instance overrides
    let rruleStr = `DTSTART:${toRRuleUtcTimestamp(rule.dtstart)}\nRRULE:${rule.rrule_string}`

    if (instances.length > 0) {
      const exdates = instances.map((inst) => toRRuleUtcTimestamp(inst.original_date))
      rruleStr += `\nEXDATE:${exdates.join(',')}`
    }

    const duration = computeDuration(event.start_at, event.end_at)

    // Base recurring event
    result.push({
      id: event.id,
      title: event.title,
      rrule: rruleStr,
      duration,
      extendedProps: baseProps,
    })

    // Individual instance events
    for (const inst of instances) {
      if (inst.is_cancelled) {
        result.push({
          id: `${event.id}-cancel-${inst.original_date}`,
          title: event.title,
          start: inst.original_date,
          end: computeEndForDate(inst.original_date, event.start_at, event.end_at),
          extendedProps: {
            ...baseProps,
            instanceType: 'cancelled',
            note: inst.note,
          },
        })
      } else {
        const start = inst.start_at_override || inst.original_date
        result.push({
          id: `${event.id}-mod-${inst.original_date}`,
          title: event.title,
          start,
          end: inst.end_at_override || computeEndForDate(start, event.start_at, event.end_at),
          extendedProps: {
            ...baseProps,
            location: inst.location_override || event.location,
            instanceType: 'modified',
            note: inst.note,
          },
        })
      }
    }
  }

  return result
}

const getCalendarEvents = unstable_cache(
  async (): Promise<CalendarEvent[]> => {
    const supabase = getPublicSupabaseClient()
    const { data: events } = await supabase
      .from('events')
      .select(
        `
        id, title, slug, description, location, start_at, end_at, is_recurring, category,
        recurrence_rules(rrule_string, dtstart, until),
        event_instances(
          original_date, is_cancelled, start_at_override, end_at_override,
          location_override, note
        )
      `
      )
      .order('start_at', { ascending: true })

    return transformEvents((events as EventRow[]) || [])
  },
  ['public-calendar-events'],
  { revalidate: 60, tags: [PUBLIC_EVENTS_CACHE_TAG] }
)

export const revalidate = 60

export default async function EventsPage() {
  const calendarEvents = await getCalendarEvents()

  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: 'Events Calendar', path: '/events' }])} />
      <PageHero title="Events Calendar" backgroundImage="/images/about/church-exterior.jpg" />

      <section className="py-16 md:py-22 lg:py-28">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <SectionHeader
              title="Upcoming Events"
              subtitle="Stay connected with services, community gatherings, and special celebrations."
              as="h2"
            />
          </ScrollReveal>

          <div className="mt-10 md:mt-14">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CalendarLegend variant="public" />
              <a
                href="/api/events/feed.ics"
                className="inline-flex min-h-11 items-center justify-center self-start rounded-lg border border-burgundy-700 px-4 py-2 text-sm font-medium text-burgundy-700 transition-colors hover:bg-burgundy-700 hover:text-cream-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burgundy-700 focus-visible:ring-offset-2 sm:self-auto"
              >
                Subscribe to calendar
              </a>
            </div>
            <EventCalendar events={calendarEvents} />
          </div>
        </div>
      </section>
    </>
  )
}
