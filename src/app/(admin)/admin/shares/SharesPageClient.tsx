'use client'

import {
  forwardRef,
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { markSharesPaid } from '@/actions/shares'
import { SharesTable } from '@/components/features/SharesTable'

// ─── Types ───────────────────────────────────────────────────────────

export interface Share {
  id: string
  person_name: string
  year: number
  amount: number
  paid: boolean
  created_at: string
  family_id: string
  family_name: string
}

interface SharesPageClientProps {
  shares: Share[]
  years: number[]
  defaultYear: number
}

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'check', label: 'Check' },
  { value: 'zelle', label: 'Zelle' },
  { value: 'online', label: 'Online' },
] as const

// ─── Component ──────────────────────────────────────────────────────

export function SharesPageClient({ shares, years, defaultYear }: SharesPageClientProps) {
  const [year, setYear] = useState(defaultYear)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [modalOpen, setModalOpen] = useState(false)
  const [modalIds, setModalIds] = useState<string[]>([])
  const dialogRef = useRef<HTMLDialogElement>(null)

  const filtered = useMemo(() => shares.filter((s) => s.year === year), [shares, year])

  // Sync dialog element with modalOpen state
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (modalOpen) {
      dialog.showModal()
    } else {
      dialog.close()
    }
  }, [modalOpen])

  // Clear selection when year changes
  useEffect(() => {
    setSelectedIds(new Set())
  }, [year])

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const handleToggleSelectAll = useCallback((ids: string[]) => {
    setSelectedIds((prev) => {
      const allSelected = ids.every((id) => prev.has(id))
      if (allSelected) {
        const next = new Set(prev)
        ids.forEach((id) => next.delete(id))
        return next
      }
      return new Set([...prev, ...ids])
    })
  }, [])

  function openMarkPaidModal(ids: string[]) {
    setModalIds(ids)
    setModalOpen(true)
  }

  function handleMarkPaidSelected() {
    const unpaidSelected = [...selectedIds].filter((id) =>
      filtered.find((s) => s.id === id && !s.paid)
    )
    if (unpaidSelected.length === 0) return
    openMarkPaidModal(unpaidSelected)
  }

  // CSV export
  function exportCsv() {
    const header = 'Person Name,Bought By,Amount,Paid,Date'
    const rows = filtered.map((s) => {
      const name = s.person_name.replace(/"/g, '""')
      const family = s.family_name.replace(/"/g, '""')
      const date = new Date(s.created_at).toLocaleDateString('en-US', {
        timeZone: 'UTC',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
      return `"${name}","${family}",${s.amount},${s.paid ? 'Yes' : 'No'},"${date}"`
    })
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `shares-${year}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const unpaidSelectedCount = [...selectedIds].filter((id) =>
    filtered.find((s) => s.id === id && !s.paid)
  ).length

  return (
    <>
      {/* Toolbar: year selector + action buttons */}
      <div className="admin-toolbar">
        <div className="flex items-center gap-2">
          <label htmlFor="year-select">Year</label>
          <select id="year-select" value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-1 items-center justify-end gap-2">
          {unpaidSelectedCount > 0 && (
            <button
              type="button"
              onClick={handleMarkPaidSelected}
              className="admin-button admin-button-primary"
            >
              Mark as Paid ({unpaidSelectedCount})
            </button>
          )}
          <button type="button" onClick={exportCsv} className="admin-button admin-button-quiet">
            <DownloadIcon />
            Export CSV
          </button>
        </div>
      </div>

      <SharesTable
        shares={filtered}
        selectedIds={selectedIds}
        onToggleSelect={handleToggleSelect}
        onToggleSelectAll={handleToggleSelectAll}
        onMarkPaid={(ids) => openMarkPaidModal(ids)}
      />

      {/* Mark as Paid modal */}
      <MarkPaidDialog
        ref={dialogRef}
        open={modalOpen}
        shareIds={modalIds}
        onClose={() => {
          setModalOpen(false)
          setSelectedIds(new Set())
        }}
      />
    </>
  )
}

// ─── Mark Paid Dialog ────────────────────────────────────────────────

interface MarkPaidDialogProps {
  open: boolean
  shareIds: string[]
  onClose: () => void
}

const MarkPaidDialog = forwardRef<HTMLDialogElement, MarkPaidDialogProps>(function MarkPaidDialog(
  { open, shareIds, onClose },
  ref
) {
  const [state, formAction, isPending] = useActionState(markSharesPaid, {
    success: false,
    message: '',
  })

  useEffect(() => {
    if (state.success && open) {
      onClose()
    }
  }, [state.success, open, onClose])

  return (
    <dialog ref={ref} onClose={onClose}>
      <form action={formAction}>
        <div className="admin-dialog-head">
          <h2>Mark as Paid</h2>
          <p>
            Mark {shareIds.length} share{shareIds.length !== 1 ? 's' : ''} as paid and record the
            payment.
          </p>
        </div>

        {state.message && !state.success && (
          <p className="admin-error mx-[22px]">{state.message}</p>
        )}

        {/* Hidden share_ids */}
        <input type="hidden" name="share_ids" value={JSON.stringify(shareIds)} />

        <div className="admin-dialog-body">
          <div className="admin-field">
            <label htmlFor="payment-method">Payment Method</label>
            <select id="payment-method" name="method" required>
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div className="admin-field">
            <label htmlFor="payment-note">Note (optional)</label>
            <input
              id="payment-note"
              name="note"
              type="text"
              maxLength={500}
              placeholder="e.g. check number 1234"
            />
          </div>
        </div>

        <div className="admin-dialog-footer">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="admin-button admin-button-quiet"
          >
            Cancel
          </button>
          <button type="submit" disabled={isPending} className="admin-button admin-button-primary">
            {isPending ? 'Saving...' : 'Confirm Payment'}
          </button>
        </div>
      </form>
    </dialog>
  )
})

// ─── Icons ──────────────────────────────────────────────────────────

function DownloadIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}
