import { describe, it, expect, vi, beforeEach } from 'vitest'

// Hoisted so the vi.mock factories below can close over them.
const { mockSanityFetch, sanityState } = vi.hoisted(() => ({
  mockSanityFetch: vi.fn(),
  sanityState: { hasConfig: true },
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

import { createAdminClient } from '@/lib/supabase/admin'
import { checkDependencies } from '@/lib/health'

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
  const withLatency = (flags: { ok: boolean; db: boolean; cms: boolean }) => ({
    ...flags,
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
})
