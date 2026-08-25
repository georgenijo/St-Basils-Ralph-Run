import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockStoreEmail, mockResendSend, mockIsMockEnabled } = vi.hoisted(() => ({
  mockStoreEmail: vi.fn(),
  mockResendSend: vi.fn(),
  mockIsMockEnabled: vi.fn(),
}))

vi.mock('@/lib/email-sink', () => ({ storeMockEmail: mockStoreEmail }))
vi.mock('@/lib/resend', () => ({
  resend: { emails: { send: mockResendSend } },
}))
vi.mock('@/lib/test-support', () => ({
  isMockEmailTransportEnabled: mockIsMockEnabled,
}))

import { sendEmail } from '@/lib/email'

describe('sendEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('writes mock emails to the sink without contacting Resend', async () => {
    mockIsMockEnabled.mockReturnValue(true)
    mockStoreEmail.mockResolvedValue({ id: 'mock-email-1' })

    await expect(
      sendEmail({
        from: 'Church <noreply@example.com>',
        to: 'member@example.com',
        subject: 'Payment confirmed',
        text: 'Thank you',
        metadata: { template: 'payment-confirmed' },
      })
    ).resolves.toEqual({ data: { id: 'mock-email-1' }, error: null })
    expect(mockStoreEmail).toHaveBeenCalledWith({
      from: 'Church <noreply@example.com>',
      to: ['member@example.com'],
      subject: 'Payment confirmed',
      html: undefined,
      text: 'Thank you',
      metadata: { template: 'payment-confirmed' },
    })
    expect(mockResendSend).not.toHaveBeenCalled()
  })

  it('sends real messages through Resend and strips internal metadata', async () => {
    mockIsMockEnabled.mockReturnValue(false)
    mockResendSend.mockResolvedValue({ data: { id: 'resend-1' }, error: null })

    await expect(
      sendEmail({
        from: 'Church <noreply@example.com>',
        to: ['one@example.com', 'two@example.com'],
        subject: 'Event charge',
        html: '<p>$35.00</p>',
        metadata: { template: 'event-charge' },
      })
    ).resolves.toEqual({ data: { id: 'resend-1' }, error: null })
    expect(mockResendSend).toHaveBeenCalledWith({
      from: 'Church <noreply@example.com>',
      to: ['one@example.com', 'two@example.com'],
      subject: 'Event charge',
      html: '<p>$35.00</p>',
    })
  })

  it('returns provider errors to the calling action', async () => {
    const error = new Error('provider unavailable')
    mockIsMockEnabled.mockReturnValue(false)
    mockResendSend.mockResolvedValue({ data: null, error })

    await expect(
      sendEmail({
        from: 'Church <noreply@example.com>',
        to: 'member@example.com',
        subject: 'Test',
        text: 'Test',
      })
    ).resolves.toEqual({ data: null, error })
  })
})
