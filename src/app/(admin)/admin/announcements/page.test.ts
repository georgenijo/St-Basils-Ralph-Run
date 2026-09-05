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
vi.mock('@/components/features/AnnouncementsTable', async () => {
  const { AnnouncementsTable } = await vi.importActual<
    typeof import('@/components/features/AnnouncementsTable')
  >('@/components/features/AnnouncementsTable')
  return { AnnouncementsTable }
})

import AnnouncementsPage from './page'

/**
 * 30 announcements. Ordered by created_at descending, rows a01–a25 land on
 * page 1 and a26–a30 on page 2. The five oldest (a26–a30) are expired; three
 * newer rows carry High/Medium/Low priorities in an order that disagrees with
 * their creation order.
 */
function fixtureAnnouncements(): Row[] {
  const rows: Row[] = []
  for (let i = 1; i <= 30; i++) {
    const id = `a${String(i).padStart(2, '0')}`
    const createdAt = new Date(Date.UTC(2026, 7, 31 - i)).toISOString()
    const expired = i > 25
    rows.push({
      id,
      title: `Announcement ${id}`,
      slug: id,
      priority: 0,
      is_pinned: false,
      published_at: createdAt,
      expires_at: expired ? '2026-01-01T00:00:00.000Z' : null,
      created_at: createdAt,
    })
  }
  // Newest row is Low priority, a middle row Medium, an old row High — so
  // created_at order and priority order disagree.
  rows[1].priority = 1 // a02 → Low
  rows[1].title = 'Low priority announcement'
  rows[4].priority = 5 // a05 → Medium
  rows[4].title = 'Medium priority announcement'
  rows[19].priority = 10 // a20 → High
  rows[19].title = 'High priority announcement'
  return rows
}

async function renderPage(searchParams: Record<string, string> = {}): Promise<string> {
  const jsx = await AnnouncementsPage({ searchParams: Promise.resolve(searchParams) })
  return renderToStaticMarkup(jsx)
}

describe('/admin/announcements with more rows than one page', () => {
  beforeEach(() => {
    queryMock = createSupabaseQueryMock({ announcements: fixtureAnnouncements() })
  })

  it('status count badges reflect the full dataset, not just the current page', async () => {
    const html = await renderPage()
    // 5 expired announcements exist, all beyond page 1.
    expect(html).toContain('Expired (5)')
    expect(html).toContain('All (30)')
  })

  it('filtering by expired returns matches from every page', async () => {
    const html = await renderPage({ status: 'expired' })
    for (const id of ['a26', 'a27', 'a28', 'a29', 'a30']) {
      expect(html).toContain(`Announcement ${id}`)
    }
    // Non-expired rows are excluded.
    expect(html).not.toContain('Announcement a01')
  })

  it('sorting by priority orders numerically across the dataset', async () => {
    const html = await renderPage({ sort: 'priority', dir: 'desc' })
    const high = html.indexOf('High priority announcement')
    const medium = html.indexOf('Medium priority announcement')
    const low = html.indexOf('Low priority announcement')
    expect(high).toBeGreaterThan(-1)
    expect(medium).toBeGreaterThan(-1)
    expect(low).toBeGreaterThan(-1)
    expect(high).toBeLessThan(medium)
    expect(medium).toBeLessThan(low)
  })

  it('uses one captured time for expiry filters, counts, and status badges', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-05T12:00:00.000Z'))
    queryMock = createSupabaseQueryMock({
      announcements: [
        {
          id: 'at-boundary',
          title: 'Expires at captured time',
          slug: 'at-boundary',
          priority: 0,
          is_pinned: false,
          published_at: '2026-09-01T00:00:00.000Z',
          expires_at: '2026-09-05T12:00:00.000Z',
          created_at: '2026-09-01T00:00:00.000Z',
        },
        {
          id: 'still-published',
          title: 'Expires after captured time',
          slug: 'still-published',
          priority: 0,
          is_pinned: false,
          published_at: '2026-09-01T00:00:00.000Z',
          expires_at: '2026-09-05T12:00:00.001Z',
          created_at: '2026-09-01T00:00:00.000Z',
        },
        {
          id: 'draft',
          title: 'Draft',
          slug: 'draft',
          priority: 0,
          is_pinned: false,
          published_at: null,
          expires_at: null,
          created_at: '2026-09-01T00:00:00.000Z',
        },
      ],
    })

    try {
      const html = await renderPage()
      expect(html).toContain('All (3)')
      expect(html).toContain('Published (1)')
      expect(html).toContain('Draft (1)')
      expect(html).toContain('Expired (1)')
      expect(html).toMatch(/Expires at captured time[\s\S]*?>expired<\/span>/)
      expect(queryMock.ops.announcements).toHaveLength(3)
      expect(queryMock.ops.announcements[2]).toContainEqual({
        method: 'lte',
        args: ['expires_at', '2026-09-05T12:00:00.000Z'],
      })

      const publishedHtml = await renderPage({ status: 'published' })
      expect(publishedHtml).toContain('Expires after captured time')
      expect(publishedHtml).not.toContain('Expires at captured time')
      expect(queryMock.ops.announcements).toHaveLength(6)
      expect(queryMock.ops.announcements[3]).toContainEqual({
        method: 'or',
        args: ['expires_at.is.null,expires_at.gt.2026-09-05T12:00:00.000Z'],
      })
    } finally {
      vi.useRealTimers()
    }
  })
})
