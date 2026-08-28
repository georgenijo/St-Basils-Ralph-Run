import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockCreateClient = vi.hoisted(() => vi.fn())

vi.mock('@/lib/supabase/public', () => ({
  getPublicSupabaseClient: mockCreateClient,
}))

import sitemap from '@/app/sitemap'

const STATIC_URLS = [
  'https://stbasilsboston.org',
  'https://stbasilsboston.org/about',
  'https://stbasilsboston.org/first-time',
  'https://stbasilsboston.org/giving',
  'https://stbasilsboston.org/contact',
  'https://stbasilsboston.org/our-clergy',
  'https://stbasilsboston.org/office-bearers',
  'https://stbasilsboston.org/spiritual-leaders',
  'https://stbasilsboston.org/our-organizations',
  'https://stbasilsboston.org/acolytes-choir',
  'https://stbasilsboston.org/useful-links',
  'https://stbasilsboston.org/events',
  'https://stbasilsboston.org/announcements',
  'https://stbasilsboston.org/privacy-policy',
  'https://stbasilsboston.org/terms-of-use',
]

function queryClient({
  events = { data: [], error: null },
  announcements = { data: [], error: null },
}: {
  events?: { data: unknown[] | null; error: unknown }
  announcements?: { data: unknown[] | null; error: unknown }
} = {}) {
  const eventOrder = vi.fn().mockResolvedValue(events)
  const eventSelect = vi.fn(() => ({ order: eventOrder }))

  const announcementOrder = vi.fn().mockResolvedValue(announcements)
  const announcementOr = vi.fn(() => ({ order: announcementOrder }))
  const announcementNot = vi.fn(() => ({ or: announcementOr }))
  const announcementSelect = vi.fn(() => ({ not: announcementNot }))

  const from = vi.fn((table: string) => {
    if (table === 'events') return { select: eventSelect }
    if (table === 'announcements') return { select: announcementSelect }
    throw new Error(`Unexpected table: ${table}`)
  })

  return {
    client: { from },
    eventSelect,
    announcementSelect,
    announcementNot,
    announcementOr,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('sitemap', () => {
  it('includes the complete public static route list and no private routes', async () => {
    const { client } = queryClient()
    mockCreateClient.mockReturnValue(client)

    const entries = await sitemap()

    expect(entries.map((entry) => entry.url)).toEqual(STATIC_URLS)
    expect(entries).toHaveLength(15)
  })

  it('adds public event and published, non-expired announcement slugs', async () => {
    const { client, eventSelect, announcementSelect, announcementNot, announcementOr } =
      queryClient({
        events: {
          data: [{ slug: 'parish-picnic', updated_at: '2026-08-20T12:00:00.000Z' }],
          error: null,
        },
        announcements: {
          data: [{ slug: 'service-update', updated_at: '2026-08-21T12:00:00.000Z' }],
          error: null,
        },
      })
    mockCreateClient.mockReturnValue(client)

    const entries = await sitemap()

    expect(entries.map((entry) => entry.url)).toEqual([
      ...STATIC_URLS,
      'https://stbasilsboston.org/events/parish-picnic',
      'https://stbasilsboston.org/announcements/service-update',
    ])
    expect(eventSelect).toHaveBeenCalledWith('slug, updated_at')
    expect(announcementSelect).toHaveBeenCalledWith('slug, updated_at')
    expect(announcementNot).toHaveBeenCalledWith('published_at', 'is', null)
    expect(announcementOr).toHaveBeenCalledWith(
      expect.stringMatching(/^expires_at\.is\.null,expires_at\.gt\./)
    )
  })

  it('falls back to only static routes when either dynamic fetch fails', async () => {
    const { client } = queryClient({
      events: {
        data: [{ slug: 'parish-picnic', updated_at: '2026-08-20T12:00:00.000Z' }],
        error: null,
      },
      announcements: { data: null, error: { message: 'database unavailable' } },
    })
    mockCreateClient.mockReturnValue(client)

    const entries = await sitemap()

    expect(entries.map((entry) => entry.url)).toEqual(STATIC_URLS)
  })

  it('falls back to only static routes when client creation throws', async () => {
    mockCreateClient.mockImplementation(() => {
      throw new Error('configuration unavailable')
    })

    const entries = await sitemap()

    expect(entries.map((entry) => entry.url)).toEqual(STATIC_URLS)
  })
})
