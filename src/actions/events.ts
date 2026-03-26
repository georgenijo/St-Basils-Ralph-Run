'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { eventSchema, buildRRuleString } from '@/lib/validators/event'

type ActionState = {
  success: boolean
  message: string
  errors?: Record<string, string[]>
}

export async function createEvent(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
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
    rrule_frequency: formData.get('rrule_frequency'),
    rrule_by_day: formData.get('rrule_by_day'),
    rrule_until: formData.get('rrule_until'),
    rrule_count: formData.get('rrule_count'),
  })

  if (!parsed.success) {
    return {
      success: false,
      message: 'Validation failed',
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
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
    } catch {
      descriptionJson = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: parsed.data.description }] }] }
    }
  }

  // 4. Insert event
  const { data: event, error } = await supabase
    .from('events')
    .insert({
      title: parsed.data.title,
      slug: parsed.data.slug,
      description: descriptionJson,
      location: parsed.data.location || null,
      start_at: parsed.data.start_at,
      end_at: parsed.data.end_at || null,
      is_recurring: parsed.data.is_recurring,
      category: parsed.data.category,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') {
      return { success: false, message: 'An event with this slug already exists', errors: { slug: ['Slug is already taken'] } }
    }
    return { success: false, message: 'Failed to create event' }
  }

  // 5. Insert recurrence rule if recurring
  if (parsed.data.is_recurring && parsed.data.rrule_frequency) {
    const rruleString = buildRRuleString({
      frequency: parsed.data.rrule_frequency,
      byDay: parsed.data.rrule_by_day || undefined,
      until: parsed.data.rrule_until || undefined,
      count: parsed.data.rrule_count || undefined,
    })

    const { error: rruleError } = await supabase.from('recurrence_rules').insert({
      event_id: event.id,
      rrule_string: rruleString,
      dtstart: parsed.data.start_at,
      until: parsed.data.rrule_until || null,
    })

    if (rruleError) {
      console.error('Failed to create recurrence rule:', rruleError)
    }
  }

  // 6. Revalidate and return
  revalidatePath('/admin/events')
  revalidatePath('/events')
  return { success: true, message: 'Event created successfully' }
}

export async function updateEvent(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
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
    rrule_frequency: formData.get('rrule_frequency'),
    rrule_by_day: formData.get('rrule_by_day'),
    rrule_until: formData.get('rrule_until'),
    rrule_count: formData.get('rrule_count'),
  })

  if (!parsed.success) {
    return {
      success: false,
      message: 'Validation failed',
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
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
    } catch {
      descriptionJson = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: parsed.data.description }] }] }
    }
  }

  // 4. Update event
  const { error } = await supabase
    .from('events')
    .update({
      title: parsed.data.title,
      slug: parsed.data.slug,
      description: descriptionJson,
      location: parsed.data.location || null,
      start_at: parsed.data.start_at,
      end_at: parsed.data.end_at || null,
      is_recurring: parsed.data.is_recurring,
      category: parsed.data.category,
    })
    .eq('id', eventId)

  if (error) {
    if (error.code === '23505') {
      return { success: false, message: 'An event with this slug already exists', errors: { slug: ['Slug is already taken'] } }
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
    })

    // Delete existing rules and insert new one
    await supabase.from('recurrence_rules').delete().eq('event_id', eventId)
    const { error: rruleError } = await supabase.from('recurrence_rules').insert({
      event_id: eventId,
      rrule_string: rruleString,
      dtstart: parsed.data.start_at,
      until: parsed.data.rrule_until || null,
    })

    if (rruleError) {
      console.error('Failed to update recurrence rule:', rruleError)
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

export async function deleteEvent(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
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
    return { success: false, message: 'Failed to delete event' }
  }

  // 3. Revalidate and return
  revalidatePath('/admin/events')
  revalidatePath('/events')
  return { success: true, message: 'Event deleted successfully' }
}
