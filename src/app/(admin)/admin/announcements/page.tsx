import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { paginationRange, parsePageParam, totalPageCount } from '@/lib/pagination'
import { Button } from '@/components/ui'
import { AdminPagination } from '@/components/features/AdminPagination'
import { AnnouncementsTable } from '@/components/features/AnnouncementsTable'

export const metadata: Metadata = {
  title: 'Announcements',
}

export default async function AnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[] }>
}) {
  const supabase = await createClient()
  const page = parsePageParam((await searchParams).page)
  const { from, to } = paginationRange(page)

  const { data: announcements, count } = await supabase
    .from('announcements')
    .select('id, title, slug, priority, is_pinned, published_at, expires_at, created_at', {
      count: 'exact',
    })
    .order('created_at', { ascending: false })
    .range(from, to)

  const totalCount = count ?? 0
  const totalPages = totalPageCount(totalCount)
  if (page > totalPages) redirect(`/admin/announcements?page=${totalPages}`)

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

      <AnnouncementsTable announcements={announcements ?? []} />
      <AdminPagination pathname="/admin/announcements" page={page} totalCount={totalCount} />
    </main>
  )
}
