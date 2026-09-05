import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createSupabaseQueryMock, type Row } from '@/test-utils/postgrest-mock'

let queryMock = createSupabaseQueryMock({})

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(queryMock.client)),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`redirect:${url}`)
  }),
}))

vi.mock('next/link', async () => {
  const React = await vi.importActual<typeof import('react')>('react')
  return {
    default: ({ href, children }: { href: string; children?: React.ReactNode }) =>
      React.createElement('a', { href }, children),
  }
})

// Server pages can render client components, but cannot read their value exports.
vi.mock('@/components/features/EventsTable', async (importOriginal) => {
  const { mockClientModule } = await import('@/test-utils/mock-client-module')
  return mockClientModule(importOriginal, ['EventsTable'])
})

import EventsPage from './page'

/**
 * 30 events ordered by start_at descending: e01–e25 (liturgical) land on
 * page 1, and the five oldest, e26–e30 (community), on page 2.
 */
function fixtureEvents(): Row[] {
  const rows: Row[] = []
  for (let i = 1; i <= 30; i++) {
    const id = `e${String(i).padStart(2, '0')}`
    const startAt = new Date(Date.UTC(2026, 8, 60 - i, 15)).toISOString()
    rows.push({
      id,
      title: `Event ${id}`,
      slug: id,
      start_at: startAt,
      end_at: null,
      category: i > 25 ? 'community' : 'liturgical',
      is_recurring: false,
      created_at: startAt,
    })
  }
  return rows
}

async function renderPage(searchParams: Record<string, string> = {}): Promise<string> {
  const jsx = await EventsPage({ searchParams: Promise.resolve(searchParams) })
  return renderToStaticMarkup(jsx)
}

describe('/admin/events with more rows than one page', () => {
  beforeEach(() => {
    queryMock = createSupabaseQueryMock({ events: fixtureEvents() })
  })

  it('filtering by category returns matches from every page', async () => {
    const html = await renderPage({ category: 'community' })
    for (const id of ['e26', 'e27', 'e28', 'e29', 'e30']) {
      expect(html).toContain(`Event ${id}`)
    }
    // Rows from other categories are excluded.
    expect(html).not.toContain('Event e01')
  })

  it('sorting by date ascending pages through the full dataset in that order', async () => {
    const html = await renderPage({ sort: 'start_at', dir: 'asc' })
    // Ascending by date, page 1 must hold the 25 oldest events (e06–e30);
    // the newest (e01) belongs on page 2.
    expect(html).toContain('Event e30')
    expect(html).toContain('Event e06')
    expect(html).not.toContain('Event e01')
  })
})
