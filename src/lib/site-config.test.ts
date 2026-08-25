import { describe, expect, it } from 'vitest'

import { CHURCH_PHONE, formatChurchPhone, getChurchPhoneTelHref } from '@/lib/site-config'

describe('church phone configuration', () => {
  it('does not publish a phone number by default', () => {
    expect(CHURCH_PHONE).toBeNull()
    expect(formatChurchPhone()).toBeNull()
    expect(getChurchPhoneTelHref()).toBeNull()
  })

  it('formats a future verified US phone number for display and links', () => {
    expect(formatChurchPhone('+15551234567')).toBe('(555) 123-4567')
    expect(getChurchPhoneTelHref('+15551234567')).toBe('tel:+15551234567')
  })
})
