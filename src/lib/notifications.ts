import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import type { ReactElement } from 'react'

import { sendEmail } from '@/lib/email'

export type NotificationCategory = 'payments' | 'membership' | 'shares' | 'events'

export const FROM_ADDRESS = "St. Basil's Church <noreply@stbasilsboston.org>"

const DEFAULT_PREFS: Record<NotificationCategory, boolean> = {
  payments: true,
  membership: true,
  shares: true,
  events: true,
}

export async function shouldNotify(
  supabase: SupabaseClient,
  userId: string,
  category: NotificationCategory
): Promise<boolean> {
  const { data, error } = await supabase
    .from('profiles')
    .select('notification_preferences')
    .eq('id', userId)
    .maybeSingle()

  if (error || !data) return DEFAULT_PREFS[category]

  const prefs = (data.notification_preferences ?? {}) as Record<string, unknown>
  const value = prefs[category]
  if (typeof value === 'boolean') return value
  return DEFAULT_PREFS[category]
}

export async function getFamilyEmails(
  supabase: SupabaseClient,
  familyId: string
): Promise<Array<{ id: string; email: string }>> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('family_id', familyId)
    .not('email', 'is', null)

  if (error || !data) return []

  return data
    .filter((p): p is { id: string; email: string } => Boolean(p.email))
    .map((p) => ({ id: p.id, email: p.email }))
}

interface FamilyNotificationPayload {
  subject: string
  react: ReactElement
}

export async function sendFamilyNotification(
  supabase: SupabaseClient,
  familyId: string,
  category: NotificationCategory,
  payload: FamilyNotificationPayload
): Promise<void> {
  const recipients = await getFamilyEmails(supabase, familyId)
  if (recipients.length === 0) return

  const filtered: string[] = []
  for (const recipient of recipients) {
    const allowed = await shouldNotify(supabase, recipient.id, category)
    if (allowed) filtered.push(recipient.email)
  }

  if (filtered.length === 0) return

  try {
    await sendEmail({
      from: FROM_ADDRESS,
      to: filtered,
      subject: payload.subject,
      react: payload.react,
    })
  } catch (err) {
    console.error('[sendFamilyNotification] email send failed:', err)
  }
}

export async function sendUserNotification(
  supabase: SupabaseClient,
  userId: string,
  category: NotificationCategory,
  payload: FamilyNotificationPayload
): Promise<void> {
  const allowed = await shouldNotify(supabase, userId, category)
  if (!allowed) return

  const { data, error } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', userId)
    .maybeSingle()

  if (error || !data?.email) return

  try {
    await sendEmail({
      from: FROM_ADDRESS,
      to: data.email,
      subject: payload.subject,
      react: payload.react,
    })
  } catch (err) {
    console.error('[sendUserNotification] email send failed:', err)
  }
}
