'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import listPlugin from '@fullcalendar/list'
import interactionPlugin from '@fullcalendar/interaction'
import rrulePlugin from '@fullcalendar/rrule'

import { CHURCH_TIME_ZONE } from '@/lib/event-time'
import {
  OccurrenceModal,
  type OccurrenceModalMode,
  type OccurrenceEventData,
  type OccurrenceInstanceData,
} from '@/components/features/OccurrenceModal'

import type { EventClickArg, EventMountArg, EventContentArg } from '@fullcalendar/core'
import type { EventCategory } from '@/lib/event-categories'

export interface AdminCalendarEvent {
  id: string
  title: string
  start?: string
  end?: string
  rrule?: string
  duration?: string
  extendedProps: {
    instanceType: 'recurring' | 'modified' | 'cancelled' | 'single'
    eventId: string
    slug: string
    category: EventCategory
    location: string | null
    instance?: {
      id: string
      originalDate: string
      isCancelled: boolean
      startAtOverride: string | null
      endAtOverride: string | null
      locationOverride: string | null
      note: string | null
      modifiedBy: string | null
      updatedAt: string
    } | null
    originalStart?: string
    originalLocation?: string | null
  }
}

interface AdminCalendarViewProps {
  events: AdminCalendarEvent[]
}

const CATEGORY_COLORS: Record<EventCategory, { bg: string; border: string }> = {
  liturgical: { bg: 'var(--fg-soft)', border: 'var(--border)' },
  community: { bg: 'var(--fg-soft)', border: 'var(--border)' },
  special: { bg: 'var(--fg-soft)', border: 'var(--border)' },
}

const INSTANCE_COLORS: Record<string, { bg: string; border: string }> = {
  modified: { bg: 'color-mix(in oklch, var(--warn) 15%, transparent)', border: 'var(--border)' },
  cancelled: { bg: 'var(--fg-soft)', border: 'var(--border)' },
  single: { bg: 'color-mix(in oklch, var(--ok) 12%, transparent)', border: 'var(--border)' },
}

interface ModalState {
  open: boolean
  mode: OccurrenceModalMode
  eventData: OccurrenceEventData | null
  instanceData: OccurrenceInstanceData | null
}

export function AdminCalendarView({ events }: AdminCalendarViewProps) {
  const router = useRouter()

  const [initialView] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth < 768 ? 'listWeek' : 'dayGridMonth'
  )

  const [modal, setModal] = useState<ModalState>({
    open: false,
    mode: 'action',
    eventData: null,
    instanceData: null,
  })

  const coloredEvents = events.map((event) => {
    const { instanceType, category } = event.extendedProps
    const colors =
      instanceType === 'recurring'
        ? (CATEGORY_COLORS[category] ?? CATEGORY_COLORS.community)
        : (INSTANCE_COLORS[instanceType] ?? CATEGORY_COLORS[category] ?? CATEGORY_COLORS.community)

    return {
      ...event,
      backgroundColor: colors.bg,
      borderColor: colors.border,
      textColor: 'var(--fg)',
    }
  })

  const handleEventDidMount = useCallback((info: EventMountArg) => {
    const instanceType = info.event.extendedProps.instanceType
    if (instanceType === 'cancelled') {
      info.el.style.opacity = '0.65'
      info.el.style.textDecoration = 'line-through'
    }
  }, [])

  const handleEventContent = useCallback((arg: EventContentArg) => {
    const instanceType = arg.event.extendedProps.instanceType
    const titleEl = document.createElement('span')
    if (instanceType === 'cancelled') {
      titleEl.style.textDecoration = 'line-through'
    }
    titleEl.textContent = arg.event.title

    const container = document.createElement('div')
    container.className = 'fc-event-main-frame'
    container.appendChild(titleEl)

    if (arg.timeText) {
      const timeEl = document.createElement('div')
      timeEl.className = 'fc-event-time'
      timeEl.textContent = arg.timeText
      const wrapper = document.createElement('div')
      wrapper.appendChild(timeEl)
      wrapper.appendChild(container)
      return { domNodes: [wrapper] }
    }

    return { domNodes: [container] }
  }, [])

  const handleEventClick = useCallback(
    (info: EventClickArg) => {
      info.jsEvent.preventDefault()
      const ext = info.event.extendedProps
      const instanceType = ext.instanceType as string

      if (instanceType === 'single') {
        router.push(`/admin/events/${ext.eventId}/edit`)
        return
      }

      const eventData: OccurrenceEventData = {
        eventId: ext.eventId,
        title: info.event.title,
        startAt: ext.originalStart || info.event.start?.toISOString() || '',
        endAt: info.event.end?.toISOString() || null,
        location: ext.location,
        category: ext.category,
        slug: ext.slug,
      }

      const instanceRaw = ext.instance
      const instanceData: OccurrenceInstanceData | null = instanceRaw
        ? {
            id: instanceRaw.id,
            originalDate: instanceRaw.originalDate,
            isCancelled: instanceRaw.isCancelled,
            startAtOverride: instanceRaw.startAtOverride,
            endAtOverride: instanceRaw.endAtOverride,
            locationOverride: instanceRaw.locationOverride,
            note: instanceRaw.note,
            modifiedBy: instanceRaw.modifiedBy,
            updatedAt: instanceRaw.updatedAt,
          }
        : null

      let mode: OccurrenceModalMode = 'action'
      if (instanceType === 'modified') mode = 'modified'
      else if (instanceType === 'cancelled') mode = 'cancelled'

      setModal({ open: true, mode, eventData, instanceData })
    },
    [router]
  )

  const handleClose = useCallback(() => {
    setModal({ open: false, mode: 'action', eventData: null, instanceData: null })
  }, [])

  const handleModeChange = useCallback((newMode: OccurrenceModalMode) => {
    setModal((prev) => ({ ...prev, mode: newMode }))
  }, [])

  return (
    <>
      <div role="region" aria-label="Admin events calendar">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin, rrulePlugin]}
          initialView={initialView}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,listWeek',
          }}
          events={coloredEvents}
          eventClick={handleEventClick}
          eventDidMount={handleEventDidMount}
          eventContent={handleEventContent}
          height="auto"
          timeZone={CHURCH_TIME_ZONE}
          dayMaxEvents={3}
          eventDisplay="block"
          nowIndicator
          fixedWeekCount={false}
          buttonText={{
            today: 'Today',
            month: 'Month',
            week: 'Week',
            list: 'List',
          }}
        />
      </div>

      {modal.open && modal.eventData && (
        <OccurrenceModal
          open={modal.open}
          onClose={handleClose}
          mode={modal.mode}
          onModeChange={handleModeChange}
          event={modal.eventData}
          instance={modal.instanceData}
        />
      )}
    </>
  )
}
