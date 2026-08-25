'use server'

import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'
import { verifyTurnstile } from '@/lib/turnstile'
import { contactSchema } from '@/lib/validators/contact'
import { ContactNotification } from '@/emails/contact-notification'
import { logger } from '@/lib/logger'
import { withLogging } from '@/lib/logger.server'

type ContactState = {
  success: boolean
  message: string
  errors?: Record<string, string[]>
}

const log = logger.child({ scope: 'contact' })

async function submitContactImpl(
  prevState: ContactState,
  formData: FormData
): Promise<ContactState> {
  // 1. Honeypot check
  const honeypot = formData.get('website')
  if (honeypot) {
    return { success: false, message: 'Spam detected' }
  }

  // 2. Validate with Zod
  const parsed = contactSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    subject: formData.get('subject'),
    message: formData.get('message'),
  })

  if (!parsed.success) {
    return {
      success: false,
      message: 'Validation failed',
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  // 3. Turnstile CAPTCHA verification
  const turnstileToken = formData.get('cf-turnstile-response') as string
  if (!turnstileToken) {
    return { success: false, message: 'Please complete the CAPTCHA' }
  }

  const turnstileValid = await verifyTurnstile(turnstileToken)
  if (!turnstileValid) {
    return { success: false, message: 'CAPTCHA verification failed' }
  }

  // 4. Send email via Resend
  const { error: emailError } = await sendEmail({
    from: "St. Basil's Church <noreply@stbasilsboston.org>",
    to: 'info@stbasilsboston.org',
    subject: `Contact Form: ${parsed.data.subject}`,
    react: ContactNotification({ ...parsed.data }),
    metadata: {
      template: 'contact-notification',
      name: parsed.data.name,
      email: parsed.data.email,
      subject: parsed.data.subject,
    },
  })

  if (emailError) {
    log.error('contact.email_failed', { error: emailError })
    return { success: false, message: 'Failed to send message. Please try again.' }
  }

  // 5. Store in Supabase
  const supabase = await createClient()
  const { error: dbError } = await supabase.from('contact_submissions').insert({
    name: parsed.data.name,
    email: parsed.data.email,
    subject: parsed.data.subject,
    message: parsed.data.message,
  })

  if (dbError) {
    // Email was sent successfully, so still return success to the user
    // but log the DB error server-side
    log.error('contact.storage_failed', { error: dbError })
  }

  return { success: true, message: 'Message sent successfully. We will get back to you soon.' }
}

export const submitContact = withLogging('submitContact', submitContactImpl)
