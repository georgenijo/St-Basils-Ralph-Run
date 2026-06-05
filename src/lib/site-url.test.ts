import { afterEach, describe, expect, it, vi } from 'vitest'

import { getSiteUrl } from './site-url'

describe('getSiteUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('uses NEXT_PUBLIC_SITE_URL when it points at a real site', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://stbasilsboston.org/')
    vi.stubEnv('VERCEL_URL', 'preview.vercel.app')

    expect(getSiteUrl()).toBe('https://stbasilsboston.org')
  })

  it('uses VERCEL_URL on Vercel when NEXT_PUBLIC_SITE_URL is localhost', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'http://localhost:3000')
    vi.stubEnv('VERCEL_URL', 'st-basils-preview.vercel.app')

    expect(getSiteUrl()).toBe('https://st-basils-preview.vercel.app')
  })

  it('keeps localhost for local development when VERCEL_URL is absent', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'http://localhost:3000')

    expect(getSiteUrl()).toBe('http://localhost:3000')
  })
})
