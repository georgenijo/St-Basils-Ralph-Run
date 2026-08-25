'use client'

import { useActionState, useState, useEffect, useRef } from 'react'

import { createAnnouncement, updateAnnouncement } from '@/actions/announcements'
import { Button } from '@/components/ui'
import { TiptapEditor } from '@/components/features/TiptapEditor'
import { CHURCH_TIME_ZONE, formatIsoForDatetimeLocal } from '@/lib/event-time'
import { slugify } from '@/lib/validators/event'
import { cn } from '@/lib/utils'

const PRIORITIES = [
  { value: 0, label: 'Normal' },
  { value: 1, label: 'Low' },
  { value: 5, label: 'Medium' },
  { value: 10, label: 'High' },
] as const

const inputBase =
  'w-full rounded-lg border bg-cream-50 px-4 py-3 font-body text-base text-wood-800 placeholder:text-wood-800/40 transition-colors focus:border-burgundy-700 focus:outline-none focus:ring-2 focus:ring-burgundy-700/20'

const initialState = {
  success: false,
  message: '',
  errors: undefined as Record<string, string[]> | undefined,
}

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null
  return (
    <p className="mt-1.5 font-body text-sm text-red-600" role="alert">
      {errors[0]}
    </p>
  )
}

interface AnnouncementData {
  id: string
  title: string
  slug: string
  body: unknown
  priority: number
  is_pinned: boolean
  expires_at: string | null
  send_email: boolean
  published_at: string | null
}

interface AnnouncementFormProps {
  announcement?: AnnouncementData
}

export function AnnouncementForm({ announcement }: AnnouncementFormProps) {
  const isEditing = !!announcement
  const action = isEditing ? updateAnnouncement : createAnnouncement
  const [state, formAction, isPending] = useActionState(action, initialState)
  const formRef = useRef<HTMLFormElement>(null)

  // Form field state
  const [title, setTitle] = useState(announcement?.title ?? '')
  const [slug, setSlug] = useState(announcement?.slug ?? '')
  const [slugManual, setSlugManual] = useState(isEditing)
  const [body, setBody] = useState(announcement?.body ? JSON.stringify(announcement.body) : '')
  const [isPinned, setIsPinned] = useState(announcement?.is_pinned ?? false)
  const [sendEmail, setSendEmail] = useState(announcement?.send_email ?? false)
  const [isPublished, setIsPublished] = useState(!!announcement?.published_at)

  // Auto-generate slug from title
  useEffect(() => {
    if (!slugManual && title) {
      setSlug(slugify(title))
    }
  }, [title, slugManual])

  // Redirect on success
  useEffect(() => {
    if (state.success) {
      window.location.href = '/admin/announcements'
    }
  }, [state.success])

  return (
    <form ref={formRef} action={formAction} className="space-y-6">
      {isEditing && <input type="hidden" name="announcement_id" value={announcement.id} />}

      {/* Server error message */}
      {!state.success && state.message && !state.errors && (
        <div className="admin-error" role="alert">
          <p>{state.message}</p>
        </div>
      )}

      {/* Title */}
      <div>
        <label htmlFor="title" className="mb-1.5 block font-body text-sm font-medium text-wood-900">
          Title <span className="admin-required">*</span>
        </label>
        <input
          type="text"
          id="title"
          name="title"
          required
          maxLength={200}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Lenten Service Schedule Update"
          className={cn(inputBase, state.errors?.title && 'border-red-400')}
        />
        <FieldError errors={state.errors?.title} />
      </div>

      {/* Slug */}
      <div>
        <label htmlFor="slug" className="mb-1.5 block font-body text-sm font-medium text-wood-900">
          Slug <span className="admin-required">*</span>
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            id="slug"
            name="slug"
            required
            maxLength={200}
            value={slug}
            onChange={(e) => {
              setSlugManual(true)
              setSlug(e.target.value)
            }}
            placeholder="lenten-service-schedule-update"
            className={cn(inputBase, 'font-mono text-sm', state.errors?.slug && 'border-red-400')}
          />
          {slugManual && (
            <button
              type="button"
              onClick={() => {
                setSlugManual(false)
                setSlug(slugify(title))
              }}
              className="admin-button admin-button-quiet shrink-0"
            >
              Auto
            </button>
          )}
        </div>
        <FieldError errors={state.errors?.slug} />
      </div>

      {/* Body (Tiptap) */}
      <div>
        <p id="body-label" className="mb-1.5 font-body text-sm font-medium text-wood-900">
          Body
        </p>
        <div aria-labelledby="body-label">
          <TiptapEditor content={body} onChange={setBody} error={!!state.errors?.body} />
        </div>
        <input type="hidden" name="body" value={body} />
        <FieldError errors={state.errors?.body} />
      </div>

      {/* Priority */}
      <div>
        <label
          htmlFor="priority"
          className="mb-1.5 block font-body text-sm font-medium text-wood-900"
        >
          Priority
        </label>
        <select
          id="priority"
          name="priority"
          defaultValue={announcement?.priority ?? 0}
          className={cn(inputBase, state.errors?.priority && 'border-red-400')}
        >
          {PRIORITIES.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
        <FieldError errors={state.errors?.priority} />
      </div>

      {/* Expiry date */}
      <div>
        <label
          htmlFor="expires_at"
          className="mb-1.5 block font-body text-sm font-medium text-wood-900"
        >
          Expires at
        </label>
        <input
          type="datetime-local"
          id="expires_at"
          name="expires_at"
          defaultValue={formatIsoForDatetimeLocal(announcement?.expires_at)}
          className={cn(inputBase, state.errors?.expires_at && 'border-red-400')}
        />
        <p className="mt-1 font-body text-xs text-wood-800/50">
          Leave empty for no expiration. Times are in Eastern Time ({CHURCH_TIME_ZONE}).
        </p>
        <FieldError errors={state.errors?.expires_at} />
      </div>

      {/* Pin toggle */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={isPinned}
          aria-label="Pin announcement"
          onClick={() => setIsPinned(!isPinned)}
          className="admin-switch"
        >
          <span className="admin-switch-knob" />
        </button>
        <span className="font-body text-sm font-medium text-wood-900">Pin to top</span>
        <input type="hidden" name="is_pinned" value={isPinned ? 'true' : 'false'} />
      </div>

      {/* Send email checkbox */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={sendEmail}
          aria-label="Send email notification"
          onClick={() => setSendEmail(!sendEmail)}
          className="admin-switch"
        >
          <span className="admin-switch-knob" />
        </button>
        <span className="font-body text-sm font-medium text-wood-900">Send email on publish</span>
        <input type="hidden" name="send_email" value={sendEmail ? 'true' : 'false'} />
      </div>

      {/* Publish toggle */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={isPublished}
          aria-label="Publish announcement"
          onClick={() => setIsPublished(!isPublished)}
          className="admin-switch"
        >
          <span className="admin-switch-knob" />
        </button>
        <span className="font-body text-sm font-medium text-wood-900">
          {isPublished ? 'Published' : 'Draft'}
        </span>
        <input type="hidden" name="published" value={isPublished ? 'true' : 'false'} />
      </div>

      {/* Submit */}
      <div className="flex items-center gap-4 border-t border-wood-800/10 pt-6">
        <Button type="submit" disabled={isPending} className="admin-button admin-button-primary">
          {isPending ? (
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Saving...
            </span>
          ) : isEditing ? (
            'Update Announcement'
          ) : (
            'Create Announcement'
          )}
        </Button>
        <Button
          type="button"
          variant="ghost"
          href="/admin/announcements"
          className="admin-button admin-button-quiet"
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
