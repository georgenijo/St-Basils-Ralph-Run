import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockFrom, mockSendEmail, mockVerifyTurnstile } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockSendEmail: vi.fn(),
  mockVerifyTurnstile: vi.fn(),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}))
vi.mock('@/lib/email', () => ({ sendEmail: mockSendEmail }))
vi.mock('@/lib/site-url', () => ({ getSiteUrl: vi.fn(() => 'https://test.stbasils.example') }))
vi.mock('@/lib/turnstile', () => ({ verifyTurnstile: mockVerifyTurnstile }))
vi.mock('@/emails/newsletter-confirmation', () => ({
  NewsletterConfirmation: vi.fn(() => null),
}))
vi.mock('@/lib/logger', () => ({
  logger: { child: vi.fn(() => ({ error: vi.fn() })) },
}))
vi.mock('@/lib/logger.server', () => ({
  withLogging: vi.fn((_name: string, action: unknown) => action),
}))

import { subscribeNewsletter } from '@/actions/newsletter'

const INITIAL_STATE = { success: false, message: '' }

function form(email = 'reader@example.com'): FormData {
  const formData = new FormData()
  formData.set('email', email)
  formData.set('cf-turnstile-response', 'valid-token')
  return formData
}

function subscriberTable(options: {
  existing?: unknown
  existingError?: unknown
  inserted?: unknown
  insertError?: unknown
}) {
  return {
    select: () => ({
      eq: () => ({
        maybeSingle: () =>
          Promise.resolve({ data: options.existing ?? null, error: options.existingError ?? null }),
      }),
    }),
    insert: vi.fn(() => ({
      select: () => ({
        single: () =>
          Promise.resolve({ data: options.inserted ?? null, error: options.insertError ?? null }),
      }),
    })),
  }
}

describe('subscribeNewsletter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockVerifyTurnstile.mockResolvedValue(true)
    mockSendEmail.mockResolvedValue({ data: { id: 'email-1' }, error: null })
  })

  it('creates a subscriber and sends a confirmation URL containing its token', async () => {
    const table = subscriberTable({ inserted: { confirmation_token: 'new-token' } })
    mockFrom.mockReturnValue(table)

    const result = await subscribeNewsletter(INITIAL_STATE, form())

    expect(result.success).toBe(true)
    expect(table.insert).toHaveBeenCalledWith({ email: 'reader@example.com' })
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'reader@example.com',
        metadata: expect.objectContaining({
          template: 'newsletter-confirmation',
          confirmUrl: 'https://test.stbasils.example/api/newsletter/confirm?token=new-token',
        }),
      })
    )
  })

  it('does not send another email to an already confirmed subscriber', async () => {
    mockFrom.mockReturnValue(
      subscriberTable({
        existing: { id: 'subscriber-1', confirmed: true, confirmation_token: 'old-token' },
      })
    )

    await expect(subscribeNewsletter(INITIAL_STATE, form())).resolves.toEqual({
      success: true,
      message: 'You are already subscribed.',
    })
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('resends the original confirmation token for an unconfirmed subscriber', async () => {
    mockFrom.mockReturnValue(
      subscriberTable({
        existing: { id: 'subscriber-1', confirmed: false, confirmation_token: 'old-token' },
      })
    )

    const result = await subscribeNewsletter(INITIAL_STATE, form())

    expect(result.success).toBe(true)
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          confirmUrl: 'https://test.stbasils.example/api/newsletter/confirm?token=old-token',
        }),
      })
    )
  })

  it('reports confirmation delivery failures instead of claiming signup succeeded', async () => {
    mockFrom.mockReturnValue(
      subscriberTable({
        existing: { id: 'subscriber-1', confirmed: false, confirmation_token: 'old-token' },
      })
    )
    mockSendEmail.mockResolvedValue({ data: null, error: new Error('provider unavailable') })

    await expect(subscribeNewsletter(INITIAL_STATE, form())).resolves.toEqual({
      success: false,
      message: 'Failed to send confirmation email. Please try again.',
    })
  })
})
