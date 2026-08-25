'use client'

import { useState, useMemo } from 'react'

import { cn } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────────

export interface Payment {
  id: string
  family_id: string
  type: 'membership' | 'share' | 'event' | 'donation'
  amount: number
  method: string | null
  note: string | null
  recorded_by: string | null
  related_event_id: string | null
  related_share_id: string | null
  created_at: string
  family_name: string | null
  event_title: string | null
  share_label: string | null
  recorded_by_name: string | null
  status: 'pending' | 'confirmed' | 'rejected'
  reference_memo: string | null
}

interface PaymentsTableProps {
  payments: Payment[]
}

type SortKey = 'family' | 'type' | 'amount' | 'method' | 'date'
type SortDir = 'asc' | 'desc'
type FilterValue = '' | 'membership' | 'share' | 'event' | 'donation'

// ─── Constants ──────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  membership: 'Membership',
  share: 'Share',
  event: 'Event',
  donation: 'Donation',
}

const METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  check: 'Check',
  zelle: 'Zelle',
  venmo: 'Venmo',
  cashapp: 'Cash App',
  online: 'Online',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  rejected: 'Rejected',
}

const FILTER_OPTIONS: { value: FilterValue; label: string }[] = [
  { value: '', label: 'All Types' },
  { value: 'membership', label: 'Membership' },
  { value: 'share', label: 'Share' },
  { value: 'event', label: 'Event' },
  { value: 'donation', label: 'Donation' },
]

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// ─── Component ──────────────────────────────────────────────────────

export function PaymentsTable({ payments }: PaymentsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [filter, setFilter] = useState<FilterValue>('')
  const [search, setSearch] = useState('')

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'date' ? 'desc' : 'asc')
    }
  }

  const filtered = useMemo(() => {
    let result = payments

    if (filter) {
      result = result.filter((p) => p.type === filter)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (p) =>
          p.family_name?.toLowerCase().includes(q) ||
          p.note?.toLowerCase().includes(q) ||
          p.event_title?.toLowerCase().includes(q)
      )
    }

    result = [...result].sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case 'family':
          cmp = (a.family_name ?? '').localeCompare(b.family_name ?? '')
          break
        case 'type':
          cmp = a.type.localeCompare(b.type)
          break
        case 'amount':
          cmp = a.amount - b.amount
          break
        case 'method':
          cmp = (a.method ?? '').localeCompare(b.method ?? '')
          break
        case 'date':
          cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })

    return result
  }, [payments, filter, search, sortKey, sortDir])

  return (
    <div>
      {/* Toolbar */}
      <div className="admin-toolbar">
        {/* Search */}
        <div className="admin-search">
          <SearchIcon />
          <input
            type="text"
            placeholder="Search payments..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Filter */}
        <div className="admin-segmented" role="group" aria-label="Filter payments">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setFilter(opt.value)}
              aria-pressed={filter === opt.value}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="admin-table-wrap">
        <div>
          <table className="admin-table">
            <thead>
              <tr>
                <SortHeader
                  label="Family"
                  sortKey="family"
                  current={sortKey}
                  dir={sortDir}
                  onSort={toggleSort}
                />
                <SortHeader
                  label="Type"
                  sortKey="type"
                  current={sortKey}
                  dir={sortDir}
                  onSort={toggleSort}
                />
                <SortHeader
                  label="Amount"
                  sortKey="amount"
                  current={sortKey}
                  dir={sortDir}
                  onSort={toggleSort}
                  className="text-right"
                />
                <SortHeader
                  label="Method"
                  sortKey="method"
                  current={sortKey}
                  dir={sortDir}
                  onSort={toggleSort}
                />
                <th>Detail</th>
                <th className="hidden lg:table-cell">Recorded By</th>
                <th>Status</th>
                <SortHeader
                  label="Date"
                  sortKey="date"
                  current={sortKey}
                  dir={sortDir}
                  onSort={toggleSort}
                />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="admin-empty">
                    {payments.length === 0
                      ? 'No payments recorded yet.'
                      : 'No payments match the current filter.'}
                  </td>
                </tr>
              ) : (
                filtered.map((payment) => (
                  <tr key={payment.id}>
                    <td className="admin-cell-primary whitespace-nowrap">
                      {payment.family_name ?? '—'}
                    </td>
                    <td className="admin-cell-mono admin-cell-secondary whitespace-nowrap">
                      <span>{TYPE_LABELS[payment.type] ?? payment.type}</span>
                    </td>
                    <td className="admin-cell-number whitespace-nowrap">
                      {usd.format(payment.amount)}
                    </td>
                    <td className="admin-cell-secondary whitespace-nowrap">
                      {METHOD_LABELS[payment.method ?? ''] ?? payment.method ?? '—'}
                    </td>
                    <td className="admin-cell-secondary max-w-[200px] truncate">
                      {payment.type === 'event' && payment.event_title
                        ? payment.event_title
                        : payment.type === 'share' && payment.share_label
                          ? payment.share_label
                          : payment.note || '—'}
                    </td>
                    <td className="admin-cell-secondary hidden whitespace-nowrap lg:table-cell">
                      {payment.recorded_by_name ?? '—'}
                    </td>
                    <td className="whitespace-nowrap">
                      <span
                        className={cn(
                          'admin-status',
                          payment.status === 'confirmed' && 'admin-status-ok',
                          payment.status === 'pending' && 'admin-status-warn'
                        )}
                      >
                        {STATUS_LABELS[payment.status] ?? payment.status}
                      </span>
                    </td>
                    <td className="admin-cell-secondary whitespace-nowrap">
                      {formatDate(payment.created_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Count */}
      {filtered.length > 0 && (
        <p className="admin-meta mt-3">
          Showing {filtered.length} of {payments.length} payments
        </p>
      )}
    </div>
  )
}

// ─── Sub-components ─────────────────────────────────────────────────

function SortHeader({
  label,
  sortKey,
  current,
  dir,
  onSort,
  className,
}: {
  label: string
  sortKey: SortKey
  current: SortKey
  dir: SortDir
  onSort: (key: SortKey) => void
  className?: string
}) {
  const isActive = current === sortKey

  return (
    <th className={className}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="inline-flex items-center gap-1"
      >
        {label}
        {isActive && (
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={dir === 'desc' ? 'rotate-180' : ''}
            aria-hidden="true"
          >
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
        )}
      </button>
    </th>
  )
}

function SearchIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}
