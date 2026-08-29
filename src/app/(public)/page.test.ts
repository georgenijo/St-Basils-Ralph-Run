import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createSupabaseQueryMock, type Row } from '@/test-utils/postgrest-mock'

let queryMock = createSupabaseQueryMock({})

// The homepage must not use the cookie-bound server client (that would force
// per-request dynamic rendering); both are mocked so the test observes
// whichever the page imports.
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(queryMock.client)),
}))
vi.mock('@/lib/supabase/public', () => ({
  getPublicSupabaseClient: vi.fn(() => queryMock.client),
}))
// unstable_cache needs a Next server runtime; pass the wrapped fn through so
// the underlying queries run (and get recorded by the mock) on every call.
vi.mock('next/cache', () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}))

import * as pageModule from './page'

const HomePage = pageModule.default

function futureEvent(i: number): Row {
  const startAt = new Date(Date.UTC(2027, 0, 1 + i, 15)).toISOString()
  return {
    id: `evt-${i}`,
    title: `Event ${i}`,
    slug: `evt-${i}`,
    location: null,
    start_at: startAt,
    end_at: null,
    is_recurring: false,
    category: 'community',
    recurrence_rules: [],
    event_instances: [],
  }
}

describe('homepage upcoming-events data fetch', () => {
  beforeEach(() => {
    queryMock = createSupabaseQueryMock({
      announcements: [],
      events: Array.from({ length: 200 }, (_, i) => futureEvent(i)),
    })
  })

  it('bounds the events query instead of fetching every event row', async () => {
    await HomePage()

    const eventQueries = queryMock.ops.events ?? []
    expect(eventQueries.length).toBeGreaterThan(0)
    const boundedCall = eventQueries.some((callOps) =>
      callOps.some((op) => op.method === 'limit' && (op.args[0] as number) <= 50)
    )
    expect(boundedCall).toBe(true)
  })

  it('is statically cached with a revalidation window', () => {
    expect(pageModule.revalidate).toBe(60)
  })
})
