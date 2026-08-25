'use client'

import { useActionState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

import {
  upsertEventInstance,
  cancelEventInstance,
  restoreEventInstance,
} from '@/actions/event-instances'
import { formatInChurchTimeZone, formatIsoForDatetimeLocal } from '@/lib/event-time'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'

const initialState = { success: false, message: '' }

const inputBase =
  'w-full rounded-lg border bg-cream-50 px-4 py-3 font-body text-base text-wood-800 placeholder:text-wood-800/40 transition-colors focus:border-burgundy-700 focus:outline-none focus:ring-2 focus:ring-burgundy-700/20'

const timeFormat: Intl.DateTimeFormatOptions = {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
}

const shortTimeFormat: Intl.DateTimeFormatOptions = {
  hour: 'numeric',
  minute: '2-digit',
}

export type OccurrenceModalMode = 'action' | 'edit' | 'cancel' | 'modified' | 'cancelled'

export interface OccurrenceEventData {
  eventId: string
  title: string
  startAt: string
  endAt: string | null
  location: string | null
  category: string
  slug: string
}

export interface OccurrenceInstanceData {
  id?: string
  originalDate: string
  isCancelled: boolean
  startAtOverride: string | null
  endAtOverride: string | null
  locationOverride: string | null
  note: string | null
  modifiedBy: string | null
  updatedAt: string | null
}

interface OccurrenceModalProps {
  open: boolean
  onClose: () => void
  mode: OccurrenceModalMode
  onModeChange: (mode: OccurrenceModalMode) => void
  event: OccurrenceEventData
  instance: OccurrenceInstanceData | null
}

function ErrorAlert({ message }: { message: string }) {
  return (
    <div className="admin-error mt-4" role="alert">
      <p>{message}</p>
    </div>
  )
}

function ActionView({
  event,
  onModeChange,
  onClose,
}: {
  event: OccurrenceEventData
  onModeChange: (mode: OccurrenceModalMode) => void
  onClose: () => void
}) {
  const router = useRouter()

  return (
    <div className="space-y-3">
      <div className="mb-4">
        <h2 className="font-heading text-xl font-semibold text-wood-900">{event.title}</h2>
        <p className="mt-1 font-body text-sm text-wood-800/60">
          {formatInChurchTimeZone(event.startAt, timeFormat)}
        </p>
        {event.location && (
          <p className="mt-0.5 font-body text-sm text-wood-800/60">{event.location}</p>
        )}
      </div>

      <button
        type="button"
        onClick={() => onModeChange('edit')}
        className="admin-button admin-button-quiet h-auto w-full justify-start py-3 text-left"
      >
        <div>
          <p className="font-body text-sm font-medium text-wood-900">Edit this occurrence</p>
          <p className="font-body text-xs text-wood-800/60">
            Change time, location, or add a note for this date only
          </p>
        </div>
      </button>

      <button
        type="button"
        onClick={() => onModeChange('cancel')}
        className="admin-button admin-button-quiet h-auto w-full justify-start py-3 text-left"
      >
        <div>
          <p className="font-body text-sm font-medium text-red-700">Cancel this occurrence</p>
          <p className="font-body text-xs text-wood-800/60">
            Mark as cancelled with an optional reason
          </p>
        </div>
      </button>

      <button
        type="button"
        onClick={() => {
          onClose()
          router.push(`/admin/events/${event.eventId}/edit`)
        }}
        className="admin-button admin-button-quiet h-auto w-full justify-start py-3 text-left"
      >
        <div>
          <p className="font-body text-sm font-medium text-wood-900">Edit entire series</p>
          <p className="font-body text-xs text-wood-800/60">
            Change the recurring schedule for all future occurrences
          </p>
        </div>
      </button>
    </div>
  )
}

function EditView({
  event,
  instance,
  onModeChange,
  onClose,
}: {
  event: OccurrenceEventData
  instance: OccurrenceInstanceData | null
  onModeChange: (mode: OccurrenceModalMode) => void
  onClose: () => void
}) {
  const [state, formAction, isPending] = useActionState(upsertEventInstance, initialState)

  useEffect(() => {
    if (state.success) onClose()
  }, [state.success, onClose])

  const currentStart = instance?.startAtOverride || event.startAt
  const currentEnd = instance?.endAtOverride || event.endAt
  const currentLocation = instance?.locationOverride ?? event.location ?? ''

  return (
    <div>
      <h2 className="font-heading text-xl font-semibold text-wood-900">Edit Occurrence</h2>
      <p className="mt-1 font-body text-sm text-wood-800/60">
        {formatInChurchTimeZone(event.startAt, {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })}
      </p>

      {!state.success && state.message && <ErrorAlert message={state.message} />}

      <form action={formAction} className="mt-4 space-y-4">
        <input type="hidden" name="event_id" value={event.eventId} />
        <input type="hidden" name="original_date" value={event.startAt} />

        <div>
          <label
            htmlFor="occ-start"
            className="mb-1.5 block font-body text-sm font-medium text-wood-900"
          >
            Start Time
          </label>
          <input
            type="datetime-local"
            id="occ-start"
            name="start_at"
            defaultValue={formatIsoForDatetimeLocal(currentStart)}
            className={inputBase}
          />
          {instance?.startAtOverride && (
            <p className="mt-1 font-body text-xs text-wood-800/40">
              Original: {formatInChurchTimeZone(event.startAt, shortTimeFormat)}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="occ-end"
            className="mb-1.5 block font-body text-sm font-medium text-wood-900"
          >
            End Time
          </label>
          <input
            type="datetime-local"
            id="occ-end"
            name="end_at"
            defaultValue={formatIsoForDatetimeLocal(currentEnd)}
            className={inputBase}
          />
        </div>

        <div>
          <label
            htmlFor="occ-location"
            className="mb-1.5 block font-body text-sm font-medium text-wood-900"
          >
            Location
          </label>
          <input
            type="text"
            id="occ-location"
            name="location"
            defaultValue={currentLocation}
            placeholder={event.location ?? ''}
            className={inputBase}
          />
          {event.location &&
            instance?.locationOverride &&
            instance.locationOverride !== event.location && (
              <p className="mt-1 font-body text-xs text-wood-800/40">Original: {event.location}</p>
            )}
        </div>

        <div>
          <label
            htmlFor="occ-note"
            className="mb-1.5 block font-body text-sm font-medium text-wood-900"
          >
            Note
          </label>
          <textarea
            id="occ-note"
            name="note"
            rows={2}
            defaultValue={instance?.note ?? ''}
            placeholder="Optional note visible to parishioners"
            className={cn(inputBase, 'resize-none')}
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="edit-notify"
            name="notify_subscribers"
            className="h-4 w-4 rounded border-wood-800/20 text-burgundy-700 focus:ring-burgundy-700/20"
          />
          <label htmlFor="edit-notify" className="font-body text-sm text-wood-800/80">
            Send notification to subscribers
          </label>
        </div>

        <div className="flex justify-end gap-3 border-t border-wood-800/10 pt-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onModeChange('action')}
            disabled={isPending}
            className="admin-button admin-button-quiet"
          >
            Back
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={isPending}
            className="admin-button admin-button-primary"
          >
            {isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  )
}

function CancelView({
  event,
  onModeChange,
  onClose,
}: {
  event: OccurrenceEventData
  onModeChange: (mode: OccurrenceModalMode) => void
  onClose: () => void
}) {
  const [state, formAction, isPending] = useActionState(cancelEventInstance, initialState)

  useEffect(() => {
    if (state.success) onClose()
  }, [state.success, onClose])

  return (
    <div>
      <h2>Cancel Occurrence</h2>
      <p className="mt-2 font-body text-sm text-wood-800/80">
        This will cancel <strong className="text-wood-900">&ldquo;{event.title}&rdquo;</strong> on{' '}
        {formatInChurchTimeZone(event.startAt, {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })}
        . Parishioners will see it as cancelled on the calendar.
      </p>

      {!state.success && state.message && <ErrorAlert message={state.message} />}

      <form action={formAction} className="mt-4 space-y-4">
        <input type="hidden" name="event_id" value={event.eventId} />
        <input type="hidden" name="original_date" value={event.startAt} />

        <div>
          <label
            htmlFor="cancel-note"
            className="mb-1.5 block font-body text-sm font-medium text-wood-900"
          >
            Reason (optional)
          </label>
          <textarea
            id="cancel-note"
            name="note"
            rows={2}
            placeholder="e.g. No service — Holy Week services at the Cathedral"
            className={cn(inputBase, 'resize-none')}
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="cancel-notify"
            name="notify_subscribers"
            defaultChecked
            className="h-4 w-4 rounded border-wood-800/20 text-burgundy-700 focus:ring-burgundy-700/20"
          />
          <label htmlFor="cancel-notify" className="font-body text-sm text-wood-800/80">
            Send notification to subscribers
          </label>
        </div>

        <div className="flex justify-end gap-3 border-t border-wood-800/10 pt-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onModeChange('action')}
            disabled={isPending}
            className="admin-button admin-button-quiet"
          >
            Back
          </Button>
          <button type="submit" disabled={isPending} className="admin-button admin-button-primary">
            {isPending ? 'Cancelling...' : 'Cancel this occurrence'}
          </button>
        </div>
      </form>
    </div>
  )
}

function ModifiedView({
  event,
  instance,
  onModeChange,
  onClose,
}: {
  event: OccurrenceEventData
  instance: OccurrenceInstanceData
  onModeChange: (mode: OccurrenceModalMode) => void
  onClose: () => void
}) {
  const [state, formAction, isPending] = useActionState(restoreEventInstance, initialState)

  useEffect(() => {
    if (state.success) onClose()
  }, [state.success, onClose])

  return (
    <div>
      <h2 className="font-heading text-xl font-semibold text-wood-900">Modified Occurrence</h2>
      <p className="mt-1 font-body text-sm text-wood-800/60">{event.title}</p>

      <div className="admin-notice mt-4 space-y-2">
        {instance.startAtOverride && (
          <p className="font-body text-sm text-wood-800">
            Time:{' '}
            <span className="text-wood-800/40 line-through">
              {formatInChurchTimeZone(event.startAt, shortTimeFormat)}
            </span>{' '}
            <span aria-hidden="true">&rarr;</span>{' '}
            <span className="font-medium">
              {formatInChurchTimeZone(instance.startAtOverride, shortTimeFormat)}
            </span>
          </p>
        )}
        {instance.locationOverride && instance.locationOverride !== event.location && (
          <p className="font-body text-sm text-wood-800">
            Location: <span className="text-wood-800/40 line-through">{event.location}</span>{' '}
            <span aria-hidden="true">&rarr;</span>{' '}
            <span className="font-medium">{instance.locationOverride}</span>
          </p>
        )}
        {instance.note && (
          <p className="font-body text-sm text-wood-800">
            Note: <span className="italic">{instance.note}</span>
          </p>
        )}
      </div>

      {instance.updatedAt && (
        <p className="mt-2 font-body text-xs text-wood-800/40">
          Modified on{' '}
          {formatInChurchTimeZone(instance.updatedAt, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })}
        </p>
      )}

      {!state.success && state.message && <ErrorAlert message={state.message} />}

      <div className="mt-4 space-y-2 border-t border-wood-800/10 pt-4">
        <button
          type="button"
          onClick={() => onModeChange('edit')}
          className="admin-button admin-button-quiet h-auto w-full justify-start py-2.5"
        >
          Edit again
        </button>

        <form action={formAction} className="space-y-2">
          <input type="hidden" name="event_id" value={event.eventId} />
          <input type="hidden" name="original_date" value={instance.originalDate} />
          <div className="flex items-center gap-2 px-4">
            <input
              type="checkbox"
              id="restore-notify"
              name="notify_subscribers"
              className="h-4 w-4 rounded border-wood-800/20 text-burgundy-700 focus:ring-burgundy-700/20"
            />
            <label htmlFor="restore-notify" className="font-body text-sm text-wood-800/80">
              Send notification to subscribers
            </label>
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="admin-button admin-button-quiet h-auto w-full justify-start py-2.5"
          >
            {isPending ? 'Restoring...' : 'Revert to regular schedule'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => onModeChange('cancel')}
          className="admin-button admin-button-quiet h-auto w-full justify-start py-2.5"
        >
          Cancel instead
        </button>
      </div>
    </div>
  )
}

function CancelledView({
  event,
  instance,
  onClose,
}: {
  event: OccurrenceEventData
  instance: OccurrenceInstanceData
  onClose: () => void
}) {
  const [state, formAction, isPending] = useActionState(restoreEventInstance, initialState)

  useEffect(() => {
    if (state.success) onClose()
  }, [state.success, onClose])

  return (
    <div>
      <h2>Cancelled Occurrence</h2>

      <div className="mt-4 space-y-1">
        <p className="font-body text-sm text-wood-800/40 line-through">{event.title}</p>
        <p className="font-body text-sm text-wood-800/40 line-through">
          {formatInChurchTimeZone(event.startAt, timeFormat)}
        </p>
        {event.location && (
          <p className="font-body text-sm text-wood-800/40 line-through">{event.location}</p>
        )}
      </div>

      {instance.note && (
        <div className="admin-notice mt-3">
          <p className="font-body text-sm font-medium text-red-700">Reason</p>
          <p className="mt-0.5 font-body text-sm text-red-600">{instance.note}</p>
        </div>
      )}

      {instance.updatedAt && (
        <p className="mt-2 font-body text-xs text-wood-800/40">
          Cancelled on{' '}
          {formatInChurchTimeZone(instance.updatedAt, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })}
        </p>
      )}

      {!state.success && state.message && <ErrorAlert message={state.message} />}

      <div className="mt-4 border-t border-wood-800/10 pt-4">
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="event_id" value={event.eventId} />
          <input type="hidden" name="original_date" value={instance.originalDate} />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="cancelled-restore-notify"
              name="notify_subscribers"
              className="h-4 w-4 rounded border-wood-800/20 text-burgundy-700 focus:ring-burgundy-700/20"
            />
            <label
              htmlFor="cancelled-restore-notify"
              className="font-body text-sm text-wood-800/80"
            >
              Send notification to subscribers
            </label>
          </div>
          <Button
            type="submit"
            size="sm"
            disabled={isPending}
            className="admin-button admin-button-primary"
          >
            {isPending ? 'Restoring...' : 'Restore this occurrence'}
          </Button>
        </form>
      </div>
    </div>
  )
}

export function OccurrenceModal({
  open,
  onClose,
  mode,
  onModeChange,
  event,
  instance,
}: OccurrenceModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    if (open) {
      dialogRef.current?.showModal()
    } else {
      dialogRef.current?.close()
    }
  }, [open])

  return (
    <dialog ref={dialogRef} onClose={onClose}>
      <div className="admin-dialog-body">
        {mode === 'action' && (
          <ActionView event={event} onModeChange={onModeChange} onClose={onClose} />
        )}
        {mode === 'edit' && (
          <EditView
            event={event}
            instance={instance}
            onModeChange={onModeChange}
            onClose={onClose}
          />
        )}
        {mode === 'cancel' && (
          <CancelView event={event} onModeChange={onModeChange} onClose={onClose} />
        )}
        {mode === 'modified' && instance && (
          <ModifiedView
            event={event}
            instance={instance}
            onModeChange={onModeChange}
            onClose={onClose}
          />
        )}
        {mode === 'cancelled' && instance && (
          <CancelledView event={event} instance={instance} onClose={onClose} />
        )}
      </div>
    </dialog>
  )
}
