import { readFile } from 'node:fs/promises'

import { expect, test } from '@playwright/test'

import { fetchEventBySlug, loginAsSeedAdmin, slugify } from '../helpers/test-support'

test.describe('CI admin events', () => {
  test('admin can create an event and the ICS export keeps Eastern entry times intact', async ({
    page,
    request,
  }) => {
    const title = `CI Event ${Date.now()}`
    const slug = slugify(title)

    await loginAsSeedAdmin(page)
    await page.waitForURL('**/admin/**')

    await page.goto('/admin/events/new', { waitUntil: 'domcontentloaded' })
    await page.locator('input#title').fill(title)
    await page.locator('input#location').fill('73 Ellis Street, Newton, MA 02464')
    await page.locator('input#start_at').fill('2027-01-15T09:15')
    await page.locator('input#end_at').fill('2027-01-15T11:00')
    await page.getByRole('button', { name: 'Create Event' }).click()

    await page.waitForURL('**/admin/events')

    const event = await fetchEventBySlug(slug)
    expect(event.start_at).toContain('2027-01-15T14:15:00')
    expect(event.end_at).toContain('2027-01-15T16:00:00')

    await page.goto(`/events/${slug}`, { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: title })).toBeVisible()
    await expect(page.getByText(/9:15 AM/i)).toBeVisible()
    await expect(page.getByText(/11:00 AM EST/i)).toBeVisible()

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Add to Calendar' }).click(),
    ])

    const downloadPath = await download.path()
    expect(downloadPath).toBeTruthy()

    const icsContents = await readFile(downloadPath!, 'utf8')
    expect(icsContents).toContain('DTSTART:20270115T141500Z')
    expect(icsContents).toContain('DTEND:20270115T160000Z')

    const feedResponse = await request.get('/api/events/feed.ics')
    expect(feedResponse.ok()).toBeTruthy()

    const feedContents = await feedResponse.text()
    expect(feedContents).toContain('DTSTART:20270115T141500Z')
  })
})
