'use server'

import { revalidatePath } from 'next/cache'

import { FamilyLinked } from '@/emails/family-linked'
import { sendEmail } from '@/lib/email'
import { logger } from '@/lib/logger'
import { withLogging } from '@/lib/logger.server'
import { FROM_ADDRESS } from '@/lib/notifications'
import { getSiteUrl } from '@/lib/site-url'
import { createClient } from '@/lib/supabase/server'
import {
  assignUserToFamilySchema,
  createFamilySchema,
  removeUserFromFamilySchema,
  updateFamilyAdminSchema,
} from '@/lib/validators/admin-family'

type ActionState = {
  success: boolean
  message: string
  errors?: Record<string, string[]>
}

type AuditAction =
  | 'family.create'
  | 'family.update'
  | 'family.assign_member'
  | 'family.remove_member'

const log = logger.child({ scope: 'admin-families' })

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { user: null, error: 'Unauthorized' as const }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return { user: null, error: 'Forbidden: admin access required' as const }
  }

  return { user, error: null }
}

function validationFailure(error: { flatten: () => { fieldErrors: unknown } }): ActionState {
  return {
    success: false,
    message: 'Validation failed',
    errors: error.flatten().fieldErrors as Record<string, string[]>,
  }
}

async function writeAudit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  actorId: string,
  action: AuditAction,
  targetUserId: string,
  metadata: Record<string, string | null>
) {
  // admin_audit_log requires a target auth user. Family-level create/update
  // entries target the acting admin and carry the actual family identity here;
  // member assignment/removal entries target the affected member.
  const { error } = await supabase.from('admin_audit_log').insert({
    actor_id: actorId,
    action,
    target_user_id: targetUserId,
    metadata,
  })

  if (error) {
    log.error('family.audit_write_failed', { error, action, targetUserId })
  }
}

function revalidateFamilyPaths() {
  revalidatePath('/admin/families')
  revalidatePath('/admin/users')
  revalidatePath('/admin/payments')
  revalidatePath('/member/family')
}

async function createFamilyImpl(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = createFamilySchema.safeParse({
    family_name: formData.get('family_name'),
    phone: formData.get('phone'),
    address: formData.get('address'),
    membership_status: formData.get('membership_status'),
    membership_type: formData.get('membership_type'),
    membership_expires_at: formData.get('membership_expires_at'),
  })

  if (!parsed.success) return validationFailure(parsed.error)

  const supabase = await createClient()
  const { user, error: authError } = await requireAdmin(supabase)
  if (!user) return { success: false, message: authError }

  const { data: family, error } = await supabase
    .from('families')
    .insert(parsed.data)
    .select('id')
    .single()

  if (error || !family) {
    log.error('family.create_failed', { error })
    return { success: false, message: 'Failed to create family' }
  }

  await writeAudit(supabase, user.id, 'family.create', user.id, {
    family_id: family.id,
    family_name: parsed.data.family_name,
    membership_status: parsed.data.membership_status,
    membership_type: parsed.data.membership_type,
  })

  revalidateFamilyPaths()
  return { success: true, message: 'Family created successfully' }
}

async function updateFamilyAdminImpl(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = updateFamilyAdminSchema.safeParse({
    family_id: formData.get('family_id'),
    membership_status: formData.get('membership_status'),
    membership_type: formData.get('membership_type'),
    membership_expires_at: formData.get('membership_expires_at'),
    head_of_household: formData.get('head_of_household'),
  })

  if (!parsed.success) return validationFailure(parsed.error)

  const supabase = await createClient()
  const { user, error: authError } = await requireAdmin(supabase)
  if (!user) return { success: false, message: authError }

  const { data: family, error: familyError } = await supabase
    .from('families')
    .select('id, family_name')
    .eq('id', parsed.data.family_id)
    .single()

  if (familyError || !family) {
    if (familyError) log.error('family.lookup_failed', { error: familyError })
    return { success: false, message: 'Family not found' }
  }

  if (parsed.data.head_of_household) {
    const { data: head } = await supabase
      .from('profiles')
      .select('family_id')
      .eq('id', parsed.data.head_of_household)
      .single()

    if (head?.family_id !== parsed.data.family_id) {
      return { success: false, message: 'Head of household must belong to this family' }
    }
  }

  const { error } = await supabase
    .from('families')
    .update({
      membership_status: parsed.data.membership_status,
      membership_type: parsed.data.membership_type,
      membership_expires_at: parsed.data.membership_expires_at,
      head_of_household: parsed.data.head_of_household,
    })
    .eq('id', parsed.data.family_id)

  if (error) {
    log.error('family.admin_update_failed', { error, familyId: parsed.data.family_id })
    return { success: false, message: 'Failed to update family' }
  }

  await writeAudit(supabase, user.id, 'family.update', user.id, {
    family_id: parsed.data.family_id,
    family_name: family.family_name,
    membership_status: parsed.data.membership_status,
    membership_type: parsed.data.membership_type,
    membership_expires_at: parsed.data.membership_expires_at,
    head_of_household: parsed.data.head_of_household,
  })

  revalidateFamilyPaths()
  return { success: true, message: 'Family updated successfully' }
}

async function assignUserToFamilyImpl(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = assignUserToFamilySchema.safeParse({
    family_id: formData.get('family_id'),
    user_id: formData.get('user_id'),
  })

  if (!parsed.success) return validationFailure(parsed.error)

  const supabase = await createClient()
  const { user, error: authError } = await requireAdmin(supabase)
  if (!user) return { success: false, message: authError }

  const { data: target, error: targetError } = await supabase
    .from('profiles')
    .select('id, email, full_name, family_id')
    .eq('id', parsed.data.user_id)
    .single()

  if (targetError || !target) {
    if (targetError) log.error('family.assignment_user_lookup_failed', { error: targetError })
    return { success: false, message: 'User not found' }
  }

  const { data: family, error: familyError } = await supabase
    .from('families')
    .select('id, family_name')
    .eq('id', parsed.data.family_id)
    .single()

  if (familyError || !family) {
    if (familyError) log.error('family.assignment_family_lookup_failed', { error: familyError })
    return { success: false, message: 'Family not found' }
  }

  if (target.family_id === parsed.data.family_id) {
    return { success: false, message: 'User is already assigned to this family' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ family_id: parsed.data.family_id })
    .eq('id', parsed.data.user_id)

  if (error) {
    log.error('family.assignment_failed', { error, targetUserId: parsed.data.user_id })
    return { success: false, message: 'Failed to assign user to family' }
  }

  await writeAudit(supabase, user.id, 'family.assign_member', parsed.data.user_id, {
    family_id: parsed.data.family_id,
    family_name: family.family_name,
    previous_family_id: target.family_id,
  })

  if (target.email) {
    try {
      const { error: emailError } = await sendEmail({
        from: FROM_ADDRESS,
        to: target.email,
        subject: `Your account was linked to the ${family.family_name} family`,
        react: FamilyLinked({
          fullName: target.full_name || target.email,
          familyName: family.family_name,
          siteUrl: getSiteUrl(),
        }),
        metadata: {
          kind: 'family-linked',
          user_id: parsed.data.user_id,
          family_id: parsed.data.family_id,
        },
      })

      if (emailError) {
        log.error('family.linked_email_failed', {
          error: emailError,
          targetUserId: parsed.data.user_id,
        })
      }
    } catch (emailError) {
      log.error('family.linked_email_failed', {
        error: emailError,
        targetUserId: parsed.data.user_id,
      })
    }
  }

  revalidateFamilyPaths()
  return { success: true, message: 'User assigned to family successfully' }
}

async function removeUserFromFamilyImpl(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = removeUserFromFamilySchema.safeParse({
    family_id: formData.get('family_id'),
    user_id: formData.get('user_id'),
  })

  if (!parsed.success) return validationFailure(parsed.error)

  const supabase = await createClient()
  const { user, error: authError } = await requireAdmin(supabase)
  if (!user) return { success: false, message: authError }

  const { data: target, error: targetError } = await supabase
    .from('profiles')
    .select('id, family_id')
    .eq('id', parsed.data.user_id)
    .single()

  if (targetError || !target) {
    if (targetError) log.error('family.removal_user_lookup_failed', { error: targetError })
    return { success: false, message: 'User not found' }
  }

  if (target.family_id !== parsed.data.family_id) {
    return { success: false, message: 'User is not assigned to this family' }
  }

  const { data: family, error: familyError } = await supabase
    .from('families')
    .select('family_name, head_of_household')
    .eq('id', parsed.data.family_id)
    .single()

  if (familyError || !family) {
    if (familyError) log.error('family.removal_family_lookup_failed', { error: familyError })
    return { success: false, message: 'Family not found' }
  }

  if (family.head_of_household === parsed.data.user_id) {
    return { success: false, message: 'Change or clear the head of household before removing them' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ family_id: null })
    .eq('id', parsed.data.user_id)
    .eq('family_id', parsed.data.family_id)

  if (error) {
    log.error('family.removal_failed', { error, targetUserId: parsed.data.user_id })
    return { success: false, message: 'Failed to remove user from family' }
  }

  await writeAudit(supabase, user.id, 'family.remove_member', parsed.data.user_id, {
    family_id: parsed.data.family_id,
    family_name: family.family_name,
  })

  revalidateFamilyPaths()
  return { success: true, message: 'User removed from family successfully' }
}

export const createFamily = withLogging('createFamily', createFamilyImpl)
export const updateFamilyAdmin = withLogging('updateFamilyAdmin', updateFamilyAdminImpl)
export const assignUserToFamily = withLogging('assignUserToFamily', assignUserToFamilyImpl)
export const removeUserFromFamily = withLogging('removeUserFromFamily', removeUserFromFamilyImpl)
