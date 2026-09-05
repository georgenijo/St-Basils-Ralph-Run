import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { paginationRange, parsePageParam, totalPageCount } from '@/lib/pagination'
import { buildAdminQueryString } from '@/lib/admin-table-params'
import { Button } from '@/components/ui'
import { AdminPagination } from '@/components/features/AdminPagination'
import { AnnouncementsTable } from '@/components/features/AnnouncementsTable'
import {
  ANNOUNCEMENT_SORT_KEYS,
  ANNOUNCEMENT_STATUSES,
  DEFAULT_ANNOUNCEMENT_SORT,
  type AnnouncementSortKey,
  type AnnouncementStatus,
} from '@/lib/admin-table-config'

export const metadata: Metadata = {
  title: 'Announcements',
}

type SearchParams = Promise<{
  page?: string | string[]
  status?: string | string[]
  sort?: string | string[]
  dir?: string | string[]
}>

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

/** Status is derived: draft = unpublished, expired = published with a past
 *  expiry, published = the rest. The same expressions drive both the filtered
 *  page query and the per-status counts so badges always match the filters. */
function applyStatusFilter<
  Q extends {
    is(column: string, value: null): Q
    not(column: string, operator: string, value: null): Q
    lt(column: string, value: string): Q
    or(expression: string): Q
  },
>(query: Q, status: AnnouncementStatus | 'all', nowIso: string): Q {
  if (status === 'draft') return query.is('published_at', null)
  if (status === 'expired') return query.not('published_at', 'is', null).lt('expires_at', nowIso)
  if (status === 'published') {
    return query.not('published_at', 'is', null).or(`expires_at.is.null,expires_at.gte.${nowIso}`)
  }
  return query
}

export default async function AnnouncementsPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createClient()
  const params = await searchParams
  const page = parsePageParam(params.page)
  const { from, to } = paginationRange(page)
  const nowIso = new Date().toISOString()

  const statusParam = first(params.status)
  const status: AnnouncementStatus | 'all' = (ANNOUNCEMENT_STATUSES as readonly string[]).includes(
    statusParam ?? ''
  )
    ? (statusParam as AnnouncementStatus)
    : 'all'

  const sortParam = first(params.sort)
  const sortKey: AnnouncementSortKey = (ANNOUNCEMENT_SORT_KEYS as readonly string[]).includes(
    sortParam ?? ''
  )
    ? (sortParam as AnnouncementSortKey)
    : DEFAULT_ANNOUNCEMENT_SORT.key
  const dirParam = first(params.dir)
  const sortDir: 'asc' | 'desc' =
    dirParam === 'asc' || dirParam === 'desc'
      ? dirParam
      : sortKey === DEFAULT_ANNOUNCEMENT_SORT.key
        ? DEFAULT_ANNOUNCEMENT_SORT.dir
        : 'asc'

  const countQuery = (countStatus: AnnouncementStatus | 'all') =>
    applyStatusFilter(
      supabase.from('announcements').select('id', { count: 'exact', head: true }),
      countStatus,
      nowIso
    )

  const [{ data: announcements, count }, ...countResults] = await Promise.all([
    applyStatusFilter(
      supabase
        .from('announcements')
        .select('id, title, slug, priority, is_pinned, published_at, expires_at, created_at', {
          count: 'exact',
        }),
      status,
      nowIso
    )
      .order(sortKey, { ascending: sortDir === 'asc' })
      .order('id', { ascending: true })
      .range(from, to),
    countQuery('all'),
    countQuery('published'),
    countQuery('draft'),
    countQuery('expired'),
  ])
  const [allCount, publishedCount, draftCount, expiredCount] = countResults.map(
    (result) => result.count ?? 0
  )

  const totalCount = count ?? 0
  const totalPages = totalPageCount(totalCount)
  if (page > totalPages) {
    redirect(
      `/admin/announcements${buildAdminQueryString({
        status: status === 'all' ? undefined : status,
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
          <h1>Announcements</h1>
          <p className="admin-page-subtitle">
            Manage parish announcements, updates, and notifications.
          </p>
        </div>
        <Button
          href="/admin/announcements/new"
          size="sm"
          className="admin-button admin-button-primary"
        >
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
            New Announcement
          </span>
        </Button>
      </div>

      <AnnouncementsTable
        announcements={announcements ?? []}
        statusCounts={{
          all: allCount,
          published: publishedCount,
          draft: draftCount,
          expired: expiredCount,
        }}
        status={status}
        sortKey={sortKey}
        sortDir={sortDir}
      />
      <AdminPagination
        pathname="/admin/announcements"
        page={page}
        totalCount={totalCount}
        searchParams={{
          status: status === 'all' ? undefined : status,
          sort: sortParam,
          dir: dirParam,
        }}
      />
    </main>
  )
}
