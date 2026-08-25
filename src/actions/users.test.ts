import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Mocks ---

const mockGetUser = vi.fn()
const mockFrom = vi.fn()
const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockEq = vi.fn()
const mockSingle = vi.fn()
const mockSelect = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: { getUser: mockGetUser },
      from: mockFrom,
    })
  ),
}))

const mockAdminFrom = vi.fn()
const mockGenerateLink = vi.fn()
const mockDeleteUser = vi.fn()
const mockGetUserById = vi.fn()
const mockResetPasswordForEmail = vi.fn()
const mockAdminUpdate = vi.fn()
const mockAdminEq = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    auth: {
      admin: {
        generateLink: mockGenerateLink,
        deleteUser: mockDeleteUser,
        getUserById: mockGetUserById,
      },
      resetPasswordForEmail: mockResetPasswordForEmail,
    },
    from: mockAdminFrom,
  })),
}))

const mockSendInviteEmail = vi.fn()
vi.mock('@/lib/invite-email', () => ({
  sendInviteEmail: (...args: unknown[]) => mockSendInviteEmail(...args),
}))

const mockSendPasswordResetEmail = vi.fn()
vi.mock('@/lib/password-reset-email', () => ({
  sendPasswordResetEmail: (...args: unknown[]) => mockSendPasswordResetEmail(...args),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import { inviteUser, resendInvite, sendPasswordReset, updateUserRole } from '@/actions/users'

// --- Helpers ---

const ADMIN_ID = '550e8400-e29b-41d4-a716-446655440001'
const TARGET_ID = '550e8400-e29b-41d4-a716-446655440002'
const INITIAL_STATE = { success: false, message: '' }

// generateLink success payload: returns the created user + the hashed token we
// build the (server-verified) callback link from.
const LINK_SUCCESS = {
  data: {
    user: { id: TARGET_ID },
    properties: { hashed_token: 'hash123', action_link: 'https://supabase.co/verify' },
  },
  error: null,
}

function makeFormData(entries: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [k, v] of Object.entries(entries)) fd.append(k, v)
  return fd
}

function mockAuthenticatedAdmin() {
  mockGetUser.mockResolvedValue({ data: { user: { id: ADMIN_ID } } })
  // Admin check query chain: from('profiles').select('role').eq('id', ...).single()
  // We need separate chains for different from() calls, so we track call order
  let fromCallCount = 0
  mockFrom.mockImplementation((table: string) => {
    fromCallCount++
    if (table === 'profiles' && fromCallCount === 1) {
      // Admin check
      return {
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: { role: 'admin' }, error: null }),
          }),
        }),
      }
    }
    if (table === 'profiles') {
      // Target profile fetch or update
      return {
        select: mockSelect,
        update: mockUpdate,
      }
    }
    if (table === 'admin_audit_log') {
      return { insert: mockInsert }
    }
    return { select: mockSelect, insert: mockInsert, update: mockUpdate }
  })
}

function mockFamilyLookup(data: { id: string } | null, error: unknown = null) {
  mockSingle.mockResolvedValue({ data, error })
  mockEq.mockReturnValue({ single: mockSingle })
  mockSelect.mockReturnValue({ eq: mockEq })
}

// --- Tests ---

describe('inviteUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSendInviteEmail.mockResolvedValue({ data: {}, error: null })
    mockDeleteUser.mockResolvedValue({ data: {}, error: null })
  })

  it('returns validation errors for invalid input', async () => {
    const fd = makeFormData({ email: 'bad', full_name: '', role: 'superadmin' })
    const result = await inviteUser(INITIAL_STATE, fd)

    expect(result.success).toBe(false)
    expect(result.message).toBe('Validation failed')
    expect(result.errors).toBeDefined()
  })

  it('returns Unauthorized when no user session', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const fd = makeFormData({ email: 'new@example.com', full_name: 'New User', role: 'member' })
    const result = await inviteUser(INITIAL_STATE, fd)

    expect(result.success).toBe(false)
    expect(result.message).toBe('Unauthorized')
  })

  it('returns Forbidden when caller is not admin', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: ADMIN_ID } } })
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: { role: 'member' }, error: null }),
        }),
      }),
    })

    const fd = makeFormData({ email: 'new@example.com', full_name: 'New User', role: 'member' })
    const result = await inviteUser(INITIAL_STATE, fd)

    expect(result.success).toBe(false)
    expect(result.message).toBe('Forbidden: admin access required')
  })

  it('returns error for duplicate email', async () => {
    mockAuthenticatedAdmin()
    mockGenerateLink.mockResolvedValue({
      data: { user: null, properties: null },
      error: { message: 'User already registered' },
    })

    const fd = makeFormData({ email: 'dupe@example.com', full_name: 'Dupe', role: 'member' })
    const result = await inviteUser(INITIAL_STATE, fd)

    expect(result.success).toBe(false)
    expect(result.message).toBe('A user with this email already exists')
    expect(result.errors?.email).toContain('This email is already registered')
  })

  it('returns generic error for other invite failures', async () => {
    mockAuthenticatedAdmin()
    mockGenerateLink.mockResolvedValue({
      data: { user: null, properties: null },
      error: { message: 'SMTP connection failed' },
    })

    const fd = makeFormData({ email: 'new@example.com', full_name: 'New', role: 'member' })
    const result = await inviteUser(INITIAL_STATE, fd)

    expect(result.success).toBe(false)
    expect(result.message).toBe('Failed to invite user')
  })

  it('compensates and gives redacted recovery guidance when invite link data is missing', async () => {
    mockAuthenticatedAdmin()
    mockGenerateLink.mockResolvedValue({
      data: { user: { id: TARGET_ID }, properties: null },
      error: null,
    })
    mockDeleteUser.mockResolvedValue({
      data: null,
      error: { message: 'sensitive cleanup failure detail' },
    })

    const result = await inviteUser(
      INITIAL_STATE,
      makeFormData({ email: 'new@example.com', full_name: 'New User', role: 'member' })
    )

    expect(mockDeleteUser).toHaveBeenCalledWith(TARGET_ID)
    expect(mockSendInviteEmail).not.toHaveBeenCalled()
    expect(mockInsert).not.toHaveBeenCalled()
    expect(result).toEqual({
      success: false,
      message:
        'Invitation link was unavailable after account creation. Please check the Users list before retrying.',
    })
    expect(result.message).not.toContain('sensitive cleanup failure detail')
  })

  it('invites a member successfully and sends the branded email', async () => {
    mockAuthenticatedAdmin()
    mockGenerateLink.mockResolvedValue(LINK_SUCCESS)
    mockInsert.mockResolvedValue({ error: null })

    const fd = makeFormData({ email: 'new@example.com', full_name: 'New User', role: 'member' })
    const result = await inviteUser(INITIAL_STATE, fd)

    expect(result.success).toBe(true)
    expect(result.message).toBe('Invitation sent successfully')
    // Branded email sent via Resend with a server-verified callback link
    // (token_hash → verifyOtp), not Supabase's implicit action_link.
    expect(mockSendInviteEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'new@example.com',
        role: 'member',
        actionUrl: expect.stringContaining('/api/auth/callback?token_hash=hash123&type=invite'),
      })
    )
    // Should NOT update role for members (default is member)
    expect(mockAdminFrom).not.toHaveBeenCalled()
  })

  it('generates an invite-type link (no Supabase mailer)', async () => {
    mockAuthenticatedAdmin()
    mockGenerateLink.mockResolvedValue(LINK_SUCCESS)
    mockInsert.mockResolvedValue({ error: null })

    const fd = makeFormData({ email: 'new@example.com', full_name: 'New User', role: 'member' })
    await inviteUser(INITIAL_STATE, fd)

    expect(mockGenerateLink).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'invite', email: 'new@example.com' })
    )
  })

  it('reports a non-fatal warning when the invite email fails', async () => {
    mockAuthenticatedAdmin()
    mockGenerateLink.mockResolvedValue(LINK_SUCCESS)
    mockInsert.mockResolvedValue({ error: null })
    mockSendInviteEmail.mockResolvedValue({ data: null, error: { message: 'Resend down' } })

    const fd = makeFormData({ email: 'new@example.com', full_name: 'New User', role: 'member' })
    const result = await inviteUser(INITIAL_STATE, fd)

    expect(result.success).toBe(false)
    expect(result.message).toContain('failed to send')
  })

  it('invites an admin and updates role', async () => {
    mockAuthenticatedAdmin()
    mockGenerateLink.mockResolvedValue(LINK_SUCCESS)
    mockAdminEq.mockResolvedValue({ error: null })
    mockAdminUpdate.mockReturnValue({ eq: mockAdminEq })
    mockAdminFrom.mockReturnValue({ update: mockAdminUpdate })
    mockInsert.mockResolvedValue({ error: null })

    const fd = makeFormData({ email: 'admin@example.com', full_name: 'New Admin', role: 'admin' })
    const result = await inviteUser(INITIAL_STATE, fd)

    expect(result.success).toBe(true)
    expect(mockAdminFrom).toHaveBeenCalledWith('profiles')
  })

  it('assigns an invited member to the selected family', async () => {
    const familyId = '550e8400-e29b-41d4-a716-446655440010'
    mockAuthenticatedAdmin()
    mockFamilyLookup({ id: familyId })
    mockGenerateLink.mockResolvedValue(LINK_SUCCESS)
    mockAdminEq.mockResolvedValue({ error: null })
    mockAdminUpdate.mockReturnValue({ eq: mockAdminEq })
    mockAdminFrom.mockReturnValue({ update: mockAdminUpdate })
    mockInsert.mockResolvedValue({ error: null })

    const fd = makeFormData({
      email: 'member@example.com',
      full_name: 'Family Member',
      role: 'member',
      family_id: familyId,
    })
    const result = await inviteUser(INITIAL_STATE, fd)

    expect(result.success).toBe(true)
    expect(mockAdminUpdate).toHaveBeenCalledWith({ family_id: familyId })
    expect(mockAdminEq).toHaveBeenCalledWith('id', TARGET_ID)
  })

  it('rejects a nonexistent family before creating the auth user', async () => {
    const familyId = '550e8400-e29b-41d4-a716-446655440010'
    mockAuthenticatedAdmin()
    mockFamilyLookup(null, { message: 'not found' })

    const fd = makeFormData({
      email: 'member@example.com',
      full_name: 'Family Member',
      role: 'member',
      family_id: familyId,
    })
    const result = await inviteUser(INITIAL_STATE, fd)

    expect(result).toEqual({
      success: false,
      message: 'Selected family was not found',
      errors: { family_id: ['Choose an existing family'] },
    })
    expect(mockGenerateLink).not.toHaveBeenCalled()
    expect(mockAdminFrom).not.toHaveBeenCalled()
    expect(mockDeleteUser).not.toHaveBeenCalled()
  })

  it('deletes the new auth user when family assignment loses a validation race', async () => {
    const familyId = '550e8400-e29b-41d4-a716-446655440010'
    mockAuthenticatedAdmin()
    mockFamilyLookup({ id: familyId })
    mockGenerateLink.mockResolvedValue(LINK_SUCCESS)
    mockAdminEq.mockResolvedValue({ error: { message: 'foreign key violation' } })
    mockAdminUpdate.mockReturnValue({ eq: mockAdminEq })
    mockAdminFrom.mockReturnValue({ update: mockAdminUpdate })

    const fd = makeFormData({
      email: 'member@example.com',
      full_name: 'Family Member',
      role: 'member',
      family_id: familyId,
    })
    const result = await inviteUser(INITIAL_STATE, fd)

    expect(mockGenerateLink).toHaveBeenCalled()
    expect(mockDeleteUser).toHaveBeenCalledWith(TARGET_ID)
    expect(result).toEqual({
      success: false,
      message:
        'Invitation could not be completed while applying the selected family. Please check the Users list before retrying.',
    })
  })

  it('does not expose rollback failure details after a profile update race', async () => {
    const familyId = '550e8400-e29b-41d4-a716-446655440010'
    mockAuthenticatedAdmin()
    mockFamilyLookup({ id: familyId })
    mockGenerateLink.mockResolvedValue(LINK_SUCCESS)
    mockAdminEq.mockResolvedValue({ error: { message: 'foreign key violation' } })
    mockAdminUpdate.mockReturnValue({ eq: mockAdminEq })
    mockAdminFrom.mockReturnValue({ update: mockAdminUpdate })
    mockDeleteUser.mockResolvedValue({
      data: null,
      error: { message: 'sensitive cleanup failure detail' },
    })

    const result = await inviteUser(
      INITIAL_STATE,
      makeFormData({
        email: 'member@example.com',
        full_name: 'Family Member',
        role: 'member',
        family_id: familyId,
      })
    )

    expect(mockDeleteUser).toHaveBeenCalledWith(TARGET_ID)
    expect(result.success).toBe(false)
    expect(result.message).not.toContain('sensitive cleanup failure detail')
  })

  it('returns error when admin role update fails', async () => {
    mockAuthenticatedAdmin()
    mockGenerateLink.mockResolvedValue(LINK_SUCCESS)
    mockAdminEq.mockResolvedValue({ error: { message: 'update failed' } })
    mockAdminUpdate.mockReturnValue({ eq: mockAdminEq })
    mockAdminFrom.mockReturnValue({ update: mockAdminUpdate })

    const fd = makeFormData({ email: 'admin@example.com', full_name: 'New Admin', role: 'admin' })
    const result = await inviteUser(INITIAL_STATE, fd)

    expect(result.success).toBe(false)
    expect(mockDeleteUser).toHaveBeenCalledWith(TARGET_ID)
    expect(result.message).toBe(
      'Invitation could not be completed while applying the admin role. Please check the Users list before retrying.'
    )
  })
})

describe('resendInvite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSendInviteEmail.mockResolvedValue({ data: {}, error: null })
  })

  // Sets up: authenticated admin, target profile fetch, pending auth user.
  function mockResendHappyPath(authUserOverride: Record<string, unknown> = {}) {
    mockAuthenticatedAdmin()
    // 2nd profiles call = target fetch (email, full_name, role)
    mockSingle.mockResolvedValue({
      data: { email: 'pending@example.com', full_name: 'Pending User', role: 'member' },
      error: null,
    })
    mockEq.mockReturnValue({ single: mockSingle })
    mockSelect.mockReturnValue({ eq: mockEq })
    mockInsert.mockResolvedValue({ error: null })
    mockGetUserById.mockResolvedValue({
      data: { user: { last_sign_in_at: null, ...authUserOverride } },
      error: null,
    })
    mockGenerateLink.mockResolvedValue(LINK_SUCCESS)
  }

  it('returns Unauthorized when no user session', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const fd = makeFormData({ user_id: TARGET_ID })
    const result = await resendInvite(INITIAL_STATE, fd)

    expect(result.success).toBe(false)
    expect(result.message).toBe('Unauthorized')
  })

  it('returns Forbidden when caller is not admin', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: ADMIN_ID } } })
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: { role: 'member' }, error: null }),
        }),
      }),
    })

    const fd = makeFormData({ user_id: TARGET_ID })
    const result = await resendInvite(INITIAL_STATE, fd)

    expect(result.success).toBe(false)
    expect(result.message).toBe('Forbidden: admin access required')
  })

  it('blocks resending to a user who has already accepted', async () => {
    mockResendHappyPath({ last_sign_in_at: '2026-01-01T00:00:00Z' })

    const fd = makeFormData({ user_id: TARGET_ID })
    const result = await resendInvite(INITIAL_STATE, fd)

    expect(result.success).toBe(false)
    expect(result.message).toBe('This user has already accepted their invitation')
    expect(mockGenerateLink).not.toHaveBeenCalled()
  })

  it('resends a recovery-type link via the branded email', async () => {
    mockResendHappyPath()

    const fd = makeFormData({ user_id: TARGET_ID })
    const result = await resendInvite(INITIAL_STATE, fd)

    expect(result.success).toBe(true)
    expect(result.message).toBe('Invitation resent successfully')
    expect(mockGenerateLink).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'recovery', email: 'pending@example.com' })
    )
    expect(mockSendInviteEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'pending@example.com',
        actionUrl: expect.stringContaining('/api/auth/callback?token_hash=hash123&type=recovery'),
      })
    )
  })

  it('writes an audit row with the distinct invite-resend action', async () => {
    mockResendHappyPath()

    const fd = makeFormData({ user_id: TARGET_ID })
    await resendInvite(INITIAL_STATE, fd)

    expect(mockFrom).toHaveBeenCalledWith('admin_audit_log')
    expect(mockInsert).toHaveBeenCalledWith({
      actor_id: ADMIN_ID,
      action: 'user.invite.resend',
      target_user_id: TARGET_ID,
      metadata: { email: 'pending@example.com', role: 'member' },
    })
  })

  it('reports failure when the resend email fails', async () => {
    mockResendHappyPath()
    mockSendInviteEmail.mockResolvedValue({ data: null, error: { message: 'Resend down' } })

    const fd = makeFormData({ user_id: TARGET_ID })
    const result = await resendInvite(INITIAL_STATE, fd)

    expect(result.success).toBe(false)
    expect(result.message).toBe('Failed to send invitation email')
  })
})

describe('sendPasswordReset', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSendPasswordResetEmail.mockResolvedValue({ data: {}, error: null })
  })

  // Sets up: authenticated user, target profile fetch (email + full_name),
  // audit-log insert, and a successful recovery generateLink.
  function mockResetHappyPath() {
    mockGetUser.mockResolvedValue({ data: { user: { id: ADMIN_ID } } })
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: { email: 'member@example.com', full_name: 'Member Name' },
                  error: null,
                }),
            }),
          }),
        }
      }
      if (table === 'admin_audit_log') {
        return { insert: mockInsert }
      }
      return {}
    })
    mockInsert.mockResolvedValue({ error: null })
    mockGenerateLink.mockResolvedValue(LINK_SUCCESS)
  }

  it('generates a recovery link and sends the branded email (no Supabase mailer)', async () => {
    mockResetHappyPath()

    const fd = makeFormData({ user_id: TARGET_ID })
    const result = await sendPasswordReset(INITIAL_STATE, fd)

    expect(result.success).toBe(true)
    expect(result.message).toBe('Password reset email sent successfully')
    // Recovery link generated with redirectTo derived from getSiteUrl() (no #245 regression)
    expect(mockGenerateLink).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'recovery',
        email: 'member@example.com',
        options: { redirectTo: 'https://stbasilsboston.org/api/auth/callback?type=recovery' },
      })
    )
    // Branded email sent via Resend with a server-verified church-domain callback link
    expect(mockSendPasswordResetEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'member@example.com',
        recipientName: 'Member Name',
        actionUrl: expect.stringContaining('/api/auth/callback?token_hash=hash123&type=recovery'),
      })
    )
    // Must NOT use Supabase's default mailer — single send path, no duplicate email
    expect(mockResetPasswordForEmail).not.toHaveBeenCalled()
  })

  it('returns failure when generateLink fails', async () => {
    mockResetHappyPath()
    mockGenerateLink.mockResolvedValue({ data: { properties: null }, error: { message: 'boom' } })

    const fd = makeFormData({ user_id: TARGET_ID })
    const result = await sendPasswordReset(INITIAL_STATE, fd)

    expect(result.success).toBe(false)
    expect(result.message).toBe('Failed to send password reset email')
    expect(mockSendPasswordResetEmail).not.toHaveBeenCalled()
  })

  it('returns failure when the branded email fails to send', async () => {
    mockResetHappyPath()
    mockSendPasswordResetEmail.mockResolvedValue({ data: null, error: { message: 'Resend down' } })

    const fd = makeFormData({ user_id: TARGET_ID })
    const result = await sendPasswordReset(INITIAL_STATE, fd)

    expect(result.success).toBe(false)
    expect(result.message).toBe('Failed to send password reset email')
  })
})

describe('updateUserRole', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns validation errors for invalid input', async () => {
    const fd = makeFormData({ user_id: 'not-a-uuid', role: 'superadmin' })
    const result = await updateUserRole(INITIAL_STATE, fd)

    expect(result.success).toBe(false)
    expect(result.message).toBe('Validation failed')
    expect(result.errors).toBeDefined()
  })

  it('returns Unauthorized when no user session', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const fd = makeFormData({ user_id: TARGET_ID, role: 'admin' })
    const result = await updateUserRole(INITIAL_STATE, fd)

    expect(result.success).toBe(false)
    expect(result.message).toBe('Unauthorized')
  })

  it('returns Forbidden when caller is not admin', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: ADMIN_ID } } })
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: { role: 'member' }, error: null }),
        }),
      }),
    })

    const fd = makeFormData({ user_id: TARGET_ID, role: 'admin' })
    const result = await updateUserRole(INITIAL_STATE, fd)

    expect(result.success).toBe(false)
    expect(result.message).toBe('Forbidden: admin access required')
  })

  it('blocks self-role-change', async () => {
    mockAuthenticatedAdmin()

    const fd = makeFormData({ user_id: ADMIN_ID, role: 'member' })
    const result = await updateUserRole(INITIAL_STATE, fd)

    expect(result.success).toBe(false)
    expect(result.message).toBe('You cannot change your own role')
  })

  it('returns error when target user not found', async () => {
    mockAuthenticatedAdmin()
    // Target profile fetch returns error
    mockSingle.mockResolvedValue({ data: null, error: { message: 'not found' } })
    mockEq.mockReturnValue({ single: mockSingle })
    mockSelect.mockReturnValue({ eq: mockEq })

    const fd = makeFormData({ user_id: TARGET_ID, role: 'admin' })
    const result = await updateUserRole(INITIAL_STATE, fd)

    expect(result.success).toBe(false)
    expect(result.message).toBe('User not found')
  })

  it('returns error when user already has the requested role', async () => {
    mockAuthenticatedAdmin()
    // Target profile already has 'admin' role
    let targetCallCount = 0
    const origFrom = mockFrom.getMockImplementation()
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        targetCallCount++
        if (targetCallCount === 1) {
          // Admin check
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: { role: 'admin' }, error: null }),
              }),
            }),
          }
        }
        // Target profile fetch
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: { role: 'admin' }, error: null }),
            }),
          }),
        }
      }
      return origFrom?.(table) ?? { insert: mockInsert }
    })

    const fd = makeFormData({ user_id: TARGET_ID, role: 'admin' })
    const result = await updateUserRole(INITIAL_STATE, fd)

    expect(result.success).toBe(false)
    expect(result.message).toBe('User already has the "admin" role')
  })

  it('updates role successfully', async () => {
    let profileCallCount = 0
    mockGetUser.mockResolvedValue({ data: { user: { id: ADMIN_ID } } })
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        profileCallCount++
        if (profileCallCount === 1) {
          // Admin check
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: { role: 'admin' }, error: null }),
              }),
            }),
          }
        }
        // Target profile fetch
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: { role: 'member' }, error: null }),
            }),
          }),
        }
      }
      if (table === 'admin_audit_log') {
        return { insert: () => Promise.resolve({ error: null }) }
      }
      return {}
    })
    // Role update goes through admin client
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          update: () => ({
            eq: () => Promise.resolve({ error: null }),
          }),
        }
      }
      return {}
    })

    const fd = makeFormData({ user_id: TARGET_ID, role: 'admin' })
    const result = await updateUserRole(INITIAL_STATE, fd)

    expect(result.success).toBe(true)
    expect(result.message).toBe('Role updated successfully')
  })

  it('returns error when role update fails', async () => {
    let profileCallCount = 0
    mockGetUser.mockResolvedValue({ data: { user: { id: ADMIN_ID } } })
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        profileCallCount++
        if (profileCallCount === 1) {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: { role: 'admin' }, error: null }),
              }),
            }),
          }
        }
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: { role: 'member' }, error: null }),
            }),
          }),
        }
      }
      return {}
    })
    // Role update fails via admin client
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          update: () => ({
            eq: () => Promise.resolve({ error: { message: 'DB error' } }),
          }),
        }
      }
      return {}
    })

    const fd = makeFormData({ user_id: TARGET_ID, role: 'admin' })
    const result = await updateUserRole(INITIAL_STATE, fd)

    expect(result.success).toBe(false)
    expect(result.message).toBe('Failed to update role')
  })
})
