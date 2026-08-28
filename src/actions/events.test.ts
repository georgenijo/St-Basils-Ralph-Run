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

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    child: vi.fn(() => ({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    })),
  },
}))

vi.mock('@/lib/logger.server', () => ({
  withLogging: vi.fn((_name: string, action: unknown) => action),
}))

import { createEvent, deleteEvent, updateEvent } from '@/actions/events'

const USER_ID = '550e8400-e29b-41d4-a716-446655440001'
const EVENT_ID = '550e8400-e29b-41d4-a716-446655440002'
const INITIAL_STATE = { success: false, message: '' }

function eventFormData({ includeId = false }: { includeId?: boolean } = {}) {
  const formData = new FormData()
  if (includeId) formData.set('event_id', EVENT_ID)
  formData.set('title', 'Parish Picnic')
  formData.set('slug', 'parish-picnic')
  formData.set('description', '')
  formData.set('location', 'Parish Hall')
  formData.set('start_at', '2026-09-12T12:00')
  formData.set('end_at', '2026-09-12T15:00')
  formData.set('is_recurring', 'false')
  formData.set('category', 'community')
  return formData
}

function deleteFormData() {
  const formData = new FormData()
  formData.set('event_id', EVENT_ID)
  return formData
}

function mockProfileRole(role: string | null) {
  mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } })
  mockFrom.mockImplementation((table: string) => {
    if (table !== 'profiles') throw new Error(`Unexpected table mutation: ${table}`)

    return {
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: role ? { role } : null, error: null }),
        }),
      }),
    }
  })
}

describe('event action authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns Unauthorized when event creation has no session', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const result = await createEvent(INITIAL_STATE, eventFormData())

    expect(result).toEqual({ success: false, message: 'Unauthorized' })
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it.each([
    ['createEvent', createEvent, eventFormData()],
    ['updateEvent', updateEvent, eventFormData({ includeId: true })],
    ['deleteEvent', deleteEvent, deleteFormData()],
  ])('blocks a non-admin from %s before mutating events', async (_name, action, formData) => {
    mockProfileRole('member')

    const result = await action(INITIAL_STATE, formData)

    expect(result).toEqual({ success: false, message: 'Forbidden: admin access required' })
    expect(mockFrom).toHaveBeenCalledTimes(1)
    expect(mockFrom).toHaveBeenCalledWith('profiles')
  })

  it('treats a missing profile as forbidden', async () => {
    mockProfileRole(null)

    const result = await deleteEvent(INITIAL_STATE, deleteFormData())

    expect(result).toEqual({ success: false, message: 'Forbidden: admin access required' })
  })
})
