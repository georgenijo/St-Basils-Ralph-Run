'use client'

import { useState, useMemo } from 'react'

import { cn } from '@/lib/utils'
import type { User } from '@/types/user'

// ─── Types ───────────────────────────────────────────────────────────

interface UsersTableProps {
  users: User[]
  currentUserId: string
  selectedUserId?: string | null
  subscribedEmails?: Set<string>
  onRowClick?: (user: User) => void
}

type SortKey = 'name' | 'role' | 'status' | 'created_at'
type SortDir = 'asc' | 'desc'
type FilterValue = '' | 'admin' | 'member' | 'pending' | 'deactivated'

const PAGE_SIZE = 20

// ─── Helpers ─────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  member: 'Member',
}

const FILTER_OPTIONS: { value: FilterValue; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'admin', label: 'Admins' },
  { value: 'member', label: 'Members' },
  { value: 'pending', label: 'Pending' },
  { value: 'deactivated', label: 'Deactivated' },
]

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function getName(u: User): string {
  return u.full_name || u.email || 'Unknown'
}

function getStatus(u: User): 'active' | 'pending' | 'deactivated' {
  if (!u.is_active) return 'deactivated'
  if (!u.email_confirmed_at) return 'pending'
  return 'active'
}

function matchesFilter(u: User, filter: FilterValue): boolean {
  switch (filter) {
    case 'admin':
      return u.role === 'admin'
    case 'member':
      return u.role === 'member' && u.is_active
    case 'pending':
      return u.is_active && !u.email_confirmed_at
    case 'deactivated':
      return !u.is_active
    default:
      return true
  }
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

export function UsersTable({
  users,
  selectedUserId,
  subscribedEmails,
  onRowClick,
}: UsersTableProps) {
  const isSubscribed = (email: string | null | undefined): boolean => {
    if (!email || !subscribedEmails) return false
    return subscribedEmails.has(email.toLowerCase())
  }

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
    let result = users

    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (u) =>
          (u.full_name && u.full_name.toLowerCase().includes(q)) ||
          (u.email && u.email.toLowerCase().includes(q))
      )
    }

    if (filter) {
      result = result.filter((u) => matchesFilter(u, filter))
    }

    return [...result].sort((a, b) => {
      let cmp: number
      switch (sortKey) {
        case 'name':
          cmp = getName(a).localeCompare(getName(b))
          break
        case 'role':
          cmp = a.role.localeCompare(b.role)
          break
        case 'status': {
          const sa = getStatus(a)
          const sb = getStatus(b)
          cmp = sa.localeCompare(sb)
          break
        }
        default:
          cmp = String(a[sortKey]).localeCompare(String(b[sortKey]))
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [users, search, filter, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

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
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
        </div>

        <div className="admin-segmented" role="group" aria-label="Filter users">
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
              <th className={thClass} {...sortableThProps('name')}>
                User
                <SortIcon active={sortKey === 'name'} dir={sortDir} />
              </th>
              <th className={cn(thClass, 'hidden sm:table-cell')} {...sortableThProps('role')}>
                Role
                <SortIcon active={sortKey === 'role'} dir={sortDir} />
              </th>
              <th className={cn(thClass, 'hidden sm:table-cell')} {...sortableThProps('status')}>
                Status
                <SortIcon active={sortKey === 'status'} dir={sortDir} />
              </th>
              <th
                className={cn(thClass, 'hidden sm:table-cell')}
                {...sortableThProps('created_at')}
              >
                Joined
                <SortIcon active={sortKey === 'created_at'} dir={sortDir} />
              </th>
              <th className={cn(thClass, 'hidden lg:table-cell cursor-default')}>Newsletter</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={5} className="admin-empty">
                  {search || filter ? 'No users match your filters.' : 'No users yet.'}
                </td>
              </tr>
            ) : (
              paginated.map((user) => {
                const status = getStatus(user)
                const isSelected = user.id === selectedUserId

                return (
                  <tr
                    key={user.id}
                    onClick={() => onRowClick?.(user)}
                    data-selected={isSelected}
                    className={cn(
                      onRowClick && 'cursor-pointer',
                      !user.is_active && 'admin-cell-secondary'
                    )}
                  >
                    {/* User (name + email) */}
                    <td>
                      <div className="flex flex-col">
                        <span className="admin-cell-primary">{user.full_name || '—'}</span>
                        <span className="admin-list-subtitle">{user.email || '—'}</span>
                      </div>
                    </td>

                    {/* Role badge */}
                    <td className="admin-cell-mono admin-cell-secondary hidden sm:table-cell">
                      <span>{ROLE_LABELS[user.role] ?? user.role}</span>
                    </td>

                    {/* Status badge */}
                    <td className="hidden sm:table-cell">
                      <span
                        className={cn(
                          'admin-status',
                          status === 'active' && 'admin-status-ok',
                          status === 'pending' && 'admin-status-warn'
                        )}
                      >
                        {status === 'active'
                          ? 'Active'
                          : status === 'pending'
                            ? 'Pending'
                            : 'Deactivated'}
                      </span>
                    </td>

                    {/* Joined date */}
                    <td className="admin-cell-secondary hidden sm:table-cell">
                      {formatDate(user.created_at)}
                    </td>

                    {/* Newsletter badge */}
                    <td className="hidden lg:table-cell">
                      {isSubscribed(user.email) ? (
                        <span className="admin-status admin-status-ok">Subscribed</span>
                      ) : (
                        <span className="admin-cell-secondary">—</span>
                      )}
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
            {filtered.length} user{filtered.length !== 1 ? 's' : ''}
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
