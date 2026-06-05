import { describe, it, expect } from 'vitest'

import { deriveHealthView, isHealthBody, type FetchOutcome } from '@/lib/health-status'

const healthyBody = {
  ok: true,
  db: true,
  cms: true,
  latency_ms: 142,
  db_latency_ms: 126,
  cms_latency_ms: 88,
}

describe('deriveHealthView', () => {
  it('maps a healthy 200 to all operational with per-dependency latency', () => {
    const outcome: FetchOutcome = { kind: 'response', status: 200, body: healthyBody }
    expect(deriveHealthView(outcome)).toEqual({
      overall: 'operational',
      website: { state: 'operational', latencyMs: null },
      database: { state: 'operational', latencyMs: 126 },
      cms: { state: 'operational', latencyMs: 88 },
      totalLatencyMs: 142,
    })
  })

  it('maps a 503 with db down to website up, db down, overall down', () => {
    const outcome: FetchOutcome = {
      kind: 'response',
      status: 503,
      body: {
        ok: false,
        db: false,
        cms: true,
        latency_ms: 2010,
        db_latency_ms: 2000,
        cms_latency_ms: 71,
      },
    }
    expect(deriveHealthView(outcome)).toEqual({
      overall: 'down',
      website: { state: 'operational', latencyMs: null },
      database: { state: 'down', latencyMs: 2000 },
      cms: { state: 'operational', latencyMs: 71 },
      totalLatencyMs: 2010,
    })
  })

  it('treats a network error as website down, dependencies unknown', () => {
    expect(deriveHealthView({ kind: 'error' })).toEqual({
      overall: 'down',
      website: { state: 'down', latencyMs: null },
      database: { state: 'unknown', latencyMs: null },
      cms: { state: 'unknown', latencyMs: null },
      totalLatencyMs: null,
    })
  })

  it('treats an unexpected status (500) as website down even with a parsed body', () => {
    const outcome: FetchOutcome = { kind: 'response', status: 500, body: healthyBody }
    expect(deriveHealthView(outcome)).toEqual({
      overall: 'down',
      website: { state: 'down', latencyMs: null },
      database: { state: 'unknown', latencyMs: null },
      cms: { state: 'unknown', latencyMs: null },
      totalLatencyMs: null,
    })
  })

  it('treats a malformed body (200 but wrong shape) as website down', () => {
    const outcome: FetchOutcome = { kind: 'response', status: 200, body: { hello: 'world' } }
    expect(deriveHealthView(outcome)).toEqual({
      overall: 'down',
      website: { state: 'down', latencyMs: null },
      database: { state: 'unknown', latencyMs: null },
      cms: { state: 'unknown', latencyMs: null },
      totalLatencyMs: null,
    })
  })

  it('tolerates a valid body missing the optional per-dependency latency fields', () => {
    const outcome: FetchOutcome = {
      kind: 'response',
      status: 200,
      body: { ok: true, db: true, cms: true, latency_ms: 100 },
    }
    const view = deriveHealthView(outcome)
    expect(view.overall).toBe('operational')
    expect(view.database).toEqual({ state: 'operational', latencyMs: null })
    expect(view.cms).toEqual({ state: 'operational', latencyMs: null })
  })
})

describe('isHealthBody', () => {
  it('accepts a well-formed body', () => {
    expect(isHealthBody(healthyBody)).toBe(true)
  })

  it('rejects non-objects and bodies missing required booleans', () => {
    expect(isHealthBody(null)).toBe(false)
    expect(isHealthBody('ok')).toBe(false)
    expect(isHealthBody({ ok: true, db: true })).toBe(false)
    expect(isHealthBody({ ok: 'yes', db: true, cms: true, latency_ms: 1 })).toBe(false)
  })
})
