import type { Metadata } from 'next'
import Link from 'next/link'

import { createClient } from '@/lib/supabase/server'
import { SubscribersTable } from '@/components/features/SubscribersTable'

export const metadata: Metadata = {
  title: 'Subscribers',
}

export default async function SubscribersPage() {
  const supabase = await createClient()

  const [subsRes, profilesRes] = await Promise.all([
    supabase
      .from('email_subscribers')
      .select('id, email, confirmed, confirmed_at, unsubscribed_at, created_at')
      .order('created_at', { ascending: false }),
    supabase.from('profiles').select('email'),
  ])

  const profileEmails = new Set(
    (profilesRes.data ?? []).map((p) => (p.email ?? '').toLowerCase()).filter((e) => e.length > 0)
  )

  const all = subsRes.data ?? []
  const activeCount = all.filter((s) => s.confirmed && s.unsubscribed_at === null).length
  const unconfirmedCount = all.filter((s) => !s.confirmed && s.unsubscribed_at === null).length
  const unsubscribedCount = all.filter((s) => s.unsubscribed_at !== null).length

  return (
    <main className="admin-page">
      <div className="admin-page-head">
        <div>
          <h1>Subscribers</h1>
          <p className="admin-page-subtitle">View and manage newsletter subscribers.</p>
        </div>
      </div>

      <p className="admin-notice">
        Subscribers are newsletter-only email signups; invited members with accounts appear under{' '}
        <Link href="/admin/users">Users</Link>.
      </p>

      <div className="admin-stats">
        <SummaryStat label="Total" count={all.length} detail="newsletter signups" />
        <SummaryStat label="Active" count={activeCount} detail="confirmed subscribers" />
        <SummaryStat label="Unconfirmed" count={unconfirmedCount} detail="awaiting confirmation" />
        <SummaryStat
          label="Unsubscribed"
          count={unsubscribedCount}
          detail="no longer receiving email"
        />
      </div>

      <SubscribersTable subscribers={all} profileEmails={profileEmails} />
    </main>
  )
}

// ─── Summary Card ─────────────────────────────────────────────────

function SummaryStat({ label, count, detail }: { label: string; count: number; detail: string }) {
  return (
    <div>
      <div className="admin-stat-label">{label}</div>
      <div className="admin-stat-value">{count}</div>
      <div className="admin-stat-detail">{detail}</div>
    </div>
  )
}
