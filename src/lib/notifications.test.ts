import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockSendEmail, mockLogError } = vi.hoisted(() => ({
  mockSendEmail: vi.fn(),
  mockLogError: vi.fn(),
}))

vi.mock('@/lib/email', () => ({ sendEmail: mockSendEmail }))
vi.mock('@/lib/logger', () => ({
  logger: { child: vi.fn(() => ({ error: mockLogError })) },
}))

import {
  getFamilyEmails,
  sendFamilyNotification,
  sendUserNotification,
  shouldNotify,
} from '@/lib/notifications'

function singleProfileClient(result: { data: unknown; error: unknown }) {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue(result) })),
      })),
    })),
  } as never
}

describe('notification helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSendEmail.mockResolvedValue({ data: { id: 'sent' }, error: null })
  })

  it('honors an explicit opt-out preference', async () => {
    const client = singleProfileClient({
      data: { notification_preferences: { payments: false } },
      error: null,
    })

    await expect(shouldNotify(client, 'user-1', 'payments')).resolves.toBe(false)
  })

  it('defaults to enabled when a preference lookup fails', async () => {
    const client = singleProfileClient({ data: null, error: new Error('lookup failed') })

    await expect(shouldNotify(client, 'user-1', 'membership')).resolves.toBe(true)
    expect(mockLogError).toHaveBeenCalled()
  })

  it('filters null family email addresses', async () => {
    const not = vi.fn().mockResolvedValue({
      data: [
        { id: 'user-1', email: 'one@example.com' },
        { id: 'user-2', email: null },
      ],
      error: null,
    })
    const client = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({ eq: vi.fn(() => ({ not })) })),
      })),
    } as never

    await expect(getFamilyEmails(client, 'family-1')).resolves.toEqual([
      { id: 'user-1', email: 'one@example.com' },
    ])
  })

  it('sends a family email only to members who allow the category', async () => {
    const preferences = new Map([
      ['user-1', true],
      ['user-2', false],
    ])
    const from = vi.fn(() => ({
      select: vi.fn((columns: string) => {
        if (columns === 'id, email') {
          return {
            eq: vi.fn(() => ({
              not: vi.fn().mockResolvedValue({
                data: [
                  { id: 'user-1', email: 'one@example.com' },
                  { id: 'user-2', email: 'two@example.com' },
                ],
                error: null,
              }),
            })),
          }
        }

        return {
          eq: vi.fn((_field: string, userId: string) => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { notification_preferences: { shares: preferences.get(userId) } },
              error: null,
            }),
          })),
        }
      }),
    }))

    await sendFamilyNotification({ from } as never, 'family-1', 'shares', {
      subject: 'Shares purchased',
      react: null as never,
    })

    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: ['one@example.com'], subject: 'Shares purchased' })
    )
  })

  it('does not look up a user email after an opt-out', async () => {
    const client = singleProfileClient({
      data: { notification_preferences: { events: false } },
      error: null,
    })

    await sendUserNotification(client, 'user-1', 'events', {
      subject: 'Event update',
      react: null as never,
    })

    expect(mockSendEmail).not.toHaveBeenCalled()
  })
})
