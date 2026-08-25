import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockGetUser, mockFrom, mockVerifyTurnstile, mockRevalidatePath } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
  mockVerifyTurnstile: vi.fn(),
  mockRevalidatePath: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: mockGetUser }, from: mockFrom })),
}))
vi.mock('@/lib/turnstile', () => ({ verifyTurnstile: mockVerifyTurnstile }))
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidatePath }))
vi.mock('@/lib/logger', () => ({
  logger: { child: vi.fn(() => ({ error: vi.fn() })) },
}))
vi.mock('@/lib/logger.server', () => ({
  withLogging: vi.fn((_name: string, action: unknown) => action),
}))

import { submitRsvp } from '@/actions/rsvp'

const USER_ID = '550e8400-e29b-41d4-a716-446655440001'
const FAMILY_ID = '550e8400-e29b-41d4-a716-446655440002'
const EVENT_ID = '550e8400-e29b-41d4-a716-446655440003'
const INITIAL_STATE = { success: false, message: '' }

function form(): FormData {
  const formData = new FormData()
  formData.set('slug', 'family-night')
  formData.set('name', 'George Thomas')
  formData.set('headcount', '4')
  formData.set('children_count', '2')
  formData.set('dietary', 'Nut allergy')
  formData.set('bringing', 'Dessert')
  formData.set('notes', 'Arriving at 6')
  formData.set('cf-turnstile-response', 'valid-token')
  return formData
}

function eventBuilder(enabled: boolean) {
  return {
    select: () => ({
      eq: () => ({
        single: () =>
          Promise.resolve({ data: { id: EVENT_ID, rsvp_settings: { enabled } }, error: null }),
      }),
    }),
  }
}

describe('submitRsvp', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockVerifyTurnstile.mockResolvedValue(true)
    mockGetUser.mockResolvedValue({ data: { user: null } })
  })

  it('rejects failed CAPTCHA checks before touching the database', async () => {
    mockVerifyTurnstile.mockResolvedValue(false)

    await expect(submitRsvp(INITIAL_STATE, form())).resolves.toEqual({
      success: false,
      message: 'CAPTCHA verification failed',
    })
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('rejects submissions when RSVP is disabled for the event', async () => {
    mockFrom.mockReturnValue(eventBuilder(false))

    await expect(submitRsvp(INITIAL_STATE, form())).resolves.toEqual({
      success: false,
      message: 'RSVP is not enabled for this event',
    })
  })

  it('links authenticated guests to their family and upserts all RSVP fields', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null })
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } })
    mockFrom.mockImplementation((table: string) => {
      if (table === 'events') return eventBuilder(true)
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: { family_id: FAMILY_ID }, error: null }),
            }),
          }),
        }
      }
      if (table === 'event_rsvps') return { upsert }
      return {}
    })

    const result = await submitRsvp(INITIAL_STATE, form())

    expect(result).toEqual({
      success: true,
      message: "Thanks, George Thomas! You're in for 4 people.",
    })
    expect(upsert).toHaveBeenCalledWith(
      {
        event_id: EVENT_ID,
        family_id: FAMILY_ID,
        name: 'George Thomas',
        headcount: 4,
        children_count: 2,
        dietary: 'Nut allergy',
        bringing: 'Dessert',
        notes: 'Arriving at 6',
      },
      { onConflict: 'event_id,name' }
    )
    expect(mockRevalidatePath).toHaveBeenCalledWith('/rsvp/family-night')
  })

  it('does not report success when the RSVP upsert fails', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'events') return eventBuilder(true)
      if (table === 'event_rsvps') {
        return { upsert: vi.fn().mockResolvedValue({ error: new Error('database unavailable') }) }
      }
      return {}
    })

    await expect(submitRsvp(INITIAL_STATE, form())).resolves.toEqual({
      success: false,
      message: 'Failed to submit RSVP. Please try again.',
    })
  })
})
