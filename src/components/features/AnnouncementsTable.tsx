'use client'

import Link from 'next/link'
import { useState, useMemo } from 'react'

import { cn } from '@/lib/utils'
import { DeleteAnnouncementDialog } from '@/components/features/DeleteAnnouncementDialog'

interface Announcement {
  id: string
  title: string
  slug: string
  priority: number
  is_pinned: boolean
  published_at: string | null
  expires_at: string | null
  created_at: string
}

interface AnnouncementsTableProps {
  announcements: Announcement[]
}

type StatusFilter = 'all' | 'published' | 'draft' | 'expired'
type SortKey = 'title' | 'priority' | 'published_at' | 'created_at'
type SortDir = 'asc' | 'desc'

const PRIORITY_LABELS: Record<number, string> = {
  0: 'Normal',
  1: 'Low',
  5: 'Medium',
  10: 'High',
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function getStatus(a: Announcement): 'published' | 'draft' | 'expired' {
  if (!a.published_at) return 'draft'
  if (a.expires_at && new Date(a.expires_at) < new Date()) return 'expired'
  return 'published'
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

export function AnnouncementsTable({ announcements }: AnnouncementsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('created_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null)

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const filtered = useMemo(() => {
    let result = announcements
    if (statusFilter !== 'all') {
      result = result.filter((a) => getStatus(a) === statusFilter)
    }
    return result.sort((a, b) => {
      const aVal = a[sortKey] ?? ''
      const bVal = b[sortKey] ?? ''
      const cmp = String(aVal).localeCompare(String(bVal))
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [announcements, sortKey, sortDir, statusFilter])

  const statusCounts = useMemo(() => {
    const counts = { all: announcements.length, published: 0, draft: 0, expired: 0 }
    for (const a of announcements) {
      counts[getStatus(a)]++
    }
    return counts
  }, [announcements])

  const thClass = 'cursor-pointer select-none'

  const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'published', label: 'Published' },
    { value: 'draft', label: 'Draft' },
    { value: 'expired', label: 'Expired' },
  ]

  return (
    <div>
      {/* Status filter tabs */}
      <div className="admin-toolbar">
        <div className="admin-segmented" role="group" aria-label="Filter announcements">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setStatusFilter(f.value)}
              aria-pressed={statusFilter === f.value}
            >
              {f.label} ({statusCounts[f.value]})
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th className={thClass} onClick={() => toggleSort('title')}>
                Title
                <SortIcon active={sortKey === 'title'} dir={sortDir} />
              </th>
              <th className={cn(thClass, 'hidden sm:table-cell')}>Status</th>
              <th
                className={cn(thClass, 'hidden md:table-cell')}
                onClick={() => toggleSort('priority')}
              >
                Priority
                <SortIcon active={sortKey === 'priority'} dir={sortDir} />
              </th>
              <th
                className={cn(thClass, 'hidden lg:table-cell')}
                onClick={() => toggleSort('published_at')}
              >
                Published
                <SortIcon active={sortKey === 'published_at'} dir={sortDir} />
              </th>
              <th
                className={cn(thClass, 'hidden lg:table-cell')}
                onClick={() => toggleSort('created_at')}
              >
                Created
                <SortIcon active={sortKey === 'created_at'} dir={sortDir} />
              </th>
              <th className="admin-cell-number">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="admin-empty">
                  {statusFilter !== 'all'
                    ? `No ${statusFilter} announcements`
                    : 'No announcements yet. Create your first announcement!'}
                </td>
              </tr>
            ) : (
              filtered.map((announcement) => {
                const status = getStatus(announcement)
                return (
                  <tr key={announcement.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/announcements/${announcement.id}/edit`}
                          className="admin-cell-primary"
                        >
                          {announcement.title}
                        </Link>
                        {announcement.is_pinned && (
                          <span title="Pinned" className="admin-status">
                            Pinned
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="hidden sm:table-cell">
                      <span
                        className={cn(
                          'admin-status capitalize',
                          status === 'published' && 'admin-status-ok',
                          status === 'expired' && 'admin-status-warn'
                        )}
                      >
                        {status}
                      </span>
                    </td>
                    <td className="admin-cell-secondary hidden md:table-cell">
                      <span>
                        {PRIORITY_LABELS[announcement.priority] ?? `P${announcement.priority}`}
                      </span>
                    </td>
                    <td className="admin-cell-mono hidden lg:table-cell">
                      {formatDate(announcement.published_at)}
                    </td>
                    <td className="admin-cell-mono admin-cell-secondary hidden lg:table-cell">
                      {formatDate(announcement.created_at)}
                    </td>
                    <td className="admin-cell-number">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/announcements/${announcement.id}/edit`}
                          className="admin-button admin-button-bare"
                        >
                          Edit
                        </Link>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(announcement)}
                          className="admin-button admin-button-bare"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Delete confirmation dialog */}
      {deleteTarget && (
        <DeleteAnnouncementDialog
          announcementId={deleteTarget.id}
          announcementTitle={deleteTarget.title}
          open={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
