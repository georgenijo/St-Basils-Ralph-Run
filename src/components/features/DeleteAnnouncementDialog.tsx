'use client'

import { useActionState, useEffect, useRef } from 'react'

import { deleteAnnouncement } from '@/actions/announcements'
import { Button } from '@/components/ui'

const initialState = {
  success: false,
  message: '',
}

interface DeleteAnnouncementDialogProps {
  announcementId: string
  announcementTitle: string
  open: boolean
  onClose: () => void
}

export function DeleteAnnouncementDialog({
  announcementId,
  announcementTitle,
  open,
  onClose,
}: DeleteAnnouncementDialogProps) {
  const [state, action, isPending] = useActionState(deleteAnnouncement, initialState)
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    if (open) {
      dialogRef.current?.showModal()
    } else {
      dialogRef.current?.close()
    }
  }, [open])

  useEffect(() => {
    if (state.success) {
      onClose()
      window.location.href = '/admin/announcements'
    }
  }, [state.success, onClose])

  return (
    <dialog ref={dialogRef} onClose={onClose}>
      <div className="admin-dialog-head">
        <h2>Delete Announcement</h2>
        <p>
          Are you sure you want to delete{' '}
          <strong className="text-wood-900">&ldquo;{announcementTitle}&rdquo;</strong>? This action
          cannot be undone.
        </p>

        {state.message && !state.success && (
          <div className="admin-error" role="alert">
            <p>{state.message}</p>
          </div>
        )}

        <div className="admin-dialog-footer mt-6">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isPending}
            className="admin-button admin-button-quiet"
          >
            Cancel
          </Button>
          <form action={action}>
            <input type="hidden" name="announcement_id" value={announcementId} />
            <button
              type="submit"
              disabled={isPending}
              className="admin-button admin-button-primary"
            >
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
                  Deleting...
                </span>
              ) : (
                'Delete Announcement'
              )}
            </button>
          </form>
        </div>
      </div>
    </dialog>
  )
}
