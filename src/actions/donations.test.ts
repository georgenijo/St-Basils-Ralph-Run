import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetUser = vi.fn()
const mockFrom = vi.fn()
const mockInsert = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: { getUser: mockGetUser },
      from: mockFrom,
    })
  ),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    child: vi.fn(() => ({ error: vi.fn() })),
  },
}))

vi.mock('@/lib/logger.server', () => ({
  withLogging: vi.fn((_name: string, action: unknown) => action),
}))

import { recordDonation } from '@/actions/donations'

const MEMBER_ID = '550e8400-e29b-41d4-a716-446655440001'
const FAMILY_ID = '550e8400-e29b-41d4-a716-446655440002'
const INITIAL_STATE = { success: false, message: '' }

describe('recordDonation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: MEMBER_ID } } })
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: { family_id: FAMILY_ID }, error: null }),
            }),
          }),
        }
      }

      if (table === 'payments') {
        return { insert: mockInsert }
      }

      return {}
    })
    mockInsert.mockResolvedValue({ error: null })
  })

  it('inserts a pending donation payment', async () => {
    const formData = new FormData()
    formData.set('donation_type', 'general')
    formData.set('amount', '25.50')
    formData.set('note', 'Thanksgiving')

    const result = await recordDonation(INITIAL_STATE, formData)

    expect(result).toEqual({ success: true, message: 'Donation recorded successfully' })
    expect(mockInsert).toHaveBeenCalledWith({
      family_id: FAMILY_ID,
      type: 'donation',
      amount: 25.5,
      note: '[general] Thanksgiving',
      recorded_by: MEMBER_ID,
      status: 'pending',
    })
  })

  it('rejects unauthenticated submissions before querying profiles', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const formData = new FormData()
    formData.set('donation_type', 'general')
    formData.set('amount', '25')

    await expect(recordDonation(INITIAL_STATE, formData)).resolves.toEqual({
      success: false,
      message: 'Unauthorized',
    })
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('surfaces payment insert failures without reporting success', async () => {
    mockInsert.mockResolvedValue({ error: new Error('database unavailable') })
    const formData = new FormData()
    formData.set('donation_type', 'other')
    formData.set('amount', '10')

    await expect(recordDonation(INITIAL_STATE, formData)).resolves.toEqual({
      success: false,
      message: 'Failed to record donation',
    })
  })
})
