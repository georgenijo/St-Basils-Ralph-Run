import { describe, expect, it } from 'vitest'

import { getUpcomingEventOccurrences, type UpcomingEventSource } from '@/lib/upcoming-events'

function source(overrides: Partial<UpcomingEventSource> = {}): UpcomingEventSource {
  return {
    id: 'event-1',
    title: 'Sunday service',
    slug: 'sunday-service',
    location: 'Church',
    start_at: '2026-08-30T13:15:00.000Z',
    end_at: '2026-08-30T15:00:00.000Z',
    is_recurring: false,
    category: 'liturgical',
    recurrence_rules: [],
    event_instances: [],
    ...overrides,
  }
}

describe('getUpcomingEventOccurrences', () => {
  const now = new Date('2026-08-25T12:00:00.000Z')

  it('sorts future one-time events and omits past events', () => {
    const result = getUpcomingEventOccurrences(
      [
        source({ id: 'later', start_at: '2026-09-05T12:00:00.000Z' }),
        source({ id: 'past', start_at: '2026-08-20T12:00:00.000Z' }),
        source({ id: 'next', start_at: '2026-08-26T12:00:00.000Z' }),
      ],
      now
    )

    expect(result.map((event) => event.eventId)).toEqual(['next', 'later'])
  })

  it('expands recurring events and skips a cancelled occurrence', () => {
    const result = getUpcomingEventOccurrences(
      [
        source({
          is_recurring: true,
          recurrence_rules: [
            { rrule_string: 'FREQ=WEEKLY;COUNT=4', dtstart: '2026-08-23T13:15:00.000Z' },
          ],
          event_instances: [
            {
              original_date: '2026-08-30T13:15:00.000Z',
              is_cancelled: true,
              title_override: null,
              location_override: null,
              start_at_override: null,
              end_at_override: null,
            },
          ],
        }),
      ],
      now,
      2
    )

    expect(result.map((event) => event.startAt)).toEqual([
      '2026-09-06T13:15:00.000Z',
      '2026-09-13T13:15:00.000Z',
    ])
  })

  it('uses modified occurrence fields and preserves event duration by default', () => {
    const result = getUpcomingEventOccurrences(
      [
        source({
          is_recurring: true,
          recurrence_rules: [
            { rrule_string: 'FREQ=WEEKLY;COUNT=2', dtstart: '2026-08-23T13:15:00.000Z' },
          ],
          event_instances: [
            {
              original_date: '2026-08-30T13:15:00.000Z',
              is_cancelled: false,
              title_override: 'Special service',
              location_override: 'Parish hall',
              start_at_override: '2026-08-30T14:00:00.000Z',
              end_at_override: null,
            },
          ],
        }),
      ],
      now,
      3
    )

    expect(result[0]).toMatchObject({
      title: 'Special service',
      location: 'Parish hall',
      startAt: '2026-08-30T14:00:00.000Z',
      endAt: '2026-08-30T15:45:00.000Z',
    })
  })
})
