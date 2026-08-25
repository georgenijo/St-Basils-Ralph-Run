'use server'

import { logger } from '@/lib/logger'
import { withLogging } from '@/lib/logger.server'
import { sendPasswordResetEmail } from '@/lib/password-reset-email'
import { getSiteUrl } from '@/lib/site-url'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyTurnstile } from '@/lib/turnstile'
import { forgotPasswordSchema } from '@/lib/validators/user'

type ForgotPasswordState = {
  success: boolean
  message: string
  errors?: Record<string, string[]>
}

const log = logger.child({ scope: 'forgot-password' })
const GENERIC_SUCCESS_MESSAGE =
  'If an active portal account matches that email, a password reset link has been sent.'

function recoveryActionUrl(hashedToken: string): string {
  const params = new URLSearchParams({ token_hash: hashedToken, type: 'recovery' })
  return `${getSiteUrl()}/api/auth/callback?${params.toString()}`
}

async function requestPasswordResetImpl(
  prevState: ForgotPasswordState,
  formData: FormData
): Promise<ForgotPasswordState> {
  // Silently accept bot-filled submissions so the honeypot is not useful to bots.
  if (formData.get('website')) {
    return { success: true, message: GENERIC_SUCCESS_MESSAGE }
  }

  const parsed = forgotPasswordSchema.safeParse({ email: formData.get('email') })
  if (!parsed.success) {
    return {
      success: false,
      message: 'Validation failed',
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const turnstileToken = formData.get('cf-turnstile-response')
  if (typeof turnstileToken !== 'string' || !turnstileToken) {
    return { success: false, message: 'Please complete the CAPTCHA' }
  }
  if (!(await verifyTurnstile(turnstileToken))) {
    return { success: false, message: 'CAPTCHA verification failed' }
  }

  const adminClient = createAdminClient()
  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('id, email, full_name, is_active')
    .eq('email', parsed.data.email)
    .maybeSingle()

  // Every account lookup outcome gets the same public response. This prevents
  // the form from being used to discover portal membership.
  if (profileError) {
    log.error('password_reset.profile_lookup_failed', { error: profileError })
    return { success: true, message: GENERIC_SUCCESS_MESSAGE }
  }
  if (!profile?.email || !profile.is_active) {
    return { success: true, message: GENERIC_SUCCESS_MESSAGE }
  }

  const redirectTo = `${getSiteUrl()}/api/auth/callback?type=recovery`
  const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
    type: 'recovery',
    email: profile.email,
    options: { redirectTo },
  })
  const hashedToken = linkData?.properties?.hashed_token

  if (linkError || !hashedToken) {
    log.error('password_reset.link_generation_failed', {
      error: linkError,
      targetUserId: profile.id,
    })
    return { success: true, message: GENERIC_SUCCESS_MESSAGE }
  }

  try {
    const { error: emailError } = await sendPasswordResetEmail({
      email: profile.email,
      recipientName: profile.full_name ?? undefined,
      actionUrl: recoveryActionUrl(hashedToken),
    })
    if (emailError) {
      log.error('password_reset.email_failed', { error: emailError, targetUserId: profile.id })
    }
  } catch (error) {
    log.error('password_reset.email_failed', { error, targetUserId: profile.id })
  }

  return { success: true, message: GENERIC_SUCCESS_MESSAGE }
}

export const requestPasswordReset = withLogging('requestPasswordReset', requestPasswordResetImpl)
