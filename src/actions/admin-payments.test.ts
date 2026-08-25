import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockGetUser, mockFrom, mockNotify, mockRevalidatePath } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
  mockNotify: vi.fn(),
  mockRevalidatePath: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: mockGetUser }, from: mockFrom })),
}))
vi.mock('@/lib/notifications', () => ({ sendFamilyNotification: mockNotify }))
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidatePath }))
vi.mock('@/emails/payment-confirmed', () => ({ PaymentConfirmed: vi.fn(() => null) }))
vi.mock('@/emails/payment-rejected', () => ({ PaymentRejected: vi.fn(() => null) }))
vi.mock('@/emails/event-charge-assigned', () => ({ EventChargeAssigned: vi.fn(() => null) }))
vi.mock('@/emails/membership-renewed', () => ({ MembershipRenewed: vi.fn(() => null) }))
vi.mock('@/lib/logger', () => ({
  logger: { child: vi.fn(() => ({ error: vi.fn(), warn: vi.fn() })) },
}))
vi.mock('@/lib/logger.server', () => ({
  withLogging: vi.fn((_name: string, action: unknown) => action),
}))

import { assignEventCosts, confirmPayment, rejectPayment } from '@/actions/admin-payments'

const ADMIN_ID = '550e8400-e29b-41d4-a716-446655440001'
const FAMILY_ID = '550e8400-e29b-41d4-a716-446655440002'
const PAYMENT_ID = '550e8400-e29b-41d4-a716-446655440003'
const EVENT_ID = '550e8400-e29b-41d4-a716-446655440004'
const FAMILY_ID_2 = '550e8400-e29b-41d4-a716-446655440005'
const INITIAL_STATE = { success: false, message: '' }

function adminProfileBuilder() {
  return {
    select: () => ({
      eq: () => ({ single: () => Promise.resolve({ data: { role: 'admin' }, error: null }) }),
    }),
  }
}

describe('admin payment actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: ADMIN_ID } } })
    mockNotify.mockResolvedValue(undefined)
  })

  it('confirms a pending payment and sends a formatted family notification', async () => {
    const payment = {
      id: PAYMENT_ID,
      family_id: FAMILY_ID,
      type: 'donation',
      amount: 42.5,
      method: 'zelle',
      related_event_id: null,
      related_share_id: null,
      status: 'pending',
    }
    const update = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) }))

    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') return adminProfileBuilder()
      if (table === 'payments') {
        return {
          select: () => ({
            eq: () => ({ single: () => Promise.resolve({ data: payment, error: null }) }),
          }),
          update,
        }
      }
      return {}
    })

    const formData = new FormData()
    formData.set('payment_id', PAYMENT_ID)

    await expect(confirmPayment(INITIAL_STATE, formData)).resolves.toEqual({
      success: true,
      message: 'Payment confirmed',
    })
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'confirmed', confirmed_by: ADMIN_ID })
    )
    expect(mockNotify).toHaveBeenCalledWith(
      expect.anything(),
      FAMILY_ID,
      'payments',
      expect.objectContaining({ subject: 'Your $42.50 payment was confirmed' })
    )
  })

  it('rejects a pending payment with the supplied reason and notifies the family', async () => {
    const update = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) }))
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') return adminProfileBuilder()
      if (table === 'payments') {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: {
                    id: PAYMENT_ID,
                    family_id: FAMILY_ID,
                    type: 'membership',
                    amount: 100,
                    method: 'venmo',
                    reference_memo: 'BASIL-1234',
                    status: 'pending',
                  },
                  error: null,
                }),
            }),
          }),
          update,
        }
      }
      return {}
    })

    const formData = new FormData()
    formData.set('payment_id', PAYMENT_ID)
    formData.set('reason', 'The transfer reference did not match.')

    const result = await rejectPayment(INITIAL_STATE, formData)

    expect(result.success).toBe(true)
    expect(update).toHaveBeenCalledWith({
      status: 'rejected',
      rejected_reason: 'The transfer reference did not match.',
    })
    expect(mockNotify).toHaveBeenCalledWith(
      expect.anything(),
      FAMILY_ID,
      'payments',
      expect.objectContaining({ subject: 'Payment Not Confirmed' })
    )
  })

  it('assigns exact event amounts and sends one notification per family', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null })
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') return adminProfileBuilder()
      if (table === 'event_charges') return { insert }
      if (table === 'events') {
        return {
          select: () => ({
            eq: () => ({ maybeSingle: () => Promise.resolve({ data: { title: 'Family Night' } }) }),
          }),
        }
      }
      return {}
    })

    const charges = [
      { family_id: FAMILY_ID, amount: 35 },
      { family_id: FAMILY_ID_2, amount: 42.5 },
    ]
    const formData = new FormData()
    formData.set('event_id', EVENT_ID)
    formData.set('charges', JSON.stringify(charges))

    await expect(assignEventCosts(INITIAL_STATE, formData)).resolves.toEqual({
      success: true,
      message: 'Assigned costs to 2 families',
    })
    expect(insert).toHaveBeenCalledWith(
      charges.map((charge) => ({ event_id: EVENT_ID, ...charge }))
    )
    expect(mockNotify).toHaveBeenCalledTimes(2)
    expect(mockNotify).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      FAMILY_ID_2,
      'events',
      expect.objectContaining({ subject: "You've been charged $42.50 for Family Night" })
    )
  })
})
