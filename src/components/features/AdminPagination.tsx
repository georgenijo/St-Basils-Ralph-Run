import Link from 'next/link'

import { ADMIN_PAGE_SIZE, totalPageCount } from '@/lib/pagination'
import { buildAdminQueryString } from '@/lib/admin-table-params'

interface AdminPaginationProps {
  pathname: string
  page: number
  totalCount: number
  pageSize?: number
  /** Extra query params (e.g. active filter/sort) preserved across page links. */
  searchParams?: Record<string, string | undefined>
}

function pageHref(
  pathname: string,
  page: number,
  searchParams: Record<string, string | undefined>
): string {
  return `${pathname}${buildAdminQueryString({
    ...searchParams,
    page: page === 1 ? undefined : String(page),
  })}`
}

export function AdminPagination({
  pathname,
  page,
  totalCount,
  pageSize = ADMIN_PAGE_SIZE,
  searchParams = {},
}: AdminPaginationProps) {
  const totalPages = totalPageCount(totalCount, pageSize)
  if (totalPages <= 1) return null

  return (
    <nav className="admin-pagination" aria-label="Pagination">
      <p>
        {totalCount} item{totalCount === 1 ? '' : 's'}
      </p>
      <div className="flex items-center gap-1">
        {page > 1 ? (
          <Link
            href={pageHref(pathname, page - 1, searchParams)}
            className="admin-button admin-button-bare"
          >
            Previous
          </Link>
        ) : (
          <span className="admin-button admin-button-bare" aria-disabled="true">
            Previous
          </span>
        )}
        <span className="admin-meta px-2" aria-live="polite">
          {page} of {totalPages}
        </span>
        {page < totalPages ? (
          <Link
            href={pageHref(pathname, page + 1, searchParams)}
            className="admin-button admin-button-bare"
          >
            Next
          </Link>
        ) : (
          <span className="admin-button admin-button-bare" aria-disabled="true">
            Next
          </span>
        )}
      </div>
    </nav>
  )
}
