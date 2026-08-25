'use client'

import { useState, useMemo } from 'react'

import { cn } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────────

interface Subscriber {
  id: string
  email: string
  confirmed: boolean
  confirmed_at: string | null
  unsubscribed_at: string | null
  created_at: string
}

interface SubscribersTableProps {
  subscribers: Subscriber[]
  profileEmails?: Set<string>
}

type SortKey = 'email' | 'status' | 'created_at'
type SortDir = 'asc' | 'desc'

const PAGE_SIZE = 20

// ─── Helpers ─────────────────────────────────────────────────────────

function getStatus(s: Subscriber): 'active' | 'unconfirmed' | 'unsubscribed' {
  if (s.unsubscribed_at !== null) return 'unsubscribed'
  if (s.confirmed) return 'active'
  return 'unconfirmed'
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  unconfirmed: 'Unconfirmed',
  unsubscribed: 'Unsubscribed',
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
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

export function SubscribersTable({
  subscribers,
  profileEmails = new Set(),
}: SubscribersTableProps) {
  function hasAccount(email: string): boolean {
    return profileEmails.has(email.toLowerCase())
  }

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
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
    let result = subscribers

    if (search) {
      const q = search.toLowerCase()
      result = result.filter((s) => s.email.toLowerCase().includes(q))
    }

    if (statusFilter) {
      result = result.filter((s) => getStatus(s) === statusFilter)
    }

    return result.sort((a, b) => {
      let cmp: number
      if (sortKey === 'status') {
        cmp = getStatus(a).localeCompare(getStatus(b))
      } else {
        cmp = String(a[sortKey]).localeCompare(String(b[sortKey]))
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [subscribers, search, statusFilter, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function exportCsv() {
    const header = 'Email,Status,Has Account,Confirmed At,Signed Up\n'
    const rows = filtered
      .map((s) => {
        const status = getStatus(s)
        const confirmedAt = s.confirmed_at ? new Date(s.confirmed_at).toISOString() : ''
        const createdAt = new Date(s.created_at).toISOString()
        return `${s.email},${status},${hasAccount(s.email) ? 'yes' : 'no'},${confirmedAt},${createdAt}`
      })
      .join('\n')

    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `subscribers-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const thClass = 'cursor-pointer select-none'

  return (
    <div>
      {/* Toolbar */}
      <div className="admin-toolbar">
        {/* Search */}
        <div className="admin-search">
          <SearchIcon />
          <input
            type="search"
            placeholder="Search by email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
        </div>

        <div className="admin-segmented" role="group" aria-label="Filter subscribers">
          {['', 'active', 'unconfirmed', 'unsubscribed'].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setStatusFilter(value)
                setPage(1)
              }}
              aria-pressed={statusFilter === value}
            >
              {value ? STATUS_LABELS[value] : 'All'}
            </button>
          ))}
        </div>

        {/* CSV export */}
        <button
          type="button"
          onClick={exportCsv}
          className="admin-button admin-button-quiet ml-auto"
        >
          <DownloadIcon />
          Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th className={thClass} onClick={() => toggleSort('email')}>
                Email
                <SortIcon active={sortKey === 'email'} dir={sortDir} />
              </th>
              <th className={thClass} onClick={() => toggleSort('status')}>
                Status
                <SortIcon active={sortKey === 'status'} dir={sortDir} />
              </th>
              <th className={cn(thClass, 'hidden md:table-cell cursor-default')}>Account</th>
              <th
                className={cn(thClass, 'hidden sm:table-cell')}
                onClick={() => toggleSort('created_at')}
              >
                Signed Up
                <SortIcon active={sortKey === 'created_at'} dir={sortDir} />
              </th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={4} className="admin-empty">
                  {search || statusFilter
                    ? 'No subscribers match your filters'
                    : 'No subscribers yet.'}
                </td>
              </tr>
            ) : (
              paginated.map((subscriber) => {
                const status = getStatus(subscriber)
                const linked = hasAccount(subscriber.email)
                return (
                  <tr key={subscriber.id}>
                    <td className="admin-cell-primary">{subscriber.email}</td>
                    <td>
                      <span
                        className={cn(
                          'admin-status',
                          status === 'active' && 'admin-status-ok',
                          status === 'unconfirmed' && 'admin-status-warn'
                        )}
                      >
                        {STATUS_LABELS[status]}
                      </span>
                    </td>
                    <td className="hidden md:table-cell">
                      {linked ? (
                        <span className="admin-status">Has Account</span>
                      ) : (
                        <span className="admin-cell-secondary">—</span>
                      )}
                    </td>
                    <td className="admin-cell-mono admin-cell-secondary hidden sm:table-cell">
                      {formatDate(subscriber.created_at)}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="admin-pagination">
          <p>
            {filtered.length} subscriber{filtered.length !== 1 ? 's' : ''}
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

function DownloadIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}
