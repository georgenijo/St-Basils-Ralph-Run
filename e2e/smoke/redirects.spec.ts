import { test, expect } from '@playwright/test'

/**
 * Smoke: Legacy .html redirects
 *
 * All old .html URLs must return a 308 permanent redirect
 * to their modern equivalents. Covers active pages, orphaned
 * pages (consolidated to /our-organizations), and unused
 * template pages (redirected to /).
 */

const REDIRECTS: { source: string; destination: string }[] = [
  // Active pages
  { source: '/index.html', destination: '/' },
  { source: '/about.html', destination: '/about' },
  { source: '/spiritual-leader.html', destination: '/spiritual-leaders' },
  { source: '/our-clergy.html', destination: '/our-clergy' },
  { source: '/office-bearers.html', destination: '/office-bearers' },
  { source: '/acolytes-choir.html', destination: '/acolytes-choir' },
  { source: '/our-organizations.html', destination: '/our-organizations' },
  { source: '/events-calendar.html', destination: '/events' },
  { source: '/events-calendar', destination: '/events' },
  { source: '/useful-links.html', destination: '/useful-links' },
  { source: '/first-time.html', destination: '/first-time' },
  { source: '/giving.html', destination: '/giving' },
  { source: '/contact-us.html', destination: '/contact' },
  { source: '/privacy-policy.html', destination: '/privacy-policy' },
  { source: '/terms-of-use.html', destination: '/terms-of-use' },

  // Orphaned pages → /our-organizations
  { source: '/sunday-school.html', destination: '/our-organizations' },
  { source: '/stpauls-mensfellow.html', destination: '/our-organizations' },
  { source: '/stmarys-womens.html', destination: '/our-organizations' },
  { source: '/youth.html', destination: '/our-organizations' },

  // Template pages → /
  { source: '/portfolio-details.html', destination: '/' },
  { source: '/starter-page.html', destination: '/' },
]

test.describe('Legacy .html redirects @smoke', () => {
  for (const { source, destination } of REDIRECTS) {
    test(`${source} → ${destination} (308)`, async ({ request, baseURL }) => {
      const base = new URL(baseURL ?? 'http://localhost:3000')
      const redirectUrl = new URL(source, base)
      redirectUrl.search = base.search

      const response = await request.get(redirectUrl.toString(), {
        maxRedirects: 0,
      })

      expect(response.status()).toBe(308)

      const location = response.headers()['location']
      const resolved = location ? new URL(location, base).pathname : undefined

      expect(resolved).toBe(destination)
    })
  }
})
