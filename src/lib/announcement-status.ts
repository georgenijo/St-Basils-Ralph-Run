import type { AnnouncementStatus } from '@/lib/admin-table-config'

export interface AnnouncementStatusFields {
  published_at: string | null
  expires_at: string | null
}

type AnnouncementStatusQuery<Q> = {
  is(column: string, value: null): Q
  not(column: string, operator: string, value: null): Q
  lte(column: string, value: string): Q
  or(expression: string): Q
}

/**
 * Uses the public visibility boundary: an announcement is published only while
 * its expiry is strictly later than the captured timestamp.
 */
export function getAnnouncementStatus(
  announcement: AnnouncementStatusFields,
  nowIso: string
): AnnouncementStatus {
  if (!announcement.published_at) return 'draft'
  if (announcement.expires_at && new Date(announcement.expires_at) <= new Date(nowIso)) {
    return 'expired'
  }
  return 'published'
}

export function applyAnnouncementStatusFilter<Q extends AnnouncementStatusQuery<Q>>(
  query: Q,
  status: AnnouncementStatus | 'all',
  nowIso: string
): Q {
  if (status === 'draft') return query.is('published_at', null)
  if (status === 'expired') return query.not('published_at', 'is', null).lte('expires_at', nowIso)
  if (status === 'published') {
    return query.not('published_at', 'is', null).or(`expires_at.is.null,expires_at.gt.${nowIso}`)
  }
  return query
}
