import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockGetUser, mockFrom, mockRevalidatePath } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
  mockRevalidatePath: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: { getUser: mockGetUser },
      from: mockFrom,
    })
  ),
}))

vi.mock('next/cache', () => ({ revalidatePath: mockRevalidatePath }))

import { updateProfile } from '@/actions/profile'

const USER_ID = '550e8400-e29b-41d4-a716-446655440001'
const INITIAL_STATE = { success: false, message: '' }

function form(values: Record<string, string>): FormData {
  const data = new FormData()
  for (const [key, value] of Object.entries(values)) data.set(key, value)
  return data
}

describe('updateProfile', () => {
  beforeEach(() => vi.clearAllMocks())

  it('validates fields before accessing Supabase', async () => {
    const result = await updateProfile(
      INITIAL_STATE,
      form({ full_name: '', phone: '', avatar_url: 'not-a-url' })
    )

    expect(result.success).toBe(false)
    expect(result.errors?.full_name).toBeDefined()
    expect(result.errors?.avatar_url).toBeDefined()
    expect(mockGetUser).not.toHaveBeenCalled()
  })

  it('rejects unauthenticated updates', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const result = await updateProfile(
      INITIAL_STATE,
      form({ full_name: 'George Thomas', phone: '', avatar_url: '' })
    )

    expect(result).toEqual({ success: false, message: 'Unauthorized' })
  })

  it('updates only the authenticated profile and allows clearing optional fields', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } })
    const eq = vi.fn().mockResolvedValue({ error: null })
    const update = vi.fn(() => ({ eq }))
    mockFrom.mockReturnValue({ update })

    const result = await updateProfile(
      INITIAL_STATE,
      form({ full_name: ' George Thomas ', phone: '', avatar_url: '' })
    )

    expect(update).toHaveBeenCalledWith({
      full_name: 'George Thomas',
      phone: null,
      avatar_url: null,
    })
    expect(eq).toHaveBeenCalledWith('id', USER_ID)
    expect(result).toEqual({ success: true, message: 'Profile updated' })
    expect(mockRevalidatePath).toHaveBeenCalledWith('/member', 'layout')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/member/settings')
  })

  it('surfaces database failures', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } })
    mockFrom.mockReturnValue({
      update: () => ({ eq: vi.fn().mockResolvedValue({ error: { message: 'db down' } }) }),
    })

    const result = await updateProfile(
      INITIAL_STATE,
      form({ full_name: 'George Thomas', phone: '617-555-1234', avatar_url: '' })
    )

    expect(result).toEqual({ success: false, message: 'Failed to update profile' })
  })
})
