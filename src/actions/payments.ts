'use server'

import { revalidatePath } from 'next/cache'

import { logger } from '@/lib/logger'
import { withLogging } from '@/lib/logger.server'
import { createClient } from '@/lib/supabase/server'
import { submitPaymentSchema } from '@/lib/validators/member'

type ActionState = {
  success: boolean
  message: string
  errors?: Record<string, string[]>
}

const log = logger.child({ scope: 'payments' })

async function submitPaymentImpl(prevState: ActionState, formData: FormData): Promise<ActionState> {
  // 1. Validate with Zod
  const parsed = submitPaymentSchema.safeParse({
    type: formData.get('type'),
    amount: formData.get('amount'),
    method: formData.get('method'),
    reference_memo: formData.get('reference_memo'),
    note: formData.get('note') || '',
    related_event_id: formData.get('related_event_id') || '',
    related_share_id: formData.get('related_share_id') || '',
  })

  if (!parsed.success) {
    return {
      success: false,
      message: 'Validation failed',
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  // 2. Auth check
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, message: 'Unauthorized' }
  }

  // 3. Profile + family lookup
  const { data: profile } = await supabase
    .from('profiles')
    .select('family_id')
    .eq('id', user.id)
    .single()

  if (!profile?.family_id) {
    return {
      success: false,
      message: 'You must belong to a family to submit a payment',
    }
  }

  // 4. Insert pending payment
  const { error } = await supabase.from('payments').insert({
    family_id: profile.family_id,
    type: parsed.data.type,
    amount: parsed.data.amount,
    method: parsed.data.method,
    reference_memo: parsed.data.reference_memo,
    note: parsed.data.note || null,
    recorded_by: user.id,
    status: 'pending',
    related_event_id: parsed.data.type === 'event' ? parsed.data.related_event_id : null,
    related_share_id: parsed.data.type === 'share' ? parsed.data.related_share_id : null,
  })

  if (error) {
    log.error('payment.submit_failed', { error })
    return { success: false, message: 'Failed to submit payment' }
  }

  // 5. Revalidate and return
  revalidatePath('/member')
  return {
    success: true,
    message: 'Payment submitted — pending confirmation (usually 1-2 business days)',
  }
}

export const submitPayment = withLogging('submitPayment', submitPaymentImpl)
