'use server'

import { revalidatePath } from 'next/cache'

import { logger } from '@/lib/logger'
import { withLogging } from '@/lib/logger.server'
import { createClient } from '@/lib/supabase/server'
import { updateProfileSchema } from '@/lib/validators/member'

type ActionState = {
  success: boolean
  message: string
  errors?: Record<string, string[]>
}

const log = logger.child({ scope: 'profile' })

async function updateProfileImpl(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = updateProfileSchema.safeParse({
    full_name: formData.get('full_name'),
    phone: formData.get('phone'),
    avatar_url: formData.get('avatar_url'),
  })

  if (!parsed.success) {
    return {
      success: false,
      message: 'Please correct the highlighted fields',
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
    .update({
      full_name: parsed.data.full_name,
      phone: parsed.data.phone || null,
      avatar_url: parsed.data.avatar_url || null,
    })
    .eq('id', user.id)

  if (error) {
    log.error('profile.update_failed', { error })
    return { success: false, message: 'Failed to update profile' }
  }

  revalidatePath('/member', 'layout')
  revalidatePath('/member/settings')
  return { success: true, message: 'Profile updated' }
}

export const updateProfile = withLogging('updateProfile', updateProfileImpl)
