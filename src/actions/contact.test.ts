import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockInsert, mockSendEmail, mockVerifyTurnstile } = vi.hoisted(() => ({
  mockInsert: vi.fn(),
  mockSendEmail: vi.fn(),
  mockVerifyTurnstile: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    from: vi.fn(() => ({ insert: mockInsert })),
  })),
}))

vi.mock('@/lib/email', () => ({ sendEmail: mockSendEmail }))
vi.mock('@/lib/turnstile', () => ({ verifyTurnstile: mockVerifyTurnstile }))
vi.mock('@/emails/contact-notification', () => ({ ContactNotification: vi.fn(() => null) }))
vi.mock('@/lib/logger', () => ({
  logger: { child: vi.fn(() => ({ error: vi.fn() })) },
}))
vi.mock('@/lib/logger.server', () => ({
  withLogging: vi.fn((_name: string, action: unknown) => action),
}))

import { submitContact } from '@/actions/contact'

const INITIAL_STATE = { success: false, message: '' }

function validForm(): FormData {
  const formData = new FormData()
  formData.set('name', 'Test Member')
  formData.set('email', 'member@example.com')
  formData.set('subject', 'A parish question')
  formData.set('message', 'Could someone please follow up with me about this question?')
  formData.set('cf-turnstile-response', 'valid-token')
  return formData
}

describe('submitContact', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockVerifyTurnstile.mockResolvedValue(true)
    mockSendEmail.mockResolvedValue({ data: { id: 'email-1' }, error: null })
    mockInsert.mockResolvedValue({ error: null })
  })

  it('emails the office and persists a valid submission', async () => {
    const result = await submitContact(INITIAL_STATE, validForm())

    expect(result.success).toBe(true)
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'info@stbasilsboston.org',
        subject: 'Contact Form: A parish question',
        metadata: expect.objectContaining({ template: 'contact-notification' }),
      })
    )
    expect(mockInsert).toHaveBeenCalledWith({
      name: 'Test Member',
      email: 'member@example.com',
      subject: 'A parish question',
      message: 'Could someone please follow up with me about this question?',
    })
  })

  it('does not send or store honeypot submissions', async () => {
    const formData = validForm()
    formData.set('website', 'https://spam.example')

    await expect(submitContact(INITIAL_STATE, formData)).resolves.toEqual({
      success: false,
      message: 'Spam detected',
    })
    expect(mockSendEmail).not.toHaveBeenCalled()
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('does not send when CAPTCHA verification fails', async () => {
    mockVerifyTurnstile.mockResolvedValue(false)

    await expect(submitContact(INITIAL_STATE, validForm())).resolves.toEqual({
      success: false,
      message: 'CAPTCHA verification failed',
    })
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('does not persist a submission when the notification email fails', async () => {
    mockSendEmail.mockResolvedValue({ data: null, error: new Error('provider unavailable') })

    const result = await submitContact(INITIAL_STATE, validForm())

    expect(result).toEqual({
      success: false,
      message: 'Failed to send message. Please try again.',
    })
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('reports success when archival storage fails after email delivery', async () => {
    mockInsert.mockResolvedValue({ error: new Error('database unavailable') })

    const result = await submitContact(INITIAL_STATE, validForm())

    expect(result.success).toBe(true)
    expect(mockSendEmail).toHaveBeenCalledOnce()
  })
})
