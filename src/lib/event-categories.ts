export const EVENT_CATEGORIES = ['liturgical', 'community', 'special'] as const
export type EventCategory = (typeof EVENT_CATEGORIES)[number]

export const EVENT_CATEGORY_LABELS: Record<EventCategory, string> = {
  liturgical: 'Liturgical',
  community: 'Community',
  special: 'Special',
}
