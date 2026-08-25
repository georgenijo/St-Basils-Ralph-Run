import type { Metadata } from 'next'

import { getRequestLogger } from '@/lib/logger.server'
import { getDataClient } from '@/lib/supabase/auth'
import { PaymentsPageClient } from './PaymentsPageClient'
import type { Payment } from '@/components/features/PaymentsTable'

export const metadata: Metadata = {
  title: 'Payments',
}

export default async function PaymentsPage() {
  // Warm-pooled, RLS-enforced read client — see getDataClient() in lib/supabase/auth.
  const supabase = await getDataClient()

  // Fetch payments with joined family, event, share, and recorder-profile data.
  // The recorder's name is embedded via the payments_recorded_by_fkey FK so it
  // costs no extra round trip, and the pending queue is derived from the main
  // result below instead of a second payments query.
  const [paymentsResult, familiesResult, eventsResult, sharesResult] = await Promise.all([
    supabase
      .from('payments')
      .select(
        `
        id, family_id, type, amount, method, note,
        recorded_by, related_event_id, related_share_id,
        created_at, status, reference_memo,
        families(family_name),
        events(title),
        shares(person_name, year),
        recorder:profiles!payments_recorded_by_fkey(full_name, email)
      `
      )
      .order('created_at', { ascending: false }),
    supabase.from('families').select('id, family_name').order('family_name', { ascending: true }),
    supabase.from('events').select('id, title').order('start_at', { ascending: false }),
    supabase
      .from('shares')
      .select('id, family_id, person_name, year')
      .eq('paid', false)
      .order('year', { ascending: false }),
  ])

  if (paymentsResult.error) {
    const log = await getRequestLogger('admin-payments-page')
    log.error('payments.fetch_failed', { error: paymentsResult.error })
    return (
      <main className="admin-page">
        <h1>Payments</h1>
        <p className="admin-error">Failed to load payments. Please try refreshing the page.</p>
      </main>
    )
  }

  // Transform payments into the flat shape expected by PaymentsTable
  const payments: Payment[] = (paymentsResult.data ?? []).map((p) => {
    const family = p.families as unknown as { family_name: string } | null
    const event = p.events as unknown as { title: string } | null
    const share = p.shares as unknown as { person_name: string; year: number } | null
    const recorder = p.recorder as unknown as {
      full_name: string | null
      email: string | null
    } | null

    return {
      id: p.id,
      family_id: p.family_id,
      type: p.type as Payment['type'],
      amount: p.amount,
      method: p.method,
      note: p.note,
      recorded_by: p.recorded_by,
      related_event_id: p.related_event_id,
      related_share_id: p.related_share_id,
      created_at: p.created_at,
      family_name: family?.family_name ?? null,
      event_title: event?.title ?? null,
      share_label: share ? `${share.person_name} (${share.year})` : null,
      recorded_by_name: p.recorded_by
        ? recorder
          ? recorder.full_name || recorder.email || 'Unknown'
          : null
        : null,
      status: (p.status ?? 'confirmed') as Payment['status'],
      reference_memo: p.reference_memo ?? null,
    }
  })

  // Derive the pending queue from the main result (oldest first) instead of a
  // separate payments query — the main query already fetches every field.
  const pendingPayments = payments
    .filter((p) => p.status === 'pending')
    .map((p) => ({
      id: p.id,
      family_name: p.family_name,
      type: p.type,
      method: p.method,
      amount: p.amount,
      reference_memo: p.reference_memo,
      created_at: p.created_at,
    }))
    .reverse()

  return (
    <main className="admin-page">
      <PaymentsPageClient
        payments={payments}
        pendingPayments={pendingPayments}
        families={familiesResult.data ?? []}
        events={eventsResult.data ?? []}
        unpaidShares={sharesResult.data ?? []}
      />
    </main>
  )
}
