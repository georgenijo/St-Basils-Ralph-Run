import { test, expect } from '@playwright/test'

/**
 * Issue #163: Admin shares management view
 *
 * Tests the shares admin page route compiles correctly,
 * sidebar nav item is present, and regression on existing pages.
 */

test.describe('Issue #163: Admin Shares Management', () => {
  // ── S1: Shares route exists and compiles (no 500) ─────────────────
  test('S1: /admin/shares route exists and does not 500', async ({ page }) => {
    const response = await page.goto('/admin/shares', {
      waitUntil: 'domcontentloaded',
    })
    const status = response?.status() ?? 0
    // Route should compile — returns 200 (authed) or 307 (redirect) — never 500
    expect(status).not.toBe(500)
  })

  // ── S2: Auth guard works (redirect or render admin) ────────────────
  test('S2: /admin/shares either redirects to login or renders admin', async ({ page }) => {
    const response = await page.goto('/admin/shares', {
      waitUntil: 'domcontentloaded',
    })
    const url = page.url()
    const status = response?.status() ?? 0

    // Acceptable outcomes: redirect to login OR render the admin panel
    const isRedirected = url.includes('/login')
    const isAdminPage = status === 200 && !url.includes('/login')
    expect(isRedirected || isAdminPage).toBeTruthy()
  })

  // ── S3: Sidebar contains Shares nav item ───────────────────────────
  test('S3: Sidebar contains Shares nav item when authed', async ({ page }) => {
    await page.goto('/admin/shares', { waitUntil: 'domcontentloaded' })
    const url = page.url()

    // If authenticated, verify the sidebar has the Shares link
    if (!url.includes('/login')) {
      const sharesLink = page.getByRole('link', { name: 'Shares' }).first()
      await expect(sharesLink).toHaveAttribute('href', '/admin/shares')
    }
  })

  // ── S16: Regression — existing admin routes don't 500 ──────────────
  const ADMIN_ROUTES = [
    { path: '/admin/dashboard', label: 'Dashboard' },
    { path: '/admin/events', label: 'Events' },
    { path: '/admin/announcements', label: 'Announcements' },
    { path: '/admin/users', label: 'Users' },
  ]

  for (const { path, label } of ADMIN_ROUTES) {
    test(`S16: Regression — ${label} (${path}) no 500`, async ({ page }) => {
      const response = await page.goto(path, {
        waitUntil: 'domcontentloaded',
      })
      const status = response?.status() ?? 0
      expect(status).not.toBe(500)
    })
  }

  // ── S17: Regression — public pages still load ──────────────────────
  const PUBLIC_PAGES = [
    { path: '/', label: 'Homepage' },
    { path: '/about', label: 'About' },
    { path: '/giving', label: 'Giving' },
    { path: '/contact', label: 'Contact Us' },
    { path: '/events', label: 'Events' },
  ]

  for (const { path, label } of PUBLIC_PAGES) {
    test(`S17: Regression — ${label} (${path}) still loads`, async ({ page }) => {
      const consoleErrors: string[] = []
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          const text = msg.text()
          if (text.includes('Turnstile') || text.includes('cf-turnstile')) return
          if (text.includes('NEXT_PUBLIC_')) return
          if (text.includes('Failed to load resource')) return
          consoleErrors.push(text)
        }
      })

      const response = await page.goto(path, { waitUntil: 'domcontentloaded' })
      expect(response?.status()).toBe(200)
      await expect(page.locator('nav[aria-label="Main navigation"]')).toBeVisible()
      await expect(page.locator('footer')).toBeVisible()
      expect(consoleErrors).toEqual([])
    })
  }

  // ── S19: No console errors on shares route ─────────────────────────
  test('S19: No unexpected console errors on /admin/shares', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text()
        if (text.includes('Turnstile') || text.includes('cf-turnstile')) return
        if (text.includes('NEXT_PUBLIC_')) return
        if (text.includes('Failed to load resource')) return
        if (text.includes('NEXT_REDIRECT')) return
        consoleErrors.push(text)
      }
    })

    await page.goto('/admin/shares', { waitUntil: 'domcontentloaded' })
    expect(consoleErrors).toEqual([])
  })
})
