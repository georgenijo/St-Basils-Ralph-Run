import { expect, test } from '@playwright/test'

import {
  clearMockEmails,
  ensureConfirmedSubscriber,
  fetchAnnouncementBySlug,
  fetchSubscriberByEmail,
  loginAsSeedAdmin,
  slugify,
  uniqueEmail,
  waitForReactHydration,
  waitForMockEmail,
} from '../helpers/test-support'

test.describe('CI admin announcements', () => {
  test.beforeEach(async ({ request }) => {
    await clearMockEmails(request)
  })

  test('published announcement emails contain a working unsubscribe link', async ({
    page,
    request,
  }) => {
    const subscriberEmail = uniqueEmail('announcement')
    await ensureConfirmedSubscriber(subscriberEmail)

    const title = `CI Announcement ${Date.now()}`
    const slug = slugify(title)

    await loginAsSeedAdmin(page)
    await page.waitForURL('**/admin/**')

    await page.goto('/admin/announcements/new', { waitUntil: 'domcontentloaded' })
    const emailSwitch = page.getByRole('switch', { name: 'Send email notification' })
    const publishSwitch = page.getByRole('switch', { name: 'Publish announcement' })
    await waitForReactHydration(emailSwitch)
    await page.locator('input#title').fill(title)
    await page.locator('input#slug').fill(slug)
    // The form is server-rendered before its client switches hydrate. Retry the
    // interaction so a fast CI runner cannot lose the first click to hydration.
    for (const toggle of [emailSwitch, publishSwitch]) {
      await expect(async () => {
        if ((await toggle.getAttribute('aria-checked')) !== 'true') {
          await toggle.click()
        }
        expect(await toggle.getAttribute('aria-checked')).toBe('true')
      }).toPass()
    }
    await expect(page.locator('input[name="send_email"]')).toHaveValue('true')
    await expect(page.locator('input[name="published"]')).toHaveValue('true')
    await page.getByRole('button', { name: 'Create Announcement' }).click()

    await page.waitForURL('**/admin/announcements')
    await expect(page.getByRole('heading', { name: 'Announcements', level: 1 })).toBeVisible()
    await expect(page.getByText(title)).toBeVisible()

    const announcement = await fetchAnnouncementBySlug(slug)
    expect(announcement.published_at).toBeTruthy()
    expect(announcement.send_email).toBe(true)

    const triggerResponse = await request.post('/api/test/announcement-broadcast', {
      headers: { 'x-test-secret': process.env.TEST_SUPPORT_SECRET || 'test-support-secret' },
      data: { announcementId: announcement.id },
    })
    expect(triggerResponse.ok()).toBeTruthy()

    const email = await waitForMockEmail(request, {
      template: 'announcement-broadcast',
      to: subscriberEmail,
    })

    expect(email.metadata.announcementUrl).toContain(`/announcements/${slug}`)
    expect(email.metadata.unsubscribeUrl).toContain('/api/newsletter/unsubscribe?token=')

    await page.goto('/announcements', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText(title)).toBeVisible()

    await page.goto(email.metadata.unsubscribeUrl!, { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/unsubscribed=success/)

    const subscriber = await fetchSubscriberByEmail(subscriberEmail)
    expect(subscriber.unsubscribed_at).toBeTruthy()
  })
})
