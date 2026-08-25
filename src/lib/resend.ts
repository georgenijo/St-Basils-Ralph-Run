import { Resend } from 'resend'

import { logger } from '@/lib/logger'
import { isMockEmailTransportEnabled } from '@/lib/test-support'

const log = logger.child({ scope: 'resend' })

let _resend: Resend | null = null

function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY)
  }
  return _resend
}

export const resend = new Proxy({} as Resend, {
  get(_, prop) {
    return getResend()[prop as keyof Resend]
  },
})

export async function addContactToAudience(email: string): Promise<void> {
  if (isMockEmailTransportEnabled()) return

  try {
    await getResend().contacts.create({ email })
  } catch (error) {
    log.error('resend.contact_add_failed', { error })
  }
}

export async function removeContactFromAudience(email: string): Promise<void> {
  if (isMockEmailTransportEnabled()) return

  try {
    await getResend().contacts.remove({ email })
  } catch (error) {
    log.error('resend.contact_remove_failed', { error })
  }
}
