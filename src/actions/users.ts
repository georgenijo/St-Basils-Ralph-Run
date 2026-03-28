'use server'

import { revalidatePath } from 'next/cache'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { inviteUserSchema, updateRoleSchema } from '@/lib/validators/user'

type ActionState = {
  success: boolean
  message: string
  errors?: Record<string, string[]>
}

export async function inviteUser(prevState: ActionState, formData: FormData): Promise<ActionState> {
  // 1. Validate with Zod
  const parsed = inviteUserSchema.safeParse({
    email: formData.get('email'),
    full_name: formData.get('full_name'),
    role: formData.get('role'),
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
  if (!user) return { success: false, message: 'Unauthorized' }

  // 3. Admin check
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return { success: false, message: 'Forbidden: admin access required' }
  }

  // 4. Invite user via admin client (service role required for inviteUserByEmail)
  const adminClient = createAdminClient()
  const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
    parsed.data.email,
    {
      data: { full_name: parsed.data.full_name },
    }
  )

  if (inviteError) {
    if (inviteError.message?.toLowerCase().includes('already')) {
      return {
        success: false,
        message: 'A user with this email already exists',
        errors: { email: ['This email is already registered'] },
      }
    }
    return { success: false, message: 'Failed to invite user' }
  }

  const newUserId = inviteData.user.id

  // 5. If role is admin, update the profile (handle_new_user trigger defaults to "member")
  if (parsed.data.role === 'admin') {
    const { error: roleError } = await adminClient
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', newUserId)

    if (roleError) {
      return { success: false, message: 'User invited but failed to set admin role' }
    }
  }

  // 6. Write audit log (authenticated client — RLS enforces admin-only inserts)
  await supabase.from('admin_audit_log').insert({
    actor_id: user.id,
    action: 'user.invite',
    target_user_id: newUserId,
    metadata: {
      email: parsed.data.email,
      full_name: parsed.data.full_name,
      role: parsed.data.role,
    },
  })

  // 7. Revalidate and return
  revalidatePath('/admin/users')
  return { success: true, message: 'Invitation sent successfully' }
}

export async function updateUserRole(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  // 1. Validate with Zod
  const parsed = updateRoleSchema.safeParse({
    user_id: formData.get('user_id'),
    role: formData.get('role'),
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
  if (!user) return { success: false, message: 'Unauthorized' }

  // 3. Admin check
  const { data: actorProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (actorProfile?.role !== 'admin') {
    return { success: false, message: 'Forbidden: admin access required' }
  }

  // 4. Self-protection
  if (parsed.data.user_id === user.id) {
    return { success: false, message: 'You cannot change your own role' }
  }

  // 5. Fetch target user's current role for audit metadata
  const { data: targetProfile, error: fetchError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', parsed.data.user_id)
    .single()

  if (fetchError || !targetProfile) {
    return { success: false, message: 'User not found' }
  }

  if (targetProfile.role === parsed.data.role) {
    return { success: false, message: `User already has the "${parsed.data.role}" role` }
  }

  // 6. Update role
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ role: parsed.data.role })
    .eq('id', parsed.data.user_id)

  if (updateError) {
    return { success: false, message: 'Failed to update role' }
  }

  // 7. Write audit log (authenticated client — RLS enforces admin-only inserts)
  await supabase.from('admin_audit_log').insert({
    actor_id: user.id,
    action: 'user.role_change',
    target_user_id: parsed.data.user_id,
    metadata: {
      old_role: targetProfile.role,
      new_role: parsed.data.role,
    },
  })

  // 8. Revalidate and return
  revalidatePath('/admin/users')
  return { success: true, message: 'Role updated successfully' }
}
