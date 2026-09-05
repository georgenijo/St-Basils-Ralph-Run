import { rrulestr } from 'rrule'

import type { EventCategory } from '@/lib/admin-table-config'

export interface UpcomingEventSource {
  id: string
  title: string
  slug: string
  location: string | null
  start_at: string
  end_at: string | null
  is_recurring: boolean
  category: EventCategory
  recurrence_rules: {
    rrule_string: string
    dtstart: string
  }[]
  event_instances: {
    original_date: string
    is_cancelled: boolean
    title_override: string | null
    location_override: string | null
    start_at_override: string | null
    end_at_override: string | null
  }[]
}

export interface UpcomingEventOccurrence {
  id: string
  eventId: string
  title: string
  slug: string
  location: string | null
  startAt: string
  endAt: string | null
  category: EventCategory
}

function endAtForOccurrence(source: UpcomingEventSource, start: Date): string | null {
  if (!source.end_at) return null
  const duration = new Date(source.end_at).getTime() - new Date(source.start_at).getTime()
  if (!Number.isFinite(duration) || duration < 0) return null
  return new Date(start.getTime() + duration).toISOString()
}

function occurrence(
  source: UpcomingEventSource,
  start: Date,
  overrides?: {
    title?: string | null
    location?: string | null
    endAt?: string | null
  }
): UpcomingEventOccurrence {
  const startAt = start.toISOString()
  return {
    id: `${source.id}:${startAt}`,
    eventId: source.id,
    title: overrides?.title || source.title,
    slug: source.slug,
    location: overrides?.location || source.location,
    startAt,
    endAt: overrides?.endAt ?? endAtForOccurrence(source, start),
    category: source.category,
  }
}

/** Resolve event rows and recurrence exceptions into the next real occurrences. */
export function getUpcomingEventOccurrences(
  sources: UpcomingEventSource[],
  now = new Date(),
  limit = 3
): UpcomingEventOccurrence[] {
  if (limit <= 0) return []

  const candidates: UpcomingEventOccurrence[] = []

  for (const source of sources) {
    if (!source.is_recurring || source.recurrence_rules.length === 0) {
      const start = new Date(source.start_at)
      if (Number.isFinite(start.getTime()) && start >= now) {
        candidates.push(occurrence(source, start))
      }
      continue
    }

    const exceptions = source.event_instances ?? []
    const exceptionDates = new Set(
      exceptions.map((instance) => new Date(instance.original_date).getTime())
    )

    // Modified occurrences are excluded from the base rule and re-added at
    // their effective date. Cancelled occurrences remain excluded.
    for (const instance of exceptions) {
      if (instance.is_cancelled) continue
      const start = new Date(instance.start_at_override || instance.original_date)
      if (!Number.isFinite(start.getTime()) || start < now) continue
      candidates.push(
        occurrence(source, start, {
          title: instance.title_override,
          location: instance.location_override,
          endAt: instance.end_at_override,
        })
      )
    }

    const ruleData = source.recurrence_rules[0]
    try {
      const rule = rrulestr(ruleData.rrule_string, { dtstart: new Date(ruleData.dtstart) })
      let cursor = now
      let generated = 0
      let attempts = 0

      while (generated < limit && attempts < 100) {
        const next = rule.after(cursor, true)
        if (!next) break
        attempts += 1
        cursor = new Date(next.getTime() + 1)
        if (exceptionDates.has(next.getTime())) continue
        candidates.push(occurrence(source, next))
        generated += 1
      }
    } catch {
      // A malformed legacy recurrence rule should not break the homepage.
      // Its base start can still be shown when it has not passed.
      const fallbackStart = new Date(source.start_at)
      if (Number.isFinite(fallbackStart.getTime()) && fallbackStart >= now) {
        candidates.push(occurrence(source, fallbackStart))
      }
    }
  }

  return candidates
    .sort((a, b) => a.startAt.localeCompare(b.startAt))
    .filter((candidate, index, all) => all.findIndex((item) => item.id === candidate.id) === index)
    .slice(0, limit)
}
