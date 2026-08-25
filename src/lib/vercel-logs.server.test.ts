import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  getVercelLogViewerConfiguration,
  mapVercelRequestLogs,
  parseLogViewerFilters,
  queryVercelLogs,
} from '@/lib/vercel-logs.server'

describe('Vercel admin log viewer', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('normalizes untrusted URL filters', () => {
    expect(
      parseLogViewerFilters({
        level: 'fatal',
        range: '7d',
        q: `  ${'x'.repeat(140)}  `,
        before: 'invalid timestamp',
      })
    ).toEqual({ level: 'all', range: '1h', search: 'x'.repeat(120) })

    expect(
      parseLogViewerFilters({
        level: 'error',
        range: '24h',
        q: 'req-123',
        before: '2026-08-25T12:34:56.123Z',
      })
    ).toEqual({
      level: 'error',
      range: '24h',
      search: 'req-123',
      before: '2026-08-25T12:34:56.123Z',
    })
  })

  it('flattens structured console lines and re-redacts safe fields', () => {
    const entries = mapVercelRequestLogs([
      {
        requestId: 'vercel-request-1',
        timestamp: '2026-08-25T12:00:00Z',
        deploymentId: 'dpl_123',
        requestMethod: 'POST',
        requestPath: '/api/log?secret=value',
        statusCode: 202,
        environment: 'production',
        events: [{ source: 'serverless' }],
        logs: [
          {
            level: 'error',
            message: JSON.stringify({
              timestamp: '2026-08-25T11:59:59Z',
              level: 'error',
              message: 'payment.failed for admin@example.com',
              scope: 'payments',
              requestId: 'app-request-1',
              paymentId: 'pay-1',
              authorization: 'Bearer should-never-render',
              error: {
                name: 'Error',
                message: 'contact admin@example.com',
                stack: 'Error: contact admin@example.com',
                secret: 'hidden',
              },
            }),
          },
        ],
      },
    ])

    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({
      timestamp: '2026-08-25T11:59:59.000Z',
      level: 'error',
      message: 'payment.failed for [REDACTED_EMAIL]',
      scope: 'payments',
      requestId: 'app-request-1',
      method: 'POST',
      route: '/api/log',
      details: {
        paymentId: 'pay-1',
        status: 202,
        environment: 'production',
        source: 'serverless',
        deploymentId: 'dpl_123',
      },
      error: { name: 'Error', message: 'contact [REDACTED_EMAIL]' },
    })
    expect(JSON.stringify(entries)).not.toContain('should-never-render')
    expect(JSON.stringify(entries)).not.toContain('secret=value')
    expect(JSON.stringify(entries)).not.toContain('"secret"')
  })

  it('represents Vercel invocations that have no console output', () => {
    expect(
      mapVercelRequestLogs([
        {
          requestId: 'request-2',
          timestamp: 1787659200000,
          requestMethod: 'GET',
          requestPath: '/api/health',
          statusCode: 503,
          environment: 'production',
          logs: [],
        },
      ])[0]
    ).toMatchObject({
      level: 'error',
      message: 'runtime.request',
      method: 'GET',
      route: '/api/health',
      requestId: 'request-2',
      details: { status: 503, environment: 'production' },
    })
  })

  it('reports only missing Vercel server configuration', () => {
    vi.stubEnv('VERCEL_PROJECT_ID', 'prj_123')
    vi.stubEnv('VERCEL_TEAM_ID', 'team_123')

    expect(getVercelLogViewerConfiguration()).toEqual({
      ready: false,
      missing: ['VERCEL_ACCESS_TOKEN'],
    })
  })

  it('queries the Vercel project endpoint with bounded production filters', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-25T13:00:00Z'))
    vi.stubEnv('VERCEL_ACCESS_TOKEN', 'vercel-secret')
    vi.stubEnv('VERCEL_PROJECT_ID', 'prj_123')
    vi.stubEnv('VERCEL_TEAM_ID', 'team_123')
    const rows = Array.from({ length: 50 }, (_, index) => ({
      requestId: `request-${index}`,
      timestamp: new Date(Date.UTC(2026, 7, 25, 12, 59, 59 - index)).toISOString(),
      requestMethod: 'GET',
      requestPath: '/api/health',
      statusCode: 200,
      environment: 'production',
      logs: [{ level: 'info', message: `request ${index}` }],
    }))
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ rows, hasMoreRows: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await queryVercelLogs({
      level: 'warn',
      range: '6h',
      search: 'request-123',
      before: '2026-08-25T13:00:00Z',
    })

    expect(result).toMatchObject({
      nextBefore: rows[49].timestamp,
      requestCount: 50,
    })
    expect(result.entries).toHaveLength(50)
    const [url, options] = fetchMock.mock.calls[0]
    const requestUrl = new URL(url)
    expect(`${requestUrl.origin}${requestUrl.pathname}`).toBe(
      'https://vercel.com/api/logs/request-logs'
    )
    expect(Object.fromEntries(requestUrl.searchParams)).toMatchObject({
      projectId: 'prj_123',
      ownerId: 'team_123',
      page: '0',
      startDate: String(Date.parse('2026-08-25T07:00:00Z')),
      endDate: String(Date.parse('2026-08-25T13:00:00Z')),
      environment: 'production',
      source: 'serverless,edge-function,edge-middleware',
      level: 'warning',
      search: 'request-123',
    })
    expect(options.headers.Authorization).toBe('Bearer vercel-secret')
  })
})
