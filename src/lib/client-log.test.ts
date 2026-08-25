import { beforeEach, describe, expect, it } from 'vitest'

import {
  CLIENT_LOG_RATE_LIMIT,
  clientLogSchema,
  consumeClientLogRateLimit,
  resetClientLogRateLimitsForTests,
  sanitizeClientPath,
} from '@/lib/client-log'

describe('client log intake', () => {
  beforeEach(() => resetClientLogRateLimitsForTests())

  it('accepts only the whitelisted shape', () => {
    expect(clientLogSchema.safeParse({ name: 'TypeError', message: 'crashed' }).success).toBe(true)
    expect(clientLogSchema.safeParse({ message: 'crashed', cookie: 'secret' }).success).toBe(false)
    expect(clientLogSchema.safeParse({ message: 'x'.repeat(501) }).success).toBe(false)
  })

  it('limits unauthenticated clients to ten events per minute', () => {
    for (let index = 0; index < CLIENT_LOG_RATE_LIMIT; index += 1) {
      expect(consumeClientLogRateLimit('203.0.113.1', 1_000).allowed).toBe(true)
    }
    expect(consumeClientLogRateLimit('203.0.113.1', 1_000).allowed).toBe(false)
    expect(consumeClientLogRateLimit('203.0.113.1', 61_001).allowed).toBe(true)
  })

  it('strips query strings and fragments from client paths', () => {
    expect(sanitizeClientPath('/member?token=secret#details')).toBe('/member')
    expect(sanitizeClientPath('https://example.com/admin/users?cookie=secret')).toBe('/admin/users')
  })
})
