'use client'

import { useMemo, useState } from 'react'

import { cn } from '@/lib/utils'
import type { AdminFamily } from '@/types/admin-family'

interface FamiliesTableProps {
  families: AdminFamily[]
  selectedFamilyId?: string | null
  onRowClick?: (family: AdminFamily) => void
}

const PAGE_SIZE = 20

function formatDate(date: string | null): string {
  if (!date) return '—'
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function FamiliesTable({ families, selectedFamilyId, onRowClick }: FamiliesTableProps) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return families.filter(
      (family) =>
        (!query || family.family_name.toLowerCase().includes(query)) &&
        (!status || family.membership_status === status)
    )
  }, [families, search, status])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  return (
    <div>
      <div className="admin-toolbar">
        <div className="admin-search">
          <SearchIcon />
          <input
            type="search"
            placeholder="Search family name..."
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
          />
        </div>
        <div className="admin-segmented" role="group" aria-label="Filter families">
          {[
            ['', 'All'],
            ['active', 'Active'],
            ['pending', 'Pending'],
            ['expired', 'Expired'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setStatus(value)
                setPage(1)
              }}
              aria-pressed={status === value}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Family</th>
              <th className="hidden sm:table-cell">Status</th>
              <th className="hidden md:table-cell">Membership</th>
              <th className="hidden sm:table-cell">Members</th>
              <th className="hidden lg:table-cell">Expires</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={5} className="admin-empty">
                  {search || status ? 'No families match your filters.' : 'No families yet.'}
                </td>
              </tr>
            ) : (
              paginated.map((family) => (
                <tr
                  key={family.id}
                  onClick={() => onRowClick?.(family)}
                  data-selected={family.id === selectedFamilyId}
                  className={cn(onRowClick && 'cursor-pointer')}
                >
                  <td>
                    <span className="admin-cell-primary">{family.family_name}</span>
                  </td>
                  <td className="hidden sm:table-cell">
                    <span
                      className={cn(
                        'admin-status',
                        family.membership_status === 'active' && 'admin-status-ok',
                        family.membership_status === 'pending' && 'admin-status-warn'
                      )}
                    >
                      {family.membership_status}
                    </span>
                  </td>
                  <td className="admin-cell-secondary hidden md:table-cell">
                    {family.membership_type ?? '—'}
                  </td>
                  <td className="admin-cell-mono admin-cell-secondary hidden sm:table-cell">
                    {family.member_count}
                  </td>
                  <td className="admin-cell-secondary hidden lg:table-cell">
                    {formatDate(family.membership_expires_at)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="admin-pagination">
          <p>
            {filtered.length} famil{filtered.length === 1 ? 'y' : 'ies'}
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setPage(currentPage - 1)}
              className="admin-button admin-button-bare"
            >
              Previous
            </button>
            <span className="admin-meta px-2">
              {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setPage(currentPage + 1)}
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
      <path d="m21 21-4.35-4.35" />
    </svg>
  )
}
