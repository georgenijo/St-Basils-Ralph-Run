'use server'

import { revalidatePath } from 'next/cache'

import {
  CHURCH_TIME_ZONE,
  buildRecurrenceUntilIso,
  parseDatetimeLocalInTimeZone,
} from '@/lib/event-time'
import { logger } from '@/lib/logger'
import { withLogging } from '@/lib/logger.server'
import { createClient } from '@/lib/supabase/server'
import { eventSchema, buildRRuleString } from '@/lib/validators/event'

type ActionState = {
  success: boolean
  message: string
  errors?: Record<string, string[]>
}

const log = logger.child({ scope: 'events' })

function invalidTimeError(field: 'start_at' | 'end_at' | 'rrule_until'): ActionState {
  const label =
    field === 'rrule_until'
      ? 'Recurrence end date'
      : field === 'start_at'
        ? 'Start date/time'
        : 'End date/time'

  return {
    success: false,
    message: 'Validation failed',
    errors: {
      [field]: [`${label} is invalid for ${CHURCH_TIME_ZONE}.`],
    },
  }
}

async function createEventImpl(prevState: ActionState, formData: FormData): Promise<ActionState> {
  log.debug('event.create_started')

  // 1. Validate with Zod
  const parsed = eventSchema.safeParse({
    title: formData.get('title'),
    slug: formData.get('slug'),
    description: formData.get('description'),
    location: formData.get('location'),
    start_at: formData.get('start_at'),
    end_at: formData.get('end_at'),
    is_recurring: formData.get('is_recurring') === 'true',
    category: formData.get('category'),
    rrule_frequency: formData.get('rrule_frequency') ?? '',
    rrule_by_day: formData.get('rrule_by_day') ?? '',
    rrule_until: formData.get('rrule_until') ?? '',
    rrule_count: formData.get('rrule_count') ?? '',
    rsvp_settings: formData.get('rsvp_settings') ?? '',
  })

  if (!parsed.success) {
    log.debug('event.validation_failed', { errors: parsed.error.flatten().fieldErrors })
    return {
      success: false,
      message: 'Validation failed',
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  log.debug('event.validation_passed', { category: parsed.data.category })

  const startAt = parseDatetimeLocalInTimeZone(parsed.data.start_at)
  if (!startAt) {
    log.warn('event.start_time_invalid')
    return invalidTimeError('start_at')
  }
  const endAt = parsed.data.end_at ? parseDatetimeLocalInTimeZone(parsed.data.end_at) : null

  if (parsed.data.end_at && !endAt) return invalidTimeError('end_at')

  if (endAt && new Date(endAt) <= new Date(startAt)) {
    return {
      success: false,
      message: 'Validation failed',
      errors: { end_at: ['End date must be after start date'] },
    }
  }

  const recurrenceUntil = parsed.data.rrule_until
    ? buildRecurrenceUntilIso(parsed.data.rrule_until, parsed.data.start_at)
    : null

  if (parsed.data.rrule_until && !recurrenceUntil) {
    return invalidTimeError('rrule_until')
  }

  // 2. Auth check
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    log.warn('event.unauthorized')
    return { success: false, message: 'Unauthorized' }
  }

  // 3. Parse description JSON
  let descriptionJson = null
  if (parsed.data.description) {
    try {
      descriptionJson = JSON.parse(parsed.data.description)
    } catch (error) {
      log.debug('event.description_plain_text_fallback', { error })
      descriptionJson = {
        type: 'doc',
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: parsed.data.description }] },
        ],
      }
    }
  }

  // 4. Parse RSVP settings
  let rsvpSettings: Record<string, unknown> = { enabled: false }
  if (parsed.data.rsvp_settings) {
    try {
      rsvpSettings = JSON.parse(parsed.data.rsvp_settings)
    } catch (error) {
      log.warn('event.rsvp_settings_invalid_json', { error })
      // keep default
    }
  }

  // 5. Insert event
  const { data: event, error } = await supabase
    .from('events')
    .insert({
      title: parsed.data.title,
      slug: parsed.data.slug,
      description: descriptionJson,
      location: parsed.data.location || null,
      start_at: startAt,
      end_at: endAt,
      is_recurring: parsed.data.is_recurring,
      category: parsed.data.category,
      created_by: user.id,
      rsvp_settings: rsvpSettings,
    })
    .select('id')
    .single()

  if (error) {
    log.error('event.create_failed', { error })
    if (error.code === '23505') {
      return {
        success: false,
        message: 'An event with this slug already exists',
        errors: { slug: ['Slug is already taken'] },
      }
    }
    return { success: false, message: 'Failed to create event' }
  }
  log.info('event.created', { eventId: event.id })

  // 5. Insert recurrence rule if recurring
  if (parsed.data.is_recurring && parsed.data.rrule_frequency) {
    const rruleString = buildRRuleString({
      frequency: parsed.data.rrule_frequency,
      byDay: parsed.data.rrule_by_day || undefined,
      until: parsed.data.rrule_until || undefined,
      count: parsed.data.rrule_count || undefined,
      startsAtLocal: parsed.data.start_at,
    })

    const { error: rruleError } = await supabase.from('recurrence_rules').insert({
      event_id: event.id,
      rrule_string: rruleString,
      dtstart: startAt,
      until: recurrenceUntil,
    })

    if (rruleError) {
      log.error('event.recurrence_create_failed', { error: rruleError, eventId: event.id })
    }
  }

  // 6. Revalidate and return
  revalidatePath('/admin/events')
  revalidatePath('/events')
  return { success: true, message: 'Event created successfully' }
}

async function updateEventImpl(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const eventId = formData.get('event_id') as string
  if (!eventId) return { success: false, message: 'Event ID is required' }

  // 1. Validate with Zod
  const parsed = eventSchema.safeParse({
    title: formData.get('title'),
    slug: formData.get('slug'),
    description: formData.get('description'),
    location: formData.get('location'),
    start_at: formData.get('start_at'),
    end_at: formData.get('end_at'),
    is_recurring: formData.get('is_recurring') === 'true',
    category: formData.get('category'),
    rrule_frequency: formData.get('rrule_frequency') ?? '',
    rrule_by_day: formData.get('rrule_by_day') ?? '',
    rrule_until: formData.get('rrule_until') ?? '',
    rrule_count: formData.get('rrule_count') ?? '',
    rsvp_settings: formData.get('rsvp_settings') ?? '',
  })

  if (!parsed.success) {
    return {
      success: false,
      message: 'Validation failed',
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const startAt = parseDatetimeLocalInTimeZone(parsed.data.start_at)
  if (!startAt) return invalidTimeError('start_at')

  const endAt = parsed.data.end_at ? parseDatetimeLocalInTimeZone(parsed.data.end_at) : null

  if (parsed.data.end_at && !endAt) return invalidTimeError('end_at')

  if (endAt && new Date(endAt) <= new Date(startAt)) {
    return {
      success: false,
      message: 'Validation failed',
      errors: { end_at: ['End date must be after start date'] },
    }
  }

  const recurrenceUntil = parsed.data.rrule_until
    ? buildRecurrenceUntilIso(parsed.data.rrule_until, parsed.data.start_at)
    : null

  if (parsed.data.rrule_until && !recurrenceUntil) {
    return invalidTimeError('rrule_until')
  }

  // 2. Auth check
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, message: 'Unauthorized' }

  // 3. Parse description JSON
  let descriptionJson = null
  if (parsed.data.description) {
    try {
      descriptionJson = JSON.parse(parsed.data.description)
    } catch (error) {
      log.debug('event.description_plain_text_fallback', { error })
      descriptionJson = {
        type: 'doc',
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: parsed.data.description }] },
        ],
      }
    }
  }

  // 4. Parse RSVP settings
  let rsvpSettings: Record<string, unknown> = { enabled: false }
  if (parsed.data.rsvp_settings) {
    try {
      rsvpSettings = JSON.parse(parsed.data.rsvp_settings)
    } catch (error) {
      log.warn('event.rsvp_settings_invalid_json', { error })
      // keep default
    }
  }

  // 5. Update event
  const { error } = await supabase
    .from('events')
    .update({
      title: parsed.data.title,
      slug: parsed.data.slug,
      description: descriptionJson,
      location: parsed.data.location || null,
      start_at: startAt,
      end_at: endAt,
      is_recurring: parsed.data.is_recurring,
      category: parsed.data.category,
      rsvp_settings: rsvpSettings,
    })
    .eq('id', eventId)

  if (error) {
    log.error('event.update_failed', { error, eventId })
    if (error.code === '23505') {
      return {
        success: false,
        message: 'An event with this slug already exists',
        errors: { slug: ['Slug is already taken'] },
      }
    }
    return { success: false, message: 'Failed to update event' }
  }

  // 5. Upsert recurrence rule
  if (parsed.data.is_recurring && parsed.data.rrule_frequency) {
    const rruleString = buildRRuleString({
      frequency: parsed.data.rrule_frequency,
      byDay: parsed.data.rrule_by_day || undefined,
      until: parsed.data.rrule_until || undefined,
      count: parsed.data.rrule_count || undefined,
      startsAtLocal: parsed.data.start_at,
    })

    // Delete existing rules and insert new one
    await supabase.from('recurrence_rules').delete().eq('event_id', eventId)
    const { error: rruleError } = await supabase.from('recurrence_rules').insert({
      event_id: eventId,
      rrule_string: rruleString,
      dtstart: startAt,
      until: recurrenceUntil,
    })

    if (rruleError) {
      log.error('event.recurrence_update_failed', { error: rruleError, eventId })
    }
  } else {
    // Remove recurrence rules if event is no longer recurring
    await supabase.from('recurrence_rules').delete().eq('event_id', eventId)
  }

  // 6. Revalidate and return
  revalidatePath('/admin/events')
  revalidatePath('/events')
  return { success: true, message: 'Event updated successfully' }
}

async function deleteEventImpl(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const eventId = formData.get('event_id') as string
  if (!eventId) return { success: false, message: 'Event ID is required' }

  // 1. Auth check
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, message: 'Unauthorized' }

  // 2. Delete event (cascade deletes recurrence_rules and event_instances)
  const { error } = await supabase.from('events').delete().eq('id', eventId)

  if (error) {
    log.error('event.delete_failed', { error, eventId })
    return { success: false, message: 'Failed to delete event' }
  }

  // 3. Revalidate and return
  revalidatePath('/admin/events')
  revalidatePath('/events')
  return { success: true, message: 'Event deleted successfully' }
}

export const createEvent = withLogging('createEvent', createEventImpl)
export const updateEvent = withLogging('updateEvent', updateEventImpl)
export const deleteEvent = withLogging('deleteEvent', deleteEventImpl)
