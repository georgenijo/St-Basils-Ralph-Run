import 'server-only'

import { PasswordReset } from '@/emails/password-reset'
import { sendEmail } from '@/lib/email'
import { FROM_ADDRESS } from '@/lib/notifications'

const SUPPORT_EMAIL = 'contact@stbasilsboston.org'
const PASSWORD_RESET_SUBJECT = "Reset your St. Basil's Boston password"

interface SendPasswordResetEmailParams {
  email: string
  recipientName?: string
  actionUrl: string
}

/**
 * Sends the branded password reset email via Resend (our transactional stack),
 * replacing Supabase Auth's default mailer. Mirrors sendInviteEmail: the action
 * generates the recovery link with generateLink (no Supabase send) and builds a
 * server-verified callback URL from the hashed_token, so this is the only send
 * path — no duplicate Supabase email.
 */
export async function sendPasswordResetEmail({
  email,
  recipientName,
  actionUrl,
}: SendPasswordResetEmailParams) {
  return sendEmail({
    from: FROM_ADDRESS,
    to: email,
    subject: PASSWORD_RESET_SUBJECT,
    react: PasswordReset({
      recipientName,
      actionUrl,
      supportEmail: SUPPORT_EMAIL,
    }),
    metadata: {
      template: 'password-reset',
      actionUrl,
    },
  })
}
