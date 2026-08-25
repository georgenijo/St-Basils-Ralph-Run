import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  buildAxiomLogQuery,
  getAxiomLogViewerConfiguration,
  mapAxiomMatch,
  parseLogViewerFilters,
  queryAxiomLogs,
} from '@/lib/axiom-logs.server'

describe('Axiom admin log viewer', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('normalizes untrusted URL filters', () => {
    expect(
      parseLogViewerFilters({
        level: 'fatal',
        range: 'forever',
        q: `  ${'x'.repeat(140)}  `,
        before: 'invalid timestamp',
      })
    ).toEqual({ level: 'all', range: '24h', search: 'x'.repeat(120) })

    expect(
      parseLogViewerFilters({
        level: 'error',
        range: '7d',
        q: 'req-123',
        before: '2026-08-25T12:34:56.123456789Z',
      })
    ).toEqual({
      level: 'error',
      range: '7d',
      search: 'req-123',
      before: '2026-08-25T12:34:56.123456789Z',
    })
  })

  it('uses an APL query parameter instead of interpolating search text', () => {
    const filters = parseLogViewerFilters({ level: 'warn', range: '1h', q: '" | limit 999' })
    const query = buildAxiomLogQuery('logs"] | take 1 //', filters)

    expect(query).toContain('declare query_parameters (_viewer_search:string = "");')
    expect(query).toContain('| where level == "warn"')
    expect(query).not.toContain(filters.search)
    expect(query).toContain('["logs\\\"] | take 1 //"]')
    expect(query).toContain('| limit 50')
  })

  it('maps only allowlisted, re-redacted fields from Axiom rows', () => {
    const entry = mapAxiomMatch({
      _rowId: 'row-1',
      _time: '2026-08-25T12:00:00Z',
      data: {
        timestamp: '2026-08-25T11:59:59Z',
        level: 'error',
        message: 'payment.failed for admin@example.com',
        scope: 'payments',
        requestId: 'req-1',
        paymentId: 'pay-1',
        authorization: 'Bearer should-never-render',
        error: {
          name: 'Error',
          message: 'contact admin@example.com',
          stack: 'Error: contact admin@example.com',
          secret: 'hidden',
        },
      },
    })

    expect(entry).toMatchObject({
      id: 'row-1',
      timestamp: '2026-08-25T11:59:59.000Z',
      level: 'error',
      message: 'payment.failed for [REDACTED_EMAIL]',
      scope: 'payments',
      requestId: 'req-1',
      details: { paymentId: 'pay-1' },
      error: { name: 'Error', message: 'contact [REDACTED_EMAIL]' },
    })
    expect(JSON.stringify(entry)).not.toContain('should-never-render')
    expect(JSON.stringify(entry)).not.toContain('"secret"')
  })

  it('reports missing ingest and read configuration without exposing values', () => {
    vi.stubEnv('LOG_DRAIN', 'axiom')
    vi.stubEnv('AXIOM_DATASET', 'st-basils-logs')
    vi.stubEnv('AXIOM_TOKEN', 'ingest-secret')

    expect(getAxiomLogViewerConfiguration()).toEqual({
      ready: false,
      missing: ['AXIOM_QUERY_TOKEN'],
    })
  })

  it('queries with a read token, variables, range, and a stable timestamp boundary', async () => {
    vi.stubEnv('LOG_DRAIN', 'axiom')
    vi.stubEnv('AXIOM_DATASET', 'st-basils-logs')
    vi.stubEnv('AXIOM_TOKEN', 'ingest-secret')
    vi.stubEnv('AXIOM_QUERY_TOKEN', 'query-secret')
    const rows = Array.from({ length: 50 }, (_, index) => ({
      _rowId: `row-${index}`,
      _time: `2026-08-25T12:00:${String(index % 60).padStart(2, '0')}.${String(index).padStart(3, '0')}Z`,
      data: { timestamp: '2026-08-25T12:00:00Z', level: 'info', message: `event.${index}` },
    }))
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          matches: rows,
          status: { rowsMatched: 75, isPartial: false },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await queryAxiomLogs({
      level: 'error',
      range: '6h',
      search: 'req-123',
      before: '2026-08-25T13:00:00Z',
    })

    expect(result).toMatchObject({
      nextBefore: '2026-08-25T12:00:49.049Z',
      rowsMatched: 75,
      partial: false,
    })
    expect(result.entries).toHaveLength(50)
    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.axiom.co/v1/datasets/_apl?format=legacy')
    expect(options.headers.Authorization).toBe('Bearer query-secret')
    const body = JSON.parse(options.body)
    expect(body).toMatchObject({
      startTime: 'now-6h',
      endTime: '2026-08-25T13:00:00Z',
      variables: { _viewer_search: 'req-123' },
    })
    expect(body.apl).not.toContain('req-123')
  })
})
