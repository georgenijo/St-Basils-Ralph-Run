import { z } from 'zod'

export const eventCategory = z.enum(['liturgical', 'community', 'special'])

export type EventCategory = z.infer<typeof eventCategory>

export const rruleSchema = z.object({
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']),
  byDay: z.array(z.enum(['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'])).optional(),
  until: z.string().optional(),
  count: z.coerce.number().int().positive().optional(),
})

export type RRuleFormData = z.infer<typeof rruleSchema>

export const eventSchema = z
  .object({
    title: z
      .string()
      .min(1, 'Title is required')
      .max(200, 'Title must be 200 characters or less'),
    slug: z
      .string()
      .min(1, 'Slug is required')
      .max(200, 'Slug must be 200 characters or less')
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase letters, numbers, and hyphens'),
    description: z.string().optional(),
    location: z
      .string()
      .max(500, 'Location must be 500 characters or less')
      .optional()
      .or(z.literal('')),
    start_at: z.string().min(1, 'Start date/time is required'),
    end_at: z.string().optional().or(z.literal('')),
    is_recurring: z.coerce.boolean().default(false),
    category: eventCategory.default('community'),
    rrule_frequency: z.string().optional().or(z.literal('')),
    rrule_by_day: z.string().optional().or(z.literal('')),
    rrule_until: z.string().optional().or(z.literal('')),
    rrule_count: z.string().optional().or(z.literal('')),
  })
  .refine(
    (data) => {
      if (data.end_at && data.start_at) {
        return new Date(data.end_at) > new Date(data.start_at)
      }
      return true
    },
    { message: 'End date must be after start date', path: ['end_at'] }
  )
  .refine(
    (data) => {
      if (data.is_recurring && !data.rrule_frequency) {
        return false
      }
      return true
    },
    { message: 'Frequency is required for recurring events', path: ['rrule_frequency'] }
  )

export type EventFormData = z.infer<typeof eventSchema>

/** Build an iCalendar RRULE string from form fields */
export function buildRRuleString(data: {
  frequency: string
  byDay?: string
  until?: string
  count?: string
}): string {
  const parts = [`FREQ=${data.frequency}`]

  if (data.byDay) {
    parts.push(`BYDAY=${data.byDay}`)
  }

  if (data.until) {
    const d = new Date(data.until)
    parts.push(`UNTIL=${d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`)
  } else if (data.count) {
    parts.push(`COUNT=${data.count}`)
  }

  return parts.join(';')
}

/** Parse an RRULE string into component parts */
export function parseRRuleString(rrule: string): {
  frequency: string
  byDay: string[]
  until: string
  count: string
} {
  const parts = rrule.split(';')
  const map: Record<string, string> = {}
  for (const part of parts) {
    const [key, value] = part.split('=')
    map[key] = value
  }

  let until = ''
  if (map.UNTIL) {
    // Parse YYYYMMDDTHHMMSSZ back to YYYY-MM-DD
    const raw = map.UNTIL
    until = `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`
  }

  return {
    frequency: map.FREQ || 'WEEKLY',
    byDay: map.BYDAY ? map.BYDAY.split(',') : [],
    until,
    count: map.COUNT || '',
  }
}

/** Generate a URL-safe slug from a title */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}
