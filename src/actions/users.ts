'use server'

import { revalidatePath } from 'next/cache'

import { sendInviteEmail } from '@/lib/invite-email'
import { logger } from '@/lib/logger'
import { withLogging } from '@/lib/logger.server'
import { sendPasswordResetEmail } from '@/lib/password-reset-email'
import { getSiteUrl } from '@/lib/site-url'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { inviteUserSchema, updateRoleSchema, userActionSchema } from '@/lib/validators/user'

type ActionState = {
  success: boolean
  message: string
  errors?: Record<string, string[]>
}

const log = logger.child({ scope: 'users' })

function inviteActionUrl(hashedToken: string, type: 'invite' | 'recovery'): string {
  const base = getSiteUrl()
  const params = new URLSearchParams({ token_hash: hashedToken, type })
  return `${base}/api/auth/callback?${params.toString()}`
}

async function rollbackInvitedUser(
  adminClient: ReturnType<typeof createAdminClient>,
  userId: string
): Promise<void> {
  try {
    const { error } = await adminClient.auth.admin.deleteUser(userId)
    if (error) {
      log.error('user.invite_rollback_failed', { error, targetUserId: userId })
    }
  } catch (error) {
    log.error('user.invite_rollback_failed', { error, targetUserId: userId })
  }
}

async function inviteUserImpl(prevState: ActionState, formData: FormData): Promise<ActionState> {
  // 1. Validate with Zod
  const parsed = inviteUserSchema.safeParse({
    email: formData.get('email'),
    full_name: formData.get('full_name'),
    role: formData.get('role'),
    family_id: formData.get('family_id'),
    newsletter_opt_in: formData.get('newsletter_opt_in'),
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

  // 3. Admin check (also grab inviter's name for the branded email)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return { success: false, message: 'Forbidden: admin access required' }
  }

  const inviterName = profile?.full_name || user.email || "St. Basil's Boston"

  // 4. Prove the optional family is visible to this authenticated admin before
  //    creating an auth user. This prevents a forged/stale family UUID from
  //    leaving behind an unusable pending account.
  if (parsed.data.family_id) {
    const { data: family, error: familyError } = await supabase
      .from('families')
      .select('id')
      .eq('id', parsed.data.family_id)
      .single()

    if (familyError || !family) {
      if (familyError) {
        log.error('user.invite_family_lookup_failed', {
          error: familyError,
          familyId: parsed.data.family_id,
        })
      }
      return {
        success: false,
        message: 'Selected family was not found',
        errors: { family_id: ['Choose an existing family'] },
      }
    }
  }

  // 5. Create the user + generate the invite token WITHOUT sending Supabase's
  //    default mailer, then send our own branded email via Resend. We build the
  //    link from the hashed_token (verified server-side via verifyOtp in the auth
  //    callback) rather than properties.action_link — action_link points at
  //    Supabase's /verify endpoint which redirects with an implicit-flow
  //    #access_token hash the server callback cannot read.
  const adminClient = createAdminClient()
  const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
    type: 'invite',
    email: parsed.data.email,
    options: {
      data: { full_name: parsed.data.full_name },
    },
  })

  if (linkError) {
    log.error('user.invite_link_failed', { error: linkError })
    const msg = linkError.message?.toLowerCase() ?? ''
    if (msg.includes('already') || msg.includes('registered') || msg.includes('exists')) {
      return {
        success: false,
        message: 'A user with this email already exists',
        errors: { email: ['This email is already registered'] },
      }
    }
    return { success: false, message: 'Failed to invite user' }
  }

  const newUserId = linkData.user?.id
  const hashedToken = linkData.properties?.hashed_token
  if (!newUserId || !hashedToken) {
    log.error('user.invite_link_incomplete', { hasUserId: !!newUserId, hasToken: !!hashedToken })
    if (newUserId) await rollbackInvitedUser(adminClient, newUserId)
    return { success: false, message: 'Failed to invite user' }
  }
  const actionUrl = inviteActionUrl(hashedToken, 'invite')

  // 6. Apply non-default profile fields. handle_new_user defaults the role to
  //    member; the admin client is already required here for invited-user setup.
  const profileUpdates: { role?: 'admin'; family_id?: string } = {}
  if (parsed.data.role === 'admin') profileUpdates.role = 'admin'
  if (parsed.data.family_id) profileUpdates.family_id = parsed.data.family_id

  if (Object.keys(profileUpdates).length > 0) {
    const { error: profileError } = await adminClient
      .from('profiles')
      .update(profileUpdates)
      .eq('id', newUserId)

    if (profileError) {
      log.error('user.invite_profile_update_failed', {
        error: profileError,
        targetUserId: newUserId,
      })
      await rollbackInvitedUser(adminClient, newUserId)

      const failedSetting =
        parsed.data.role === 'admin' && parsed.data.family_id
          ? 'the selected role and family'
          : parsed.data.role === 'admin'
            ? 'the admin role'
            : 'the selected family'
      return {
        success: false,
        message: `Invitation could not be completed while applying ${failedSetting}. Please check the Users list before retrying.`,
      }
    }
  }

  // 7. Auto-subscribe to newsletter if opted in. ignoreDuplicates preserves
  //    any prior unsubscribe / confirmation state on an existing row.
  if (parsed.data.newsletter_opt_in) {
    const { error: newsletterError } = await adminClient.from('email_subscribers').upsert(
      {
        email: parsed.data.email,
        confirmed: true,
        confirmed_at: new Date().toISOString(),
      },
      { onConflict: 'email', ignoreDuplicates: true }
    )
    if (newsletterError) {
      log.error('user.invite_newsletter_sync_failed', {
        error: newsletterError,
        targetUserId: newUserId,
      })
    }
  }

  // 8. Send the branded invite email via Resend. Non-fatal: the user already
  //    exists, so on failure report it and let the admin resend rather than
  //    leaving the account in a half-created state.
  let inviteEmailError: unknown = null
  try {
    const { error } = await sendInviteEmail({
      email: parsed.data.email,
      inviteeName: parsed.data.full_name,
      inviterName,
      role: parsed.data.role,
      actionUrl,
    })
    inviteEmailError = error
  } catch (error) {
    inviteEmailError = error
  }

  // 9. Write audit log (authenticated client — RLS enforces admin-only inserts)
  const { error: auditError } = await supabase.from('admin_audit_log').insert({
    actor_id: user.id,
    action: 'user.invite',
    target_user_id: newUserId,
    metadata: {
      email: parsed.data.email,
      full_name: parsed.data.full_name,
      role: parsed.data.role,
      family_id: parsed.data.family_id,
      newsletter_opt_in: parsed.data.newsletter_opt_in,
    },
  })
  if (auditError)
    log.error('audit.user_invite_failed', { error: auditError, targetUserId: newUserId })

  // 10. Revalidate and return
  revalidatePath('/admin/users')
  revalidatePath('/admin/families')
  revalidatePath('/admin/subscribers')

  if (inviteEmailError) {
    log.error('user.invite_email_failed', { error: inviteEmailError, targetUserId: newUserId })
    return {
      success: false,
      message:
        'User created, but the invitation email failed to send. Use "Resend invite" to try again.',
    }
  }

  return { success: true, message: 'Invitation sent successfully' }
}

async function updateUserRoleImpl(
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
    if (fetchError) log.error('user.role_target_lookup_failed', { error: fetchError })
    return { success: false, message: 'User not found' }
  }

  if (targetProfile.role === parsed.data.role) {
    return { success: false, message: `User already has the "${parsed.data.role}" role` }
  }

  // 6. Update role (use admin client to bypass recursive RLS on profiles self-update policy)
  const adminClient = createAdminClient()
  const { error: updateError } = await adminClient
    .from('profiles')
    .update({ role: parsed.data.role })
    .eq('id', parsed.data.user_id)

  if (updateError) {
    log.error('user.role_update_failed', { error: updateError, targetUserId: parsed.data.user_id })
    return { success: false, message: 'Failed to update role' }
  }

  // 7. Write audit log (authenticated client — RLS enforces admin-only inserts)
  const { error: auditError } = await supabase.from('admin_audit_log').insert({
    actor_id: user.id,
    action: 'user.role_change',
    target_user_id: parsed.data.user_id,
    metadata: {
      old_role: targetProfile.role,
      new_role: parsed.data.role,
    },
  })
  if (auditError) {
    log.error('audit.user_role_change_failed', {
      error: auditError,
      targetUserId: parsed.data.user_id,
    })
  }

  // 8. Revalidate and return
  revalidatePath('/admin/users')
  return { success: true, message: 'Role updated successfully' }
}

async function deactivateUserImpl(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  // 1. Validate with Zod
  const parsed = userActionSchema.safeParse({
    user_id: formData.get('user_id'),
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

  // 4. Self-protection: cannot deactivate yourself
  if (user.id === parsed.data.user_id) {
    return { success: false, message: 'You cannot deactivate your own account' }
  }

  const adminClient = createAdminClient()

  // 5. Set is_active = false on the profile
  const { error: profileError } = await adminClient
    .from('profiles')
    .update({ is_active: false })
    .eq('id', parsed.data.user_id)

  if (profileError) {
    log.error('user.deactivate_profile_failed', {
      error: profileError,
      targetUserId: parsed.data.user_id,
    })
    return { success: false, message: 'Failed to deactivate user profile' }
  }

  // 6. Ban in Supabase auth (invalidates sessions)
  const { error: banError } = await adminClient.auth.admin.updateUserById(parsed.data.user_id, {
    ban_duration: '876000h',
  })

  if (banError) {
    log.error('user.deactivate_auth_failed', { error: banError, targetUserId: parsed.data.user_id })
    // Rollback profile change
    await adminClient.from('profiles').update({ is_active: true }).eq('id', parsed.data.user_id)
    return { success: false, message: 'Failed to ban user in auth' }
  }

  // 7. Audit log (non-fatal)
  const { error: auditError } = await supabase.from('admin_audit_log').insert({
    actor_id: user.id,
    action: 'user.deactivate',
    target_user_id: parsed.data.user_id,
  })

  if (auditError) {
    log.error('audit.user_deactivate_failed', {
      error: auditError,
      targetUserId: parsed.data.user_id,
    })
  }

  // 8. Revalidate and return
  revalidatePath('/admin/users')
  return { success: true, message: 'User deactivated successfully' }
}

async function reactivateUserImpl(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  // 1. Validate with Zod
  const parsed = userActionSchema.safeParse({
    user_id: formData.get('user_id'),
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

  const adminClient = createAdminClient()

  // 4. Set is_active = true on the profile
  const { error: profileError } = await adminClient
    .from('profiles')
    .update({ is_active: true })
    .eq('id', parsed.data.user_id)

  if (profileError) {
    log.error('user.reactivate_profile_failed', {
      error: profileError,
      targetUserId: parsed.data.user_id,
    })
    return { success: false, message: 'Failed to reactivate user profile' }
  }

  // 5. Unban in Supabase auth
  const { error: unbanError } = await adminClient.auth.admin.updateUserById(parsed.data.user_id, {
    ban_duration: 'none',
  })

  if (unbanError) {
    log.error('user.reactivate_auth_failed', {
      error: unbanError,
      targetUserId: parsed.data.user_id,
    })
    // Rollback profile change
    await adminClient.from('profiles').update({ is_active: false }).eq('id', parsed.data.user_id)
    return { success: false, message: 'Failed to unban user in auth' }
  }

  // 6. Audit log (non-fatal)
  const { error: auditError } = await supabase.from('admin_audit_log').insert({
    actor_id: user.id,
    action: 'user.reactivate',
    target_user_id: parsed.data.user_id,
  })

  if (auditError) {
    log.error('audit.user_reactivate_failed', {
      error: auditError,
      targetUserId: parsed.data.user_id,
    })
  }

  // 7. Revalidate and return
  revalidatePath('/admin/users')
  return { success: true, message: 'User reactivated successfully' }
}

async function sendPasswordResetImpl(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  // 1. Validate with Zod
  const parsed = userActionSchema.safeParse({
    user_id: formData.get('user_id'),
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

  // 3. Look up the target user's email (and name for the branded greeting)
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('email, full_name')
    .eq('id', parsed.data.user_id)
    .single()

  if (profileError || !profile?.email) {
    log.error('user.password_reset_profile_lookup_failed', {
      error: profileError,
      hasProfile: !!profile,
      hasEmail: !!profile?.email,
      targetUserId: parsed.data.user_id,
    })
    return { success: false, message: 'Could not find email for this user' }
  }

  // 4. Generate a recovery link WITHOUT sending Supabase's default mailer, then
  //    send our own branded email via Resend — mirrors inviteUser / resendInvite.
  //    We build the link from hashed_token (verified server-side via verifyOtp in
  //    the auth callback) rather than the Supabase action_link, so the link in the
  //    email points at our church-domain callback. redirectTo is unchanged from
  //    #245 and still derived from getSiteUrl() (preview vs production).
  const adminClient = createAdminClient()
  const redirectTo = `${getSiteUrl()}/api/auth/callback?type=recovery`
  const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
    type: 'recovery',
    email: profile.email,
    options: { redirectTo },
  })

  if (linkError || !linkData.properties?.hashed_token) {
    log.error('user.password_reset_link_failed', {
      error: linkError,
      targetUserId: parsed.data.user_id,
    })
    return { success: false, message: 'Failed to send password reset email' }
  }

  const actionUrl = inviteActionUrl(linkData.properties.hashed_token, 'recovery')

  // Send the branded password reset email. This is the only send path (we did not
  // call resetPasswordForEmail), so there is no duplicate Supabase email.
  let resetEmailError: unknown = null
  try {
    const { error } = await sendPasswordResetEmail({
      email: profile.email,
      recipientName: profile.full_name ?? undefined,
      actionUrl,
    })
    resetEmailError = error
  } catch (error) {
    resetEmailError = error
  }

  if (resetEmailError) {
    log.error('user.password_reset_email_failed', {
      error: resetEmailError,
      targetUserId: parsed.data.user_id,
    })
    return { success: false, message: 'Failed to send password reset email' }
  }

  // 5. Audit log (non-fatal)
  const { error: auditError } = await supabase.from('admin_audit_log').insert({
    actor_id: user.id,
    action: 'user.password_reset',
    target_user_id: parsed.data.user_id,
    metadata: { email: profile.email },
  })

  if (auditError) {
    log.error('audit.user_password_reset_failed', {
      error: auditError,
      targetUserId: parsed.data.user_id,
    })
  }

  // 6. Revalidate and return
  revalidatePath('/admin/users')
  return { success: true, message: 'Password reset email sent successfully' }
}

async function resendInviteImpl(prevState: ActionState, formData: FormData): Promise<ActionState> {
  // 1. Validate with Zod
  const parsed = userActionSchema.safeParse({
    user_id: formData.get('user_id'),
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

  // 3. Admin check (also grab inviter's name for the branded email)
  const { data: actorProfile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  if (actorProfile?.role !== 'admin') {
    return { success: false, message: 'Forbidden: admin access required' }
  }

  // 4. Look up the target user's details
  const { data: target, error: targetError } = await supabase
    .from('profiles')
    .select('email, full_name, role')
    .eq('id', parsed.data.user_id)
    .single()

  if (targetError || !target?.email) {
    if (targetError) log.error('user.invite_target_lookup_failed', { error: targetError })
    return { success: false, message: 'Could not find email for this user' }
  }

  const adminClient = createAdminClient()

  // 5. Only resend to users who have not yet accepted (never signed in).
  //    last_sign_in_at is a server-trusted signal the client cannot mutate.
  const { data: authUser, error: authUserError } = await adminClient.auth.admin.getUserById(
    parsed.data.user_id
  )
  if (authUserError || !authUser?.user) {
    if (authUserError) log.error('user.invite_auth_lookup_failed', { error: authUserError })
    return { success: false, message: 'Could not load user account' }
  }
  if (authUser.user.last_sign_in_at) {
    return { success: false, message: 'This user has already accepted their invitation' }
  }

  // 6. Generate a fresh link. For an existing user, type 'recovery' is the type
  //    that issues a new link (type 'invite' rejects existing users); the auth
  //    callback routes recovery → /set-password, so the invitee still sets a
  //    password and lands logged in.
  const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
    type: 'recovery',
    email: target.email,
  })

  if (linkError || !linkData.properties?.hashed_token) {
    log.error('user.invite_regenerate_link_failed', {
      error: linkError,
      targetUserId: parsed.data.user_id,
    })
    return { success: false, message: 'Failed to generate invite link' }
  }

  // 7. Send the same branded invite email
  const inviterName = actorProfile?.full_name || user.email || "St. Basil's Boston"
  let inviteEmailError: unknown = null
  try {
    const { error } = await sendInviteEmail({
      email: target.email,
      inviteeName: target.full_name || target.email,
      inviterName,
      role: target.role as 'admin' | 'member',
      actionUrl: inviteActionUrl(linkData.properties.hashed_token, 'recovery'),
    })
    inviteEmailError = error
  } catch (error) {
    inviteEmailError = error
  }

  // 8. Audit log (non-fatal)
  const { error: auditError } = await supabase.from('admin_audit_log').insert({
    actor_id: user.id,
    action: 'user.invite.resend',
    target_user_id: parsed.data.user_id,
    metadata: { email: target.email, role: target.role },
  })

  if (auditError) {
    log.error('audit.user_invite_resend_failed', {
      error: auditError,
      targetUserId: parsed.data.user_id,
    })
  }

  // 9. Revalidate and return
  revalidatePath('/admin/users')

  if (inviteEmailError) {
    log.error('user.invite_resend_email_failed', {
      error: inviteEmailError,
      targetUserId: parsed.data.user_id,
    })
    return { success: false, message: 'Failed to send invitation email' }
  }

  return { success: true, message: 'Invitation resent successfully' }
}

// ─── Audit Log Query ─────────────────────────────────────────────────

export type AuditLogEntry = {
  id: string
  action: string
  actor_name: string
  metadata: Record<string, string>
  created_at: string
}

async function fetchUserAuditLogImpl(userId: string): Promise<AuditLogEntry[]> {
  const supabase = await createClient()

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  // Fetch audit entries for the target user
  const { data: entries, error } = await supabase
    .from('admin_audit_log')
    .select('id, action, actor_id, metadata, created_at')
    .eq('target_user_id', userId)
    .order('created_at', { ascending: false })

  if (error || !entries) {
    if (error) {
      log.error('audit.user_history_fetch_failed', { error, targetUserId: userId })
    }
    return []
  }

  // Collect unique actor IDs to resolve names
  const actorIds = [...new Set(entries.map((e) => e.actor_id))]
  const { data: actors } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', actorIds)

  const actorMap = new Map(actors?.map((a) => [a.id, a.full_name ?? 'Unknown']) ?? [])

  return entries.map((e) => ({
    id: e.id,
    action: e.action,
    actor_name: actorMap.get(e.actor_id) ?? 'Unknown',
    metadata: (e.metadata ?? {}) as Record<string, string>,
    created_at: e.created_at,
  }))
}

export const inviteUser = withLogging('inviteUser', inviteUserImpl)
export const updateUserRole = withLogging('updateUserRole', updateUserRoleImpl)
export const deactivateUser = withLogging('deactivateUser', deactivateUserImpl)
export const reactivateUser = withLogging('reactivateUser', reactivateUserImpl)
export const sendPasswordReset = withLogging('sendPasswordReset', sendPasswordResetImpl)
export const resendInvite = withLogging('resendInvite', resendInviteImpl)
export const fetchUserAuditLog = withLogging('fetchUserAuditLog', fetchUserAuditLogImpl)
