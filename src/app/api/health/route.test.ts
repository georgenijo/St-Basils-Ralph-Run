import { beforeEach, describe, expect, it, vi } from 'vitest'

const { checkDependencies, warn } = vi.hoisted(() => ({
  checkDependencies: vi.fn(),
  warn: vi.fn(),
}))

vi.mock('@/lib/health', () => ({ checkDependencies }))
vi.mock('@/lib/logger', () => ({
  logger: { child: () => ({ warn }) },
}))
vi.mock('@/lib/logger.server', () => ({
  withRequestLogging: (_route: string, handler: (request: Request) => Promise<Response>) => handler,
}))

import { GET } from '@/app/api/health/route'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/health', () => {
  it('returns a redacted, non-cacheable 503 for unsafe production configuration', async () => {
    checkDependencies.mockResolvedValue({
      ok: false,
      config: 'unsafe',
      db: true,
      cms: true,
      db_latency_ms: 2,
      cms_latency_ms: 3,
    })

    const response = await GET(new Request('https://stbasilsboston.org/api/health'))
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(body).toMatchObject({
      ok: false,
      config: 'unsafe',
      db: true,
      cms: true,
      db_latency_ms: 2,
      cms_latency_ms: 3,
    })
    expect(body).not.toHaveProperty('unsafeConfigNames')
    expect(JSON.stringify(body)).not.toContain('TEST_SUPPORT_ENABLED')
    expect(warn).not.toHaveBeenCalled()
  })
})
