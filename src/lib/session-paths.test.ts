import { describe, expect, it } from 'vitest'

import { requiresSessionRefresh } from '@/lib/session-paths'

describe('requiresSessionRefresh', () => {
  it.each([
    '/admin',
    '/admin/events',
    '/member',
    '/member/settings',
    '/login',
    '/forgot-password',
    '/set-password',
    '/rsvp/parish-picnic',
    '/api/auth/logout',
  ])('keeps session refreshes for %s', (pathname) => {
    expect(requiresSessionRefresh(pathname)).toBe(true)
  })

  it.each(['/', '/about', '/events', '/events/parish-picnic', '/announcements', '/contact'])(
    'keeps anonymous public route %s off the auth hot path',
    (pathname) => {
      expect(requiresSessionRefresh(pathname)).toBe(false)
    }
  )

  it('does not treat lookalike prefixes as protected routes', () => {
    expect(requiresSessionRefresh('/administrator')).toBe(false)
    expect(requiresSessionRefresh('/membership')).toBe(false)
  })
})
