import { afterEach, describe, expect, it, vi } from 'vitest'

import { logger } from '@/lib/logger'
import { withRequestLogging } from '@/lib/logger.server'

describe('request logging context', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('keeps request ids isolated across concurrent requests', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('LOG_LEVEL', 'info')
    const lines: string[] = []
    vi.spyOn(globalThis.console, 'info').mockImplementation((line) => lines.push(String(line)))

    const handler = withRequestLogging('/api/concurrent-test', async (request: Request) => {
      const delay = new URL(request.url).searchParams.get('delay') === 'slow' ? 15 : 1
      await new Promise((resolve) => setTimeout(resolve, delay))
      logger.info('concurrent.request')
      return new Response(null, { status: 204 })
    })

    await Promise.all([
      handler(
        new Request('https://example.com/api/concurrent-test?delay=slow', {
          headers: { 'x-request-id': 'request-slow' },
        })
      ),
      handler(
        new Request('https://example.com/api/concurrent-test?delay=fast', {
          headers: { 'x-request-id': 'request-fast' },
        })
      ),
    ])

    const records = lines.map((line) => JSON.parse(line))
    expect(records).toHaveLength(2)
    expect(records.map((record) => record.requestId).sort()).toEqual([
      'request-fast',
      'request-slow',
    ])
    expect(records.every((record) => record.route === '/api/concurrent-test')).toBe(true)
  })
})
