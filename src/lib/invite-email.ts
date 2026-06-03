import 'server-only'

import { InviteUser } from '@/emails/invite-user'
import { sendEmail } from '@/lib/email'
import { FROM_ADDRESS } from '@/lib/notifications'

const SUPPORT_EMAIL = 'contact@stbasilsboston.org'
const INVITE_SUBJECT = "You're invited to join St. Basil's Boston portal"

interface SendInviteEmailParams {
  email: string
  inviteeName: string
  inviterName: string
  role: 'admin' | 'member'
  actionUrl: string
}

/**
 * Sends the branded invite email via Resend (our transactional stack), replacing
 * Supabase Auth's default mailer. Both the initial invite and the resend-invite
 * paths call this so neither emits the unbranded Supabase email.
 */
export async function sendInviteEmail({
  email,
  inviteeName,
  inviterName,
  role,
  actionUrl,
}: SendInviteEmailParams) {
  return sendEmail({
    from: FROM_ADDRESS,
    to: email,
    subject: INVITE_SUBJECT,
    react: InviteUser({
      inviteeName,
      inviterName,
      role,
      actionUrl,
      supportEmail: SUPPORT_EMAIL,
    }),
    metadata: {
      template: 'invite-user',
      actionUrl,
      role,
    },
  })
}
