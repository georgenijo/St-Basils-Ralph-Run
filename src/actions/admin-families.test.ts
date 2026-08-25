import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetUser = vi.fn()
const mockFrom = vi.fn()
const mockSendEmail = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: { getUser: mockGetUser },
      from: mockFrom,
    })
  ),
}))

vi.mock('@/lib/email', () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
}))

vi.mock('@/lib/site-url', () => ({
  getSiteUrl: () => 'https://stbasilsboston.org',
}))

vi.mock('@/emails/family-linked', () => ({
  FamilyLinked: vi.fn(() => null),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import {
  assignUserToFamily,
  createFamily,
  removeUserFromFamily,
  updateFamilyAdmin,
} from '@/actions/admin-families'

const ADMIN_ID = '550e8400-e29b-41d4-a716-446655440001'
const USER_ID = '550e8400-e29b-41d4-a716-446655440002'
const HEAD_ID = '550e8400-e29b-41d4-a716-446655440003'
const FAMILY_ID = '550e8400-e29b-41d4-a716-446655440010'
const OLD_FAMILY_ID = '550e8400-e29b-41d4-a716-446655440011'
const INITIAL_STATE = { success: false, message: '' }

function form(entries: Record<string, string>): FormData {
  const data = new FormData()
  for (const [key, value] of Object.entries(entries)) data.set(key, value)
  return data
}

function singleQuery(result: { data: unknown; error: unknown }) {
  return {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn().mockResolvedValue(result),
      })),
    })),
  }
}

function insertSingleQuery(result: { data: unknown; error: unknown }) {
  const insert = vi.fn(() => ({
    select: vi.fn(() => ({
      single: vi.fn().mockResolvedValue(result),
    })),
  }))
  return { client: { insert }, insert }
}

function updateQuery(result: { error: unknown } = { error: null }, eqCount = 1) {
  const eqMocks = Array.from({ length: eqCount }, () => vi.fn())
  const update = vi.fn(() => {
    const chain: Record<string, unknown> = {}
    eqMocks.forEach((eq, index) => {
      if (index === eqMocks.length - 1) {
        eq.mockResolvedValue(result)
      } else {
        eq.mockReturnValue({ eq: eqMocks[index + 1] })
      }
    })
    chain.eq = eqMocks[0]
    return chain
  })
  return { client: { update }, update, eqMocks }
}

function auditQuery() {
  const insert = vi.fn().mockResolvedValue({ error: null })
  return { client: { insert }, insert }
}

function mockAdmin(queues: Record<string, unknown[]>) {
  mockGetUser.mockResolvedValue({ data: { user: { id: ADMIN_ID, email: 'admin@example.com' } } })
  let adminChecked = false
  const remaining = Object.fromEntries(
    Object.entries(queues).map(([table, values]) => [table, [...values]])
  )

  mockFrom.mockImplementation((table: string) => {
    if (table === 'profiles' && !adminChecked) {
      adminChecked = true
      return singleQuery({ data: { role: 'admin' }, error: null })
    }

    const next = remaining[table]?.shift()
    if (!next) throw new Error(`Unexpected query for ${table}`)
    return next
  })
}

function mockNonAdmin() {
  mockGetUser.mockResolvedValue({ data: { user: { id: ADMIN_ID } } })
  mockFrom.mockReturnValue(singleQuery({ data: { role: 'member' }, error: null }))
}

const validCreate = {
  family_name: 'Thomas Family',
  phone: '',
  address: '',
  membership_status: 'pending',
  membership_type: '',
  membership_expires_at: '',
}

const validUpdate = {
  family_id: FAMILY_ID,
  membership_status: 'active',
  membership_type: 'annual',
  membership_expires_at: '2027-08-25',
  head_of_household: '',
}

beforeEach(() => {
  vi.clearAllMocks()
  mockSendEmail.mockResolvedValue({ data: {}, error: null })
})

describe('createFamily', () => {
  it('rejects invalid input', async () => {
    const result = await createFamily(INITIAL_STATE, form({ ...validCreate, family_name: '' }))

    expect(result.success).toBe(false)
    expect(result.message).toBe('Validation failed')
    expect(result.errors?.family_name).toBeDefined()
    expect(mockGetUser).not.toHaveBeenCalled()
  })

  it('returns Forbidden for a non-admin', async () => {
    mockNonAdmin()

    const result = await createFamily(INITIAL_STATE, form(validCreate))

    expect(result).toEqual({ success: false, message: 'Forbidden: admin access required' })
  })

  it('creates a family with validated membership fields', async () => {
    const familyInsert = insertSingleQuery({ data: { id: FAMILY_ID }, error: null })
    const audit = auditQuery()
    mockAdmin({ families: [familyInsert.client], admin_audit_log: [audit.client] })

    const result = await createFamily(INITIAL_STATE, form(validCreate))

    expect(result).toEqual({ success: true, message: 'Family created successfully' })
    expect(familyInsert.insert).toHaveBeenCalledWith({
      family_name: 'Thomas Family',
      phone: null,
      address: null,
      membership_status: 'pending',
      membership_type: null,
      membership_expires_at: null,
    })
  })

  it('writes a family.create audit row', async () => {
    const familyInsert = insertSingleQuery({ data: { id: FAMILY_ID }, error: null })
    const audit = auditQuery()
    mockAdmin({ families: [familyInsert.client], admin_audit_log: [audit.client] })

    await createFamily(INITIAL_STATE, form(validCreate))

    expect(audit.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        actor_id: ADMIN_ID,
        action: 'family.create',
        target_user_id: ADMIN_ID,
        metadata: expect.objectContaining({ family_id: FAMILY_ID }),
      })
    )
  })
})

describe('updateFamilyAdmin', () => {
  it('rejects invalid input', async () => {
    const result = await updateFamilyAdmin(
      INITIAL_STATE,
      form({ ...validUpdate, membership_status: 'unknown' })
    )

    expect(result.success).toBe(false)
    expect(result.message).toBe('Validation failed')
    expect(mockGetUser).not.toHaveBeenCalled()
  })

  it('returns Forbidden for a non-admin', async () => {
    mockNonAdmin()

    const result = await updateFamilyAdmin(INITIAL_STATE, form(validUpdate))

    expect(result).toEqual({ success: false, message: 'Forbidden: admin access required' })
  })

  it('updates membership fields and an assigned head of household', async () => {
    const update = updateQuery()
    const audit = auditQuery()
    mockAdmin({
      families: [
        singleQuery({ data: { id: FAMILY_ID, family_name: 'Thomas Family' }, error: null }),
        update.client,
      ],
      profiles: [singleQuery({ data: { family_id: FAMILY_ID }, error: null })],
      admin_audit_log: [audit.client],
    })

    const result = await updateFamilyAdmin(
      INITIAL_STATE,
      form({ ...validUpdate, head_of_household: HEAD_ID })
    )

    expect(result).toEqual({ success: true, message: 'Family updated successfully' })
    expect(update.update).toHaveBeenCalledWith({
      membership_status: 'active',
      membership_type: 'annual',
      membership_expires_at: '2027-08-25',
      head_of_household: HEAD_ID,
    })
  })

  it('writes a family.update audit row', async () => {
    const update = updateQuery()
    const audit = auditQuery()
    mockAdmin({
      families: [
        singleQuery({ data: { id: FAMILY_ID, family_name: 'Thomas Family' }, error: null }),
        update.client,
      ],
      admin_audit_log: [audit.client],
    })

    await updateFamilyAdmin(INITIAL_STATE, form(validUpdate))

    expect(audit.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        actor_id: ADMIN_ID,
        action: 'family.update',
        target_user_id: ADMIN_ID,
        metadata: expect.objectContaining({ family_id: FAMILY_ID }),
      })
    )
  })
})

describe('assignUserToFamily', () => {
  it('rejects invalid input', async () => {
    const result = await assignUserToFamily(
      INITIAL_STATE,
      form({ family_id: 'invalid', user_id: USER_ID })
    )

    expect(result.success).toBe(false)
    expect(result.message).toBe('Validation failed')
    expect(mockGetUser).not.toHaveBeenCalled()
  })

  it('returns Forbidden for a non-admin', async () => {
    mockNonAdmin()

    const result = await assignUserToFamily(
      INITIAL_STATE,
      form({ family_id: FAMILY_ID, user_id: USER_ID })
    )

    expect(result).toEqual({ success: false, message: 'Forbidden: admin access required' })
  })

  it('assigns the profile and sends the family-linked email', async () => {
    const profileUpdate = updateQuery()
    const audit = auditQuery()
    mockAdmin({
      profiles: [
        singleQuery({
          data: {
            id: USER_ID,
            email: 'member@example.com',
            full_name: 'Member Name',
            family_id: OLD_FAMILY_ID,
          },
          error: null,
        }),
        profileUpdate.client,
      ],
      families: [
        singleQuery({ data: { id: FAMILY_ID, family_name: 'Thomas Family' }, error: null }),
      ],
      admin_audit_log: [audit.client],
    })

    const result = await assignUserToFamily(
      INITIAL_STATE,
      form({ family_id: FAMILY_ID, user_id: USER_ID })
    )

    expect(result).toEqual({ success: true, message: 'User assigned to family successfully' })
    expect(profileUpdate.update).toHaveBeenCalledWith({ family_id: FAMILY_ID })
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'member@example.com',
        subject: 'Your account was linked to the Thomas Family family',
      })
    )
  })

  it('writes a family.assign_member audit row targeting the member', async () => {
    const profileUpdate = updateQuery()
    const audit = auditQuery()
    mockAdmin({
      profiles: [
        singleQuery({
          data: { id: USER_ID, email: null, full_name: 'Member', family_id: null },
          error: null,
        }),
        profileUpdate.client,
      ],
      families: [
        singleQuery({ data: { id: FAMILY_ID, family_name: 'Thomas Family' }, error: null }),
      ],
      admin_audit_log: [audit.client],
    })

    await assignUserToFamily(INITIAL_STATE, form({ family_id: FAMILY_ID, user_id: USER_ID }))

    expect(audit.insert).toHaveBeenCalledWith({
      actor_id: ADMIN_ID,
      action: 'family.assign_member',
      target_user_id: USER_ID,
      metadata: {
        family_id: FAMILY_ID,
        family_name: 'Thomas Family',
        previous_family_id: null,
      },
    })
  })

  it('keeps a successful assignment when email delivery fails', async () => {
    const profileUpdate = updateQuery()
    const audit = auditQuery()
    mockAdmin({
      profiles: [
        singleQuery({
          data: {
            id: USER_ID,
            email: 'member@example.com',
            full_name: 'Member',
            family_id: null,
          },
          error: null,
        }),
        profileUpdate.client,
      ],
      families: [
        singleQuery({ data: { id: FAMILY_ID, family_name: 'Thomas Family' }, error: null }),
      ],
      admin_audit_log: [audit.client],
    })
    mockSendEmail.mockResolvedValue({ data: null, error: { message: 'transport down' } })

    const result = await assignUserToFamily(
      INITIAL_STATE,
      form({ family_id: FAMILY_ID, user_id: USER_ID })
    )

    expect(result).toEqual({ success: true, message: 'User assigned to family successfully' })
    expect(audit.insert).toHaveBeenCalled()
  })
})

describe('removeUserFromFamily', () => {
  it('rejects invalid input', async () => {
    const result = await removeUserFromFamily(
      INITIAL_STATE,
      form({ family_id: FAMILY_ID, user_id: 'invalid' })
    )

    expect(result.success).toBe(false)
    expect(result.message).toBe('Validation failed')
    expect(mockGetUser).not.toHaveBeenCalled()
  })

  it('returns Forbidden for a non-admin', async () => {
    mockNonAdmin()

    const result = await removeUserFromFamily(
      INITIAL_STATE,
      form({ family_id: FAMILY_ID, user_id: USER_ID })
    )

    expect(result).toEqual({ success: false, message: 'Forbidden: admin access required' })
  })

  it('clears the profile family assignment', async () => {
    const profileUpdate = updateQuery({ error: null }, 2)
    const audit = auditQuery()
    mockAdmin({
      profiles: [
        singleQuery({ data: { id: USER_ID, family_id: FAMILY_ID }, error: null }),
        profileUpdate.client,
      ],
      families: [
        singleQuery({
          data: { family_name: 'Thomas Family', head_of_household: HEAD_ID },
          error: null,
        }),
      ],
      admin_audit_log: [audit.client],
    })

    const result = await removeUserFromFamily(
      INITIAL_STATE,
      form({ family_id: FAMILY_ID, user_id: USER_ID })
    )

    expect(result).toEqual({ success: true, message: 'User removed from family successfully' })
    expect(profileUpdate.update).toHaveBeenCalledWith({ family_id: null })
    expect(profileUpdate.eqMocks[0]).toHaveBeenCalledWith('id', USER_ID)
    expect(profileUpdate.eqMocks[1]).toHaveBeenCalledWith('family_id', FAMILY_ID)
  })

  it('writes a family.remove_member audit row targeting the member', async () => {
    const profileUpdate = updateQuery({ error: null }, 2)
    const audit = auditQuery()
    mockAdmin({
      profiles: [
        singleQuery({ data: { id: USER_ID, family_id: FAMILY_ID }, error: null }),
        profileUpdate.client,
      ],
      families: [
        singleQuery({
          data: { family_name: 'Thomas Family', head_of_household: null },
          error: null,
        }),
      ],
      admin_audit_log: [audit.client],
    })

    await removeUserFromFamily(INITIAL_STATE, form({ family_id: FAMILY_ID, user_id: USER_ID }))

    expect(audit.insert).toHaveBeenCalledWith({
      actor_id: ADMIN_ID,
      action: 'family.remove_member',
      target_user_id: USER_ID,
      metadata: { family_id: FAMILY_ID, family_name: 'Thomas Family' },
    })
  })
})
