'use client'

import Link from 'next/link'
import { useState } from 'react'

import { cn } from '@/lib/utils'
import { buildAdminQueryString } from '@/lib/admin-table-params'
import {
  DEFAULT_ANNOUNCEMENT_SORT,
  type AnnouncementStatus,
  type AnnouncementSortKey,
} from '@/lib/admin-table-config'
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

type SortDir = 'asc' | 'desc'

interface AnnouncementsTableProps {
  /** Current page of announcements, already filtered and sorted server-side. */
  announcements: Announcement[]
  /** Counts across the whole dataset, not just this page. */
  statusCounts: Record<AnnouncementStatus | 'all', number>
  status: AnnouncementStatus | 'all'
  sortKey: AnnouncementSortKey
  sortDir: SortDir
}

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

function getStatus(a: Announcement): AnnouncementStatus {
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

export function AnnouncementsTable({
  announcements,
  statusCounts,
  status,
  sortKey,
  sortDir,
}: AnnouncementsTableProps) {
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null)

  function tableHref(overrides: {
    status?: AnnouncementStatus | 'all'
    sortKey?: AnnouncementSortKey
    sortDir?: SortDir
  }): string {
    const nextStatus = overrides.status ?? status
    const nextSortKey = overrides.sortKey ?? sortKey
    const nextSortDir = overrides.sortDir ?? sortDir
    const isDefaultSort =
      nextSortKey === DEFAULT_ANNOUNCEMENT_SORT.key && nextSortDir === DEFAULT_ANNOUNCEMENT_SORT.dir
    // Changing filter or sort always returns to page 1.
    return `/admin/announcements${buildAdminQueryString({
      status: nextStatus === 'all' ? undefined : nextStatus,
      sort: isDefaultSort ? undefined : nextSortKey,
      dir: isDefaultSort ? undefined : nextSortDir,
    })}`
  }

  function sortHref(key: AnnouncementSortKey): string {
    if (sortKey === key) {
      return tableHref({ sortDir: sortDir === 'asc' ? 'desc' : 'asc' })
    }
    return tableHref({ sortKey: key, sortDir: 'asc' })
  }

  const thClass = 'cursor-pointer select-none'

  const STATUS_FILTERS: { value: AnnouncementStatus | 'all'; label: string }[] = [
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
            <Link
              key={f.value}
              href={tableHref({ status: f.value })}
              data-selected={status === f.value ? 'true' : undefined}
              aria-current={status === f.value ? 'true' : undefined}
            >
              {f.label} ({statusCounts[f.value]})
            </Link>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th className={thClass}>
                <Link href={sortHref('title')}>
                  Title
                  <SortIcon active={sortKey === 'title'} dir={sortDir} />
                </Link>
              </th>
              <th className="hidden sm:table-cell">Status</th>
              <th className={cn(thClass, 'hidden md:table-cell')}>
                <Link href={sortHref('priority')}>
                  Priority
                  <SortIcon active={sortKey === 'priority'} dir={sortDir} />
                </Link>
              </th>
              <th className={cn(thClass, 'hidden lg:table-cell')}>
                <Link href={sortHref('published_at')}>
                  Published
                  <SortIcon active={sortKey === 'published_at'} dir={sortDir} />
                </Link>
              </th>
              <th className={cn(thClass, 'hidden lg:table-cell')}>
                <Link href={sortHref('created_at')}>
                  Created
                  <SortIcon active={sortKey === 'created_at'} dir={sortDir} />
                </Link>
              </th>
              <th className="admin-cell-number">Actions</th>
            </tr>
          </thead>
          <tbody>
            {announcements.length === 0 ? (
              <tr>
                <td colSpan={6} className="admin-empty">
                  {status !== 'all'
                    ? `No ${status} announcements`
                    : 'No announcements yet. Create your first announcement!'}
                </td>
              </tr>
            ) : (
              announcements.map((announcement) => {
                const rowStatus = getStatus(announcement)
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
                          rowStatus === 'published' && 'admin-status-ok',
                          rowStatus === 'expired' && 'admin-status-warn'
                        )}
                      >
                        {rowStatus}
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
