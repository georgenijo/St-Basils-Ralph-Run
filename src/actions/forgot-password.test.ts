import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockVerifyTurnstile = vi.fn()
const mockMaybeSingle = vi.fn()
const mockGenerateLink = vi.fn()
const mockSendPasswordResetEmail = vi.fn()

vi.mock('@/lib/turnstile', () => ({
  verifyTurnstile: (...args: unknown[]) => mockVerifyTurnstile(...args),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: mockMaybeSingle }),
      }),
    }),
    auth: { admin: { generateLink: mockGenerateLink } },
  }),
}))

vi.mock('@/lib/password-reset-email', () => ({
  sendPasswordResetEmail: (...args: unknown[]) => mockSendPasswordResetEmail(...args),
}))

import { requestPasswordReset } from '@/actions/forgot-password'

const INITIAL_STATE = { success: false, message: '' }
const GENERIC_MESSAGE =
  'If an active portal account matches that email, a password reset link has been sent.'

function formData(email: string, captcha = 'captcha-token') {
  const data = new FormData()
  data.set('email', email)
  data.set('cf-turnstile-response', captcha)
  return data
}

describe('requestPasswordReset', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockVerifyTurnstile.mockResolvedValue(true)
    mockSendPasswordResetEmail.mockResolvedValue({ error: null })
  })

  it('requires a valid email and CAPTCHA before account lookup', async () => {
    const invalidEmail = await requestPasswordReset(INITIAL_STATE, formData('not-an-email'))
    expect(invalidEmail.errors?.email).toBeDefined()

    mockVerifyTurnstile.mockResolvedValue(false)
    const invalidCaptcha = await requestPasswordReset(INITIAL_STATE, formData('member@example.com'))
    expect(invalidCaptcha).toMatchObject({ success: false, message: 'CAPTCHA verification failed' })
    expect(mockMaybeSingle).not.toHaveBeenCalled()
  })

  it('does not reveal that an account is missing or inactive', async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null }).mockResolvedValueOnce({
      data: {
        id: 'user-1',
        email: 'member@example.com',
        full_name: 'Member',
        is_active: false,
      },
      error: null,
    })

    const missing = await requestPasswordReset(INITIAL_STATE, formData('missing@example.com'))
    const inactive = await requestPasswordReset(INITIAL_STATE, formData('member@example.com'))

    expect(missing).toEqual({ success: true, message: GENERIC_MESSAGE })
    expect(inactive).toEqual(missing)
    expect(mockGenerateLink).not.toHaveBeenCalled()
  })

  it('sends the existing branded recovery email through a server-verified callback', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: {
        id: 'user-1',
        email: 'Member@Example.com',
        full_name: 'Parish Member',
        is_active: true,
      },
      error: null,
    })
    mockGenerateLink.mockResolvedValue({
      data: { properties: { hashed_token: 'recovery-hash' } },
      error: null,
    })

    const result = await requestPasswordReset(INITIAL_STATE, formData('member@example.com'))

    expect(result).toEqual({ success: true, message: GENERIC_MESSAGE })
    expect(mockGenerateLink).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'recovery', email: 'Member@Example.com' })
    )
    expect(mockSendPasswordResetEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'Member@Example.com',
        recipientName: 'Parish Member',
        actionUrl: expect.stringContaining(
          '/api/auth/callback?token_hash=recovery-hash&type=recovery'
        ),
      })
    )
  })

  it('keeps the public response generic when delivery fails', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: {
        id: 'user-1',
        email: 'member@example.com',
        full_name: null,
        is_active: true,
      },
      error: null,
    })
    mockGenerateLink.mockResolvedValue({
      data: { properties: { hashed_token: 'recovery-hash' } },
      error: null,
    })
    mockSendPasswordResetEmail.mockResolvedValue({ error: { message: 'delivery failed' } })

    expect(await requestPasswordReset(INITIAL_STATE, formData('member@example.com'))).toEqual({
      success: true,
      message: GENERIC_MESSAGE,
    })
  })
})
