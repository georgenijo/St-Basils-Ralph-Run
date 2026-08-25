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
      <main className="px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="font-heading text-3xl font-semibold text-wood-900">Payments</h1>
        <p className="mt-4 font-body text-sm text-red-600">
          Failed to load payments. Please try refreshing the page.
        </p>
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

  // Summary counts
  const total = payments.length
  const pendingCount = payments.filter((p) => p.status === 'pending').length
  const membershipCount = payments.filter((p) => p.type === 'membership').length
  const shareCount = payments.filter((p) => p.type === 'share').length
  const eventCount = payments.filter((p) => p.type === 'event').length
  const donationCount = payments.filter((p) => p.type === 'donation').length

  return (
    <main className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="font-heading text-3xl font-semibold text-wood-900">Payments</h1>
        <p className="mt-1 font-body text-sm text-wood-800/60">
          Record and track member payments, dues, and donations.
        </p>
      </div>

      {/* Summary cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-6">
        <SummaryCard label="Total" count={total} />
        <SummaryCard label="Pending" count={pendingCount} accent="amber" />
        <SummaryCard label="Membership" count={membershipCount} accent="indigo" />
        <SummaryCard label="Share" count={shareCount} accent="amber" />
        <SummaryCard label="Event" count={eventCount} accent="green" />
        <SummaryCard label="Donation" count={donationCount} accent="violet" />
      </div>

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

// ─── Summary Card ─────────────────────────────────────────────────

function SummaryCard({
  label,
  count,
  accent,
}: {
  label: string
  count: number
  accent?: 'indigo' | 'amber' | 'green' | 'violet'
}) {
  const dotColor =
    accent === 'indigo'
      ? 'bg-indigo-500'
      : accent === 'amber'
        ? 'bg-amber-500'
        : accent === 'green'
          ? 'bg-emerald-500'
          : accent === 'violet'
            ? 'bg-violet-500'
            : 'bg-burgundy-700'

  return (
    <div className="rounded-2xl border border-wood-800/10 bg-cream-50 p-5">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${dotColor}`} aria-hidden="true" />
        <span className="font-body text-sm font-medium text-wood-800/60">{label}</span>
      </div>
      <p className="mt-2 font-heading text-3xl font-semibold text-wood-900">{count}</p>
    </div>
  )
}
