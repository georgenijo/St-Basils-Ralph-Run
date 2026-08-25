'use client'

import { useState, useMemo } from 'react'

import { cn } from '@/lib/utils'
import type { Share } from '@/app/(admin)/admin/shares/SharesPageClient'

// ─── Types ───────────────────────────────────────────────────────────

interface SharesTableProps {
  shares: Share[]
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onToggleSelectAll: (ids: string[]) => void
  onMarkPaid: (ids: string[]) => void
}

type SortKey = 'person_name' | 'family_name' | 'amount' | 'paid' | 'created_at'
type SortDir = 'asc' | 'desc'
type FilterValue = '' | 'paid' | 'unpaid'

const PAGE_SIZE = 20

const FILTER_OPTIONS: { value: FilterValue; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'paid', label: 'Paid' },
  { value: 'unpaid', label: 'Unpaid' },
]

// ─── Helpers ─────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      className={cn('ml-1 inline-block transition-transform', !active && 'opacity-30')}
      aria-hidden="true"
    >
      <path
        d="M6 2L9 5H3L6 2Z"
        fill="currentColor"
        className={cn(active && dir === 'asc' ? 'opacity-100' : 'opacity-30')}
      />
      <path
        d="M6 10L3 7H9L6 10Z"
        fill="currentColor"
        className={cn(active && dir === 'desc' ? 'opacity-100' : 'opacity-30')}
      />
    </svg>
  )
}

// ─── Component ───────────────────────────────────────────────────────

export function SharesTable({
  shares,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onMarkPaid,
}: SharesTableProps) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterValue>('')
  const [sortKey, setSortKey] = useState<SortKey>('created_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [page, setPage] = useState(1)

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
    setPage(1)
  }

  const filtered = useMemo(() => {
    let result = shares

    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (s) => s.person_name.toLowerCase().includes(q) || s.family_name.toLowerCase().includes(q)
      )
    }

    if (filter === 'paid') {
      result = result.filter((s) => s.paid)
    } else if (filter === 'unpaid') {
      result = result.filter((s) => !s.paid)
    }

    return [...result].sort((a, b) => {
      let cmp: number
      switch (sortKey) {
        case 'person_name':
          cmp = a.person_name.localeCompare(b.person_name)
          break
        case 'family_name':
          cmp = a.family_name.localeCompare(b.family_name)
          break
        case 'amount':
          cmp = a.amount - b.amount
          break
        case 'paid':
          cmp = Number(a.paid) - Number(b.paid)
          break
        default:
          cmp = a.created_at.localeCompare(b.created_at)
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [shares, search, filter, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const pageIds = paginated.map((s) => s.id)
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id))

  const thClass = 'cursor-pointer select-none'

  function sortableThProps(key: SortKey) {
    return {
      onClick: () => toggleSort(key),
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          toggleSort(key)
        }
      },
      tabIndex: 0 as const,
      role: 'button' as const,
      'aria-sort': (sortKey === key ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none') as
        | 'ascending'
        | 'descending'
        | 'none',
    }
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="admin-toolbar">
        {/* Search */}
        <div className="admin-search">
          <SearchIcon />
          <input
            type="search"
            placeholder="Search by name or family..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
        </div>

        <div className="admin-segmented" role="group" aria-label="Filter shares">
          {FILTER_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setFilter(value)
                setPage(1)
              }}
              aria-pressed={filter === value}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th className="w-10">
                <input
                  type="checkbox"
                  checked={allPageSelected}
                  onChange={() => onToggleSelectAll(pageIds)}
                  className="h-4 w-4 rounded border-wood-800/20 text-burgundy-700 focus:ring-burgundy-700/20"
                  aria-label="Select all on this page"
                />
              </th>
              <th className={thClass} {...sortableThProps('person_name')}>
                Person Name
                <SortIcon active={sortKey === 'person_name'} dir={sortDir} />
              </th>
              <th
                className={cn(thClass, 'hidden sm:table-cell')}
                {...sortableThProps('family_name')}
              >
                Bought By
                <SortIcon active={sortKey === 'family_name'} dir={sortDir} />
              </th>
              <th className={cn(thClass, 'hidden sm:table-cell')} {...sortableThProps('amount')}>
                Amount
                <SortIcon active={sortKey === 'amount'} dir={sortDir} />
              </th>
              <th className={thClass} {...sortableThProps('paid')}>
                Status
                <SortIcon active={sortKey === 'paid'} dir={sortDir} />
              </th>
              <th
                className={cn(thClass, 'hidden sm:table-cell')}
                {...sortableThProps('created_at')}
              >
                Date
                <SortIcon active={sortKey === 'created_at'} dir={sortDir} />
              </th>
              <th className="w-10">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={7} className="admin-empty">
                  {search || filter ? 'No shares match your filters.' : 'No shares yet.'}
                </td>
              </tr>
            ) : (
              paginated.map((share) => (
                <tr key={share.id} data-selected={selectedIds.has(share.id)}>
                  {/* Checkbox */}
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(share.id)}
                      onChange={() => onToggleSelect(share.id)}
                      className="h-4 w-4 rounded border-wood-800/20 text-burgundy-700 focus:ring-burgundy-700/20"
                      aria-label={`Select ${share.person_name}`}
                    />
                  </td>

                  {/* Person Name */}
                  <td>
                    <span className="admin-cell-primary">{share.person_name}</span>
                  </td>

                  {/* Bought By (family) */}
                  <td className="admin-cell-mono admin-cell-secondary hidden sm:table-cell">
                    <span>{share.family_name}</span>
                  </td>

                  {/* Amount */}
                  <td className="admin-cell-number hidden sm:table-cell">
                    <span>{formatCurrency(share.amount)}</span>
                  </td>

                  {/* Status badge */}
                  <td>
                    <span
                      className={cn(
                        'admin-status',
                        share.paid ? 'admin-status-ok' : 'admin-status-warn'
                      )}
                    >
                      {share.paid ? 'Paid' : 'Unpaid'}
                    </span>
                  </td>

                  {/* Date */}
                  <td className="admin-cell-secondary hidden sm:table-cell">
                    {formatDate(share.created_at)}
                  </td>

                  {/* Action */}
                  <td>
                    {!share.paid && (
                      <button
                        type="button"
                        onClick={() => onMarkPaid([share.id])}
                        className="admin-button admin-button-bare"
                        title="Mark as paid"
                        aria-label={`Mark ${share.person_name} as paid`}
                      >
                        <CheckIcon />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="admin-pagination">
          <p>
            {filtered.length} share{filtered.length !== 1 ? 's' : ''}
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="admin-button admin-button-bare"
            >
              Previous
            </button>
            <span className="admin-meta px-2">
              {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="admin-button admin-button-bare"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Icons ───────────────────────────────────────────────────────────

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
      <path d="M21 21l-4.3-4.3" />
    </svg>
  )
}

function CheckIcon() {
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
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}
