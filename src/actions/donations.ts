'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { recordDonationSchema } from '@/lib/validators/member'

type ActionState = {
  success: boolean
  message: string
  errors?: Record<string, string[]>
}

export async function recordDonation(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  // 1. Validate with Zod
  const parsed = recordDonationSchema.safeParse({
    donation_type: formData.get('donation_type'),
    amount: formData.get('amount'),
    note: formData.get('note') || '',
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
      message: 'You must belong to a family to record a donation',
    }
  }

  // 4. Compose note — store donation type as [type] prefix
  const userNote = parsed.data.note?.trim()
  const composedNote = userNote
    ? `[${parsed.data.donation_type}] ${userNote}`
    : `[${parsed.data.donation_type}]`

  // 5. Insert payment record
  const { error } = await supabase.from('payments').insert({
    family_id: profile.family_id,
    type: 'donation',
    amount: parsed.data.amount,
    note: composedNote,
    recorded_by: user.id,
  })

  if (error) {
    console.error('[recordDonation] DB insert failed:', error.code, error.message)
    return { success: false, message: 'Failed to record donation' }
  }

  // 6. Revalidate and return
  revalidatePath('/member')
  return { success: true, message: 'Donation recorded successfully' }
}
