import type { Metadata } from 'next'

import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui'
import { NotificationSettingsForm } from './NotificationSettingsForm'

export const metadata: Metadata = {
  title: 'Settings',
}

const DEFAULT_PREFS = {
  payments: true,
  membership: true,
  shares: true,
  events: true,
}

function coercePrefs(value: unknown): typeof DEFAULT_PREFS {
  if (!value || typeof value !== 'object') return DEFAULT_PREFS
  const record = value as Record<string, unknown>
  return {
    payments: typeof record.payments === 'boolean' ? record.payments : DEFAULT_PREFS.payments,
    membership:
      typeof record.membership === 'boolean' ? record.membership : DEFAULT_PREFS.membership,
    shares: typeof record.shares === 'boolean' ? record.shares : DEFAULT_PREFS.shares,
    events: typeof record.events === 'boolean' ? record.events : DEFAULT_PREFS.events,
  }
}

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('notification_preferences')
    .eq('id', user.id)
    .maybeSingle()

  const initial = coercePrefs(profile?.notification_preferences)

  return (
    <main className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-semibold text-wood-900">Notification Settings</h1>
        <p className="mt-1 text-sm text-wood-800/70">
          Choose which transactional emails you&apos;d like to receive.
        </p>
      </div>
      <Card variant="outlined" className="p-6">
        <NotificationSettingsForm initial={initial} />
      </Card>
    </main>
  )
}
