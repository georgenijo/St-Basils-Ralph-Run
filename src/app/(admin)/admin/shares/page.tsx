import type { Metadata } from 'next'

import { createClient } from '@/lib/supabase/server'
import { SharesPageClient } from './SharesPageClient'

export const metadata: Metadata = {
  title: 'Shares',
}

export default async function SharesPage() {
  const supabase = await createClient()

  const { data: shares, error } = await supabase
    .from('shares')
    .select('id, person_name, year, amount, paid, created_at, family_id, families(family_name)')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch shares:', error)
    return (
      <main className="admin-page">
        <h1>Shares</h1>
        <p className="admin-error">Failed to load shares. Please try refreshing the page.</p>
      </main>
    )
  }

  // Flatten the joined family name and normalize the shape
  const all = (shares ?? []).map((s) => ({
    id: s.id,
    person_name: s.person_name,
    year: s.year,
    amount: Number(s.amount),
    paid: s.paid,
    created_at: s.created_at,
    family_id: s.family_id,
    family_name:
      (s.families as unknown as { family_name: string } | null)?.family_name ?? 'Unknown',
  }))

  // Distinct years for the selector (descending)
  const years = [...new Set(all.map((s) => s.year))].sort((a, b) => b - a)

  // If no shares exist yet, default the year selector to the current year
  const currentYear = new Date().getFullYear()
  if (years.length === 0) {
    years.push(currentYear)
  }

  // Summary stats for the default year (current year)
  const defaultYear = years.includes(currentYear) ? currentYear : years[0]
  const forYear = all.filter((s) => s.year === defaultYear)
  const totalShares = forYear.length
  const totalRevenue = forYear.reduce((sum, s) => sum + s.amount, 0)
  const paidCount = forYear.filter((s) => s.paid).length
  const unpaidCount = forYear.filter((s) => !s.paid).length

  return (
    <main className="admin-page">
      <div className="admin-page-head">
        <div>
          <h1>Shares</h1>
          <p className="admin-page-subtitle">Manage remembrance shares and payment status.</p>
        </div>
      </div>

      <div className="admin-stats">
        <SummaryStat label="Total shares" value={String(totalShares)} detail={`${defaultYear}`} />
        <SummaryStat
          label="Total Revenue"
          value={`$${totalRevenue.toLocaleString('en-US')}`}
          detail="recorded value"
        />
        <SummaryStat label="Paid" value={String(paidCount)} detail="completed" />
        <SummaryStat label="Unpaid" value={String(unpaidCount)} detail="outstanding" />
      </div>

      <SharesPageClient shares={all} years={years} defaultYear={defaultYear} />
    </main>
  )
}

// ─── Summary Card ─────────────────────────────────────────────────

function SummaryStat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div>
      <div className="admin-stat-label">{label}</div>
      <div className="admin-stat-value">{value}</div>
      <div className="admin-stat-detail">{detail}</div>
    </div>
  )
}
