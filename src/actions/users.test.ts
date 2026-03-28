import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Mocks ---

const mockGetUser = vi.fn()
const mockFrom = vi.fn()
const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockEq = vi.fn()
const mockSingle = vi.fn()
const mockSelect = vi.fn()

function buildChain(terminal: Record<string, unknown> = {}) {
  mockSingle.mockResolvedValue(terminal)
  mockEq.mockReturnValue({ single: mockSingle, eq: mockEq })
  mockSelect.mockReturnValue({ eq: mockEq })
  mockUpdate.mockReturnValue({ eq: mockEq })
  mockInsert.mockResolvedValue({ error: null })
  mockFrom.mockReturnValue({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
  })
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: { getUser: mockGetUser },
      from: mockFrom,
    })
  ),
}))

const mockAdminFrom = vi.fn()
const mockAdminInvite = vi.fn()
const mockAdminUpdate = vi.fn()
const mockAdminEq = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    auth: { admin: { inviteUserByEmail: mockAdminInvite } },
    from: mockAdminFrom,
  })),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import { inviteUser, updateUserRole } from '@/actions/users'

// --- Helpers ---

const ADMIN_ID = '550e8400-e29b-41d4-a716-446655440001'
const TARGET_ID = '550e8400-e29b-41d4-a716-446655440002'
const INITIAL_STATE = { success: false, message: '' }

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

// --- Tests ---

describe('inviteUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
    mockAdminInvite.mockResolvedValue({
      data: null,
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
    mockAdminInvite.mockResolvedValue({
      data: null,
      error: { message: 'SMTP connection failed' },
    })

    const fd = makeFormData({ email: 'new@example.com', full_name: 'New', role: 'member' })
    const result = await inviteUser(INITIAL_STATE, fd)

    expect(result.success).toBe(false)
    expect(result.message).toBe('Failed to invite user')
  })

  it('invites a member successfully', async () => {
    mockAuthenticatedAdmin()
    mockAdminInvite.mockResolvedValue({
      data: { user: { id: TARGET_ID } },
      error: null,
    })
    mockInsert.mockResolvedValue({ error: null })

    const fd = makeFormData({ email: 'new@example.com', full_name: 'New User', role: 'member' })
    const result = await inviteUser(INITIAL_STATE, fd)

    expect(result.success).toBe(true)
    expect(result.message).toBe('Invitation sent successfully')
    // Should NOT update role for members (default is member)
    expect(mockAdminFrom).not.toHaveBeenCalled()
  })

  it('invites an admin and updates role', async () => {
    mockAuthenticatedAdmin()
    mockAdminInvite.mockResolvedValue({
      data: { user: { id: TARGET_ID } },
      error: null,
    })
    mockAdminEq.mockResolvedValue({ error: null })
    mockAdminUpdate.mockReturnValue({ eq: mockAdminEq })
    mockAdminFrom.mockReturnValue({ update: mockAdminUpdate })
    mockInsert.mockResolvedValue({ error: null })

    const fd = makeFormData({ email: 'admin@example.com', full_name: 'New Admin', role: 'admin' })
    const result = await inviteUser(INITIAL_STATE, fd)

    expect(result.success).toBe(true)
    expect(mockAdminFrom).toHaveBeenCalledWith('profiles')
  })

  it('returns error when admin role update fails', async () => {
    mockAuthenticatedAdmin()
    mockAdminInvite.mockResolvedValue({
      data: { user: { id: TARGET_ID } },
      error: null,
    })
    mockAdminEq.mockResolvedValue({ error: { message: 'update failed' } })
    mockAdminUpdate.mockReturnValue({ eq: mockAdminEq })
    mockAdminFrom.mockReturnValue({ update: mockAdminUpdate })

    const fd = makeFormData({ email: 'admin@example.com', full_name: 'New Admin', role: 'admin' })
    const result = await inviteUser(INITIAL_STATE, fd)

    expect(result.success).toBe(false)
    expect(result.message).toBe('User invited but failed to set admin role')
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
        if (profileCallCount === 2) {
          // Target profile fetch
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: { role: 'member' }, error: null }),
              }),
            }),
          }
        }
        // Role update
        return {
          update: () => ({
            eq: () => Promise.resolve({ error: null }),
          }),
        }
      }
      if (table === 'admin_audit_log') {
        return { insert: () => Promise.resolve({ error: null }) }
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
        if (profileCallCount === 2) {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: { role: 'member' }, error: null }),
              }),
            }),
          }
        }
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
