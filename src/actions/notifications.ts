'use server'

import { revalidatePath } from 'next/cache'

import { logger } from '@/lib/logger'
import { withLogging } from '@/lib/logger.server'
import { createClient } from '@/lib/supabase/server'
import { updateNotificationPreferencesSchema } from '@/lib/validators/member'

type ActionState = {
  success: boolean
  message: string
  errors?: Record<string, string[]>
}

function checkboxValue(formData: FormData, key: string): boolean {
  const v = formData.get(key)
  return v === 'on' || v === 'true'
}

const log = logger.child({ scope: 'notifications' })

async function updateNotificationPreferencesImpl(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = updateNotificationPreferencesSchema.safeParse({
    payments: checkboxValue(formData, 'payments'),
    membership: checkboxValue(formData, 'membership'),
    shares: checkboxValue(formData, 'shares'),
    events: checkboxValue(formData, 'events'),
  })

  if (!parsed.success) {
    return {
      success: false,
      message: 'Validation failed',
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { success: false, message: 'Unauthorized' }

  const { error } = await supabase
    .from('profiles')
    .update({ notification_preferences: parsed.data })
    .eq('id', user.id)

  if (error) {
    log.error('notification_preferences.update_failed', { error })
    return { success: false, message: 'Failed to update preferences' }
  }

  revalidatePath('/member/settings')
  revalidatePath('/member')
  return { success: true, message: 'Preferences updated' }
}

export const updateNotificationPreferences = withLogging(
  'updateNotificationPreferences',
  updateNotificationPreferencesImpl
)
