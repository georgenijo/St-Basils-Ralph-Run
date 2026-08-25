import { expect, test } from '@playwright/test'

test.describe('client error intake @smoke', () => {
  test('validates and accepts the public whitelisted payload', async ({ request }) => {
    const invalid = await request.post('/api/log', {
      data: { message: 'invalid payload', cookie: 'must-not-be-accepted' },
    })
    expect(invalid.status()).toBe(400)

    const accepted = await request.post('/api/log', {
      data: {
        name: 'SmokeTestError',
        message: 'Client logging smoke test',
        path: '/smoke?token=must-be-stripped',
      },
    })
    expect(accepted.status()).toBe(202)
    expect(accepted.headers()['cache-control']).toBe('no-store')
    expect(accepted.headers()['x-request-id']).toBeTruthy()
  })
})
