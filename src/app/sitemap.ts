import type { MetadataRoute } from 'next'

import { createClient } from '@/lib/supabase/server'

const BASE_URL = 'https://stbasilsboston.org'

const STATIC_ROUTES = [
  '/',
  '/about',
  '/first-time',
  '/giving',
  '/contact',
  '/our-clergy',
  '/office-bearers',
  '/spiritual-leaders',
  '/our-organizations',
  '/acolytes-choir',
  '/useful-links',
  '/events',
  '/announcements',
  '/privacy-policy',
  '/terms-of-use',
] as const

interface SitemapRow {
  slug: string
  updated_at: string
}

function staticEntries(lastModified: Date): MetadataRoute.Sitemap {
  return STATIC_ROUTES.map((route) => ({
    url: route === '/' ? BASE_URL : `${BASE_URL}${route}`,
    lastModified,
    changeFrequency: route === '/' ? 'weekly' : 'monthly',
    priority: route === '/' ? 1 : route === '/events' || route === '/announcements' ? 0.8 : 0.7,
  }))
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const generatedAt = new Date()
  const staticPages = staticEntries(generatedAt)

  try {
    const supabase = await createClient()

    // All events are public: the public page query has no additional predicates,
    // and the events SELECT policy is USING (true).
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('slug, updated_at')
      .order('slug', { ascending: true })

    if (eventsError) return staticPages

    // Mirror the public announcement policy explicitly. An authenticated admin
    // requesting the sitemap must not cause drafts or expired records to leak in.
    const { data: announcements, error: announcementsError } = await supabase
      .from('announcements')
      .select('slug, updated_at')
      .not('published_at', 'is', null)
      .or(`expires_at.is.null,expires_at.gt.${generatedAt.toISOString()}`)
      .order('slug', { ascending: true })

    if (announcementsError) return staticPages

    const eventPages: MetadataRoute.Sitemap = ((events as SitemapRow[] | null) ?? []).map(
      (event) => ({
        url: `${BASE_URL}/events/${event.slug}`,
        lastModified: new Date(event.updated_at),
        changeFrequency: 'monthly',
        priority: 0.6,
      })
    )

    const announcementPages: MetadataRoute.Sitemap = (
      (announcements as SitemapRow[] | null) ?? []
    ).map((announcement) => ({
      url: `${BASE_URL}/announcements/${announcement.slug}`,
      lastModified: new Date(announcement.updated_at),
      changeFrequency: 'monthly',
      priority: 0.6,
    }))

    return [...staticPages, ...eventPages, ...announcementPages]
  } catch {
    return staticPages
  }
}
