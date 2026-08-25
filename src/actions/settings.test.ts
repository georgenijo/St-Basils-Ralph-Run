import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetUser = vi.fn()
const mockFrom = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: { getUser: mockGetUser },
      from: mockFrom,
    })
  ),
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

vi.mock('@/lib/logger', () => ({
  logger: {
    child: vi.fn(() => ({ warn: vi.fn(), error: vi.fn() })),
  },
}))

vi.mock('@/lib/logger.server', () => ({
  withLogging: vi.fn((_name: string, action: unknown) => action),
}))

import { updateThemeSettings } from '@/actions/settings'

const USER_ID = '550e8400-e29b-41d4-a716-446655440001'
const INITIAL_STATE = { success: false, message: '' }

function validSettingsForm(): FormData {
  const formData = new FormData()
  formData.set(
    'fonts',
    JSON.stringify({
      heading: { family: 'Raleway', weights: [400, 700] },
      body: { family: 'Roboto', weights: [400] },
      nav: { family: 'Libre Baskerville', weights: [400] },
    })
  )
  formData.set('section_order', JSON.stringify(['hero', 'events']))
  return formData
}

describe('updateThemeSettings authorization', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns Unauthorized without a session', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    await expect(updateThemeSettings(INITIAL_STATE, validSettingsForm())).resolves.toEqual({
      success: false,
      message: 'Unauthorized',
    })
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('blocks non-admin users before reading or mutating site settings', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } })
    mockFrom.mockImplementation((table: string) => {
      if (table !== 'profiles') throw new Error(`Unexpected table access: ${table}`)
      return {
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: { role: 'member' }, error: null }),
          }),
        }),
      }
    })

    await expect(updateThemeSettings(INITIAL_STATE, validSettingsForm())).resolves.toEqual({
      success: false,
      message: 'Forbidden: admin access required',
    })
    expect(mockFrom).toHaveBeenCalledTimes(1)
    expect(mockFrom).toHaveBeenCalledWith('profiles')
  })
})
