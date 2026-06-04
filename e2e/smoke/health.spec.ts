import { test, expect } from '@playwright/test'

/**
 * Smoke: /api/health (the BetterStack monitor #2 target).
 *
 * This is a contract test, not a liveness test — CI may not have Sanity
 * configured, so we assert the response *shape* and the status/`ok`
 * relationship rather than that everything is up. It therefore passes both in
 * CI and against production.
 */

test.describe('Health endpoint @smoke', () => {
  test('returns structured status with a consistent code', async ({ request }) => {
    const response = await request.get('/api/health')

    // Never served from cache.
    expect(response.headers()['cache-control']).toContain('no-store')

    const body = await response.json()
    expect(typeof body.ok).toBe('boolean')
    expect(typeof body.db).toBe('boolean')
    expect(typeof body.cms).toBe('boolean')
    expect(typeof body.latency_ms).toBe('number')

    // ok is the conjunction of the dependency flags...
    expect(body.ok).toBe(body.db && body.cms)
    // ...and drives the HTTP status: 200 when ok, 503 otherwise.
    expect(response.status()).toBe(body.ok ? 200 : 503)
  })
})
