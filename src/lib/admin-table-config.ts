export const EVENT_CATEGORIES = ['liturgical', 'community', 'special'] as const
export type EventCategory = (typeof EVENT_CATEGORIES)[number]

export const EVENT_SORT_KEYS = ['title', 'start_at', 'category', 'created_at'] as const
export type EventSortKey = (typeof EVENT_SORT_KEYS)[number]

export const DEFAULT_EVENT_SORT = { key: 'start_at', dir: 'desc' } as const

export const ANNOUNCEMENT_STATUSES = ['published', 'draft', 'expired'] as const
export type AnnouncementStatus = (typeof ANNOUNCEMENT_STATUSES)[number]

export const ANNOUNCEMENT_SORT_KEYS = ['title', 'priority', 'published_at', 'created_at'] as const
export type AnnouncementSortKey = (typeof ANNOUNCEMENT_SORT_KEYS)[number]

export const DEFAULT_ANNOUNCEMENT_SORT = { key: 'created_at', dir: 'desc' } as const
