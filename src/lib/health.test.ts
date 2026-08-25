import { describe, it, expect, vi, beforeEach } from 'vitest'

// Hoisted so the vi.mock factories below can close over them.
const { mockSanityFetch, sanityState, mockHealthLogError } = vi.hoisted(() => ({
  mockSanityFetch: vi.fn(),
  sanityState: { hasConfig: true },
  mockHealthLogError: vi.fn(),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

vi.mock('@/lib/sanity/client', () => ({
  get hasSanityConfig() {
    return sanityState.hasConfig
  },
  // checkCms() chains .withConfig({ useCdn: false }) before .fetch — mirror that.
  getSanityClient: () => ({ withConfig: () => ({ fetch: mockSanityFetch }) }),
}))

vi.mock('@/lib/logger', () => ({
  logger: { child: () => ({ error: mockHealthLogError }) },
}))

import { createAdminClient } from '@/lib/supabase/admin'
import { checkDependencies, checkRuntimeConfig } from '@/lib/health'

const mockedCreateAdminClient = vi.mocked(createAdminClient)

/** Build a stub Supabase admin client whose query chain settles as configured. */
function stubAdmin(settle: { resolve?: unknown; reject?: unknown }) {
  const result =
    'reject' in settle ? Promise.reject(settle.reject) : Promise.resolve(settle.resolve)
  // Pre-attach a no-op catch so an eager rejection never surfaces as "unhandled"
  // before checkDb attaches its real handler.
  result.catch(() => {})
  const chain = {
    select: () => chain,
    limit: () => chain,
    abortSignal: () => result,
  }
  return { from: () => chain } as unknown as ReturnType<typeof createAdminClient>
}

beforeEach(() => {
  vi.clearAllMocks()
  sanityState.hasConfig = true
  // Default: both dependencies healthy. Individual tests override as needed.
  mockedCreateAdminClient.mockReturnValue(stubAdmin({ resolve: { error: null } }))
  mockSanityFetch.mockResolvedValue(1)
})

describe('checkDependencies', () => {
  // Per-dependency latency is non-deterministic; assert the booleans exactly and
  // that each latency field is a number.
  const withLatency = (flags: {
    ok: boolean
    config?: 'ok' | 'unsafe'
    db: boolean
    cms: boolean
  }) => ({
    ...flags,
    config: flags.config ?? 'ok',
    db_latency_ms: expect.any(Number),
    cms_latency_ms: expect.any(Number),
  })

  it('reports all healthy when DB and CMS both respond', async () => {
    await expect(checkDependencies()).resolves.toEqual(
      withLatency({ ok: true, db: true, cms: true })
    )
  })

  it('reports db false on a Supabase error response', async () => {
    mockedCreateAdminClient.mockReturnValue(stubAdmin({ resolve: { error: { message: 'boom' } } }))
    await expect(checkDependencies()).resolves.toEqual(
      withLatency({ ok: false, db: false, cms: true })
    )
  })

  it('reports db false when the Supabase query rejects (timeout/connection)', async () => {
    mockedCreateAdminClient.mockReturnValue(stubAdmin({ reject: new Error('ETIMEDOUT') }))
    await expect(checkDependencies()).resolves.toEqual(
      withLatency({ ok: false, db: false, cms: true })
    )
  })

  it('reports cms false when the Sanity ping rejects', async () => {
    mockSanityFetch.mockRejectedValue(new Error('cms down'))
    await expect(checkDependencies()).resolves.toEqual(
      withLatency({ ok: false, db: true, cms: false })
    )
  })

  it('reports both false when Supabase env is missing and Sanity is unconfigured', async () => {
    mockedCreateAdminClient.mockImplementation(() => {
      throw new Error('Missing Supabase admin environment variables')
    })
    sanityState.hasConfig = false
    await expect(checkDependencies()).resolves.toEqual(
      withLatency({ ok: false, db: false, cms: false })
    )
    // Unconfigured Sanity must not even attempt a network ping.
    expect(mockSanityFetch).not.toHaveBeenCalled()
  })

  it.each([
    ['TEST_SUPPORT_ENABLED', { TEST_SUPPORT_ENABLED: '1' }],
    ['E2E_MODE', { E2E_MODE: 'true' }],
    ['EMAIL_TRANSPORT', { EMAIL_TRANSPORT: 'mock' }],
    ['ALLOW_TURNSTILE_TEST_BYPASS', { ALLOW_TURNSTILE_TEST_BYPASS: '1' }],
    ['NEXT_PUBLIC_ALLOW_TURNSTILE_TEST_BYPASS', { NEXT_PUBLIC_ALLOW_TURNSTILE_TEST_BYPASS: '1' }],
    ['TURNSTILE_TEST_BYPASS_TOKEN', { TURNSTILE_TEST_BYPASS_TOKEN: 'secret' }],
    [
      'NEXT_PUBLIC_TURNSTILE_TEST_BYPASS_TOKEN',
      { NEXT_PUBLIC_TURNSTILE_TEST_BYPASS_TOKEN: 'secret' },
    ],
  ])('reports config unsafe in production when %s is enabled', async (_name, flag) => {
    await expect(checkDependencies({ VERCEL_ENV: 'production', ...flag })).resolves.toEqual(
      withLatency({ ok: false, config: 'unsafe', db: true, cms: true })
    )
    expect(mockHealthLogError).toHaveBeenCalledWith('health.unsafe_production_config', {
      unsafeConfigNames: [_name],
    })
  })
})

describe('checkRuntimeConfig', () => {
  it('allows test support flags outside Vercel production', () => {
    expect(
      checkRuntimeConfig({
        VERCEL_ENV: 'preview',
        TEST_SUPPORT_ENABLED: '1',
        E2E_MODE: '1',
        EMAIL_TRANSPORT: 'mock',
        ALLOW_TURNSTILE_TEST_BYPASS: '1',
        NEXT_PUBLIC_ALLOW_TURNSTILE_TEST_BYPASS: '1',
        TURNSTILE_TEST_BYPASS_TOKEN: 'secret',
        NEXT_PUBLIC_TURNSTILE_TEST_BYPASS_TOKEN: 'secret',
      })
    ).toBe('ok')
  })

  it('allows a real email transport in production', () => {
    expect(checkRuntimeConfig({ VERCEL_ENV: 'production', EMAIL_TRANSPORT: 'resend' })).toBe('ok')
  })

  it('treats any non-empty test flag value as set in production', () => {
    expect(checkRuntimeConfig({ VERCEL_ENV: 'production', TEST_SUPPORT_ENABLED: 'false' })).toBe(
      'unsafe'
    )
  })

  it('treats an empty test flag as set when it exists in production', () => {
    expect(checkRuntimeConfig({ VERCEL_ENV: 'production', E2E_MODE: '' })).toBe('unsafe')
  })
})
