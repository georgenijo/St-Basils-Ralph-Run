'use client'

import Link from 'next/link'
import { useState, useMemo } from 'react'

import { formatInChurchTimeZone } from '@/lib/event-time'
import { cn } from '@/lib/utils'
import { DeleteEventDialog } from '@/components/features/DeleteEventDialog'

interface Event {
  id: string
  title: string
  slug: string
  start_at: string
  end_at: string | null
  category: string
  is_recurring: boolean
  created_at: string
}

interface EventsTableProps {
  events: Event[]
}

type SortKey = 'title' | 'start_at' | 'category' | 'created_at'
type SortDir = 'asc' | 'desc'

const CATEGORY_LABELS: Record<string, string> = {
  liturgical: 'Liturgical',
  community: 'Community',
  special: 'Special',
}

function formatDate(iso: string): string {
  return formatInChurchTimeZone(iso, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
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

export function EventsTable({ events }: EventsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('start_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [deleteTarget, setDeleteTarget] = useState<Event | null>(null)

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const filtered = useMemo(() => {
    let result = events
    if (categoryFilter) {
      result = result.filter((e) => e.category === categoryFilter)
    }
    return result.sort((a, b) => {
      const aVal = a[sortKey]
      const bVal = b[sortKey]
      const cmp = String(aVal).localeCompare(String(bVal))
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [events, sortKey, sortDir, categoryFilter])

  const thClass = 'cursor-pointer select-none'

  return (
    <div>
      {/* Filter bar */}
      <div className="admin-toolbar">
        <div className="admin-segmented" role="group" aria-label="Filter events">
          <button
            type="button"
            onClick={() => setCategoryFilter('')}
            aria-pressed={!categoryFilter}
          >
            All
          </button>
          {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setCategoryFilter(value)}
              aria-pressed={categoryFilter === value}
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
              <th className={thClass} onClick={() => toggleSort('title')}>
                Title
                <SortIcon active={sortKey === 'title'} dir={sortDir} />
              </th>
              <th className={thClass} onClick={() => toggleSort('category')}>
                Category
                <SortIcon active={sortKey === 'category'} dir={sortDir} />
              </th>
              <th className={thClass} onClick={() => toggleSort('start_at')}>
                Date
                <SortIcon active={sortKey === 'start_at'} dir={sortDir} />
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
                <td colSpan={5} className="admin-empty">
                  {categoryFilter
                    ? 'No events in this category'
                    : 'No events yet. Create your first event!'}
                </td>
              </tr>
            ) : (
              filtered.map((event) => (
                <tr key={event.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <Link href={`/admin/events/${event.id}`} className="admin-cell-primary">
                        {event.title}
                      </Link>
                      {event.is_recurring && (
                        <span title="Recurring event" className="admin-status">
                          <svg
                            width="10"
                            height="10"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="mr-0.5"
                            aria-hidden="true"
                          >
                            <path d="M21 2v6h-6" />
                            <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                            <path d="M3 22v-6h6" />
                            <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
                          </svg>
                          Recurring
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="admin-cell-secondary">
                    <span>{CATEGORY_LABELS[event.category] ?? event.category}</span>
                  </td>
                  <td className="admin-cell-mono">{formatDate(event.start_at)}</td>
                  <td className="admin-cell-mono admin-cell-secondary hidden lg:table-cell">
                    {formatDate(event.created_at)}
                  </td>
                  <td className="admin-cell-number">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/events/${event.id}/edit`}
                        className="admin-button admin-button-bare"
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(event)}
                        className="admin-button admin-button-bare"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Delete confirmation dialog */}
      {deleteTarget && (
        <DeleteEventDialog
          eventId={deleteTarget.id}
          eventTitle={deleteTarget.title}
          open={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
