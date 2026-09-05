import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { paginationRange, parsePageParam, totalPageCount } from '@/lib/pagination'
import { buildAdminQueryString } from '@/lib/admin-table-params'
import { Button } from '@/components/ui'
import { AdminPagination } from '@/components/features/AdminPagination'
import { EventsTable } from '@/components/features/EventsTable'
import {
  EVENT_CATEGORIES,
  EVENT_SORT_KEYS,
  DEFAULT_EVENT_SORT,
  type EventCategory,
  type EventSortKey,
} from '@/lib/admin-table-config'

export const metadata: Metadata = {
  title: 'Events',
}

type SearchParams = Promise<{
  page?: string | string[]
  category?: string | string[]
  sort?: string | string[]
  dir?: string | string[]
}>

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

export default async function EventsPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createClient()
  const params = await searchParams
  const page = parsePageParam(params.page)
  const { from, to } = paginationRange(page)

  const categoryParam = first(params.category)
  const category: EventCategory | 'all' = (EVENT_CATEGORIES as readonly string[]).includes(
    categoryParam ?? ''
  )
    ? (categoryParam as EventCategory)
    : 'all'

  const sortParam = first(params.sort)
  const sortKey: EventSortKey = (EVENT_SORT_KEYS as readonly string[]).includes(sortParam ?? '')
    ? (sortParam as EventSortKey)
    : DEFAULT_EVENT_SORT.key
  const dirParam = first(params.dir)
  const sortDir: 'asc' | 'desc' =
    dirParam === 'asc' || dirParam === 'desc'
      ? dirParam
      : sortKey === DEFAULT_EVENT_SORT.key
        ? DEFAULT_EVENT_SORT.dir
        : 'asc'

  let query = supabase
    .from('events')
    .select('id, title, slug, start_at, end_at, category, is_recurring, created_at', {
      count: 'exact',
    })
  if (category !== 'all') {
    query = query.eq('category', category)
  }
  const { data: events, count } = await query
    .order(sortKey, { ascending: sortDir === 'asc' })
    .order('id', { ascending: true })
    .range(from, to)

  const totalCount = count ?? 0
  const totalPages = totalPageCount(totalCount)
  if (page > totalPages) {
    redirect(
      `/admin/events${buildAdminQueryString({
        category: category === 'all' ? undefined : category,
        sort: sortParam,
        dir: dirParam,
        page: totalPages > 1 ? String(totalPages) : undefined,
      })}`
    )
  }

  return (
    <main className="admin-page">
      <div className="admin-page-head">
        <div>
          <h1>Events</h1>
          <p className="admin-page-subtitle">
            Manage parish events, liturgical services, and community gatherings.
          </p>
        </div>
        <Button href="/admin/events/new" size="sm" className="admin-button admin-button-primary">
          <span className="flex items-center gap-2">
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
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Event
          </span>
        </Button>
      </div>

      <div className="admin-toolbar">
        <Button
          href="/admin/events/calendar"
          variant="ghost"
          size="sm"
          className="admin-button admin-button-quiet"
        >
          Calendar view
        </Button>
        <span className="admin-toolbar-spacer" />
        <span className="admin-meta">{totalCount} events</span>
      </div>

      <EventsTable events={events ?? []} category={category} sortKey={sortKey} sortDir={sortDir} />
      <AdminPagination
        pathname="/admin/events"
        page={page}
        totalCount={totalCount}
        searchParams={{
          category: category === 'all' ? undefined : category,
          sort: sortParam,
          dir: dirParam,
        }}
      />
    </main>
  )
}
