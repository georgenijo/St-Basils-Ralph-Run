'use client'

import { useActionState } from 'react'

import { updateNotificationPreferences } from '@/actions/notifications'
import { Button } from '@/components/ui'

type Preferences = {
  payments: boolean
  membership: boolean
  shares: boolean
  events: boolean
}

interface ToggleDescriptor {
  key: keyof Preferences
  label: string
  description: string
}

const TOGGLES: ToggleDescriptor[] = [
  {
    key: 'payments',
    label: 'Payments',
    description: 'Payment confirmations, rejections, and event charges.',
  },
  {
    key: 'membership',
    label: 'Membership',
    description: 'Dues reminders and membership renewal notices.',
  },
  {
    key: 'shares',
    label: 'Shares',
    description: 'Share purchase and payment confirmations.',
  },
  {
    key: 'events',
    label: 'Events',
    description: 'Event charge assignments.',
  },
]

export function NotificationSettingsForm({ initial }: { initial: Preferences }) {
  const [state, formAction, pending] = useActionState(updateNotificationPreferences, {
    success: false,
    message: '',
  })

  return (
    <form action={formAction} className="space-y-5">
      {state.message && (
        <div
          role="status"
          className={`rounded-lg border px-4 py-3 text-sm ${
            state.success
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {state.message}
        </div>
      )}

      <ul className="divide-y divide-wood-800/10 rounded-lg border border-wood-800/10 bg-white">
        {TOGGLES.map((t) => (
          <li key={t.key} className="flex items-center justify-between gap-4 px-4 py-4">
            <div>
              <label htmlFor={t.key} className="block text-sm font-medium text-wood-900">
                {t.label}
              </label>
              <p className="text-sm text-wood-800/70">{t.description}</p>
            </div>
            <input
              id={t.key}
              name={t.key}
              type="checkbox"
              defaultChecked={initial[t.key]}
              className="h-5 w-5 rounded border-wood-800/30 text-burgundy-700 focus-visible:ring-2 focus-visible:ring-burgundy-700 focus-visible:ring-offset-2"
            />
          </li>
        ))}
      </ul>

      <Button type="submit" disabled={pending}>
        {pending ? 'Saving…' : 'Save preferences'}
      </Button>
    </form>
  )
}
