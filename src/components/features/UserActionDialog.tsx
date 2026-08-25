'use client'

import { useActionState, useEffect, useRef } from 'react'

import { Button } from '@/components/ui'

const initialState = {
  success: false,
  message: '',
}

interface UserActionDialogProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  title: string
  description: string
  action: (
    state: { success: boolean; message: string },
    formData: FormData
  ) => Promise<{ success: boolean; message: string }>
  hiddenFields: Record<string, string>
  confirmLabel: string
  intent?: 'default' | 'destructive'
}

export function UserActionDialog({
  open,
  onClose,
  onSuccess,
  title,
  description,
  action,
  hiddenFields,
  confirmLabel,
  intent = 'default',
}: UserActionDialogProps) {
  const [state, formAction, isPending] = useActionState(action, initialState)
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const el = dialogRef.current
    if (!el) return
    if (open && !el.open) {
      el.showModal()
    } else if (!open && el.open) {
      el.close()
    }
  }, [open])

  const hasTriggeredSuccess = useRef(false)

  useEffect(() => {
    if (state.success && !hasTriggeredSuccess.current) {
      hasTriggeredSuccess.current = true
      onClose()
      onSuccess()
    }
  }, [state.success, onClose, onSuccess])

  return (
    <dialog ref={dialogRef} onClose={onClose}>
      <div className="admin-dialog-head">
        <h2>{title}</h2>
        <p>{description}</p>

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
          <form action={formAction}>
            {Object.entries(hiddenFields).map(([name, value]) => (
              <input key={name} type="hidden" name={name} value={value} />
            ))}
            <button
              type="submit"
              disabled={isPending}
              className="admin-button admin-button-primary"
              data-intent={intent}
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
                  Processing...
                </span>
              ) : (
                confirmLabel
              )}
            </button>
          </form>
        </div>
      </div>
    </dialog>
  )
}
