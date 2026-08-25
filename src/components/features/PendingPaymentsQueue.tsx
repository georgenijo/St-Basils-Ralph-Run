'use client'

import { useActionState, useState } from 'react'

import { confirmPayment, rejectPayment } from '@/actions/admin-payments'
import { Button } from '@/components/ui'

// ─── Types ───────────────────────────────────────────────────────────

export interface PendingPayment {
  id: string
  family_name: string | null
  type: string
  method: string | null
  amount: number
  reference_memo: string | null
  created_at: string
}

interface PendingPaymentsQueueProps {
  payments: PendingPayment[]
}

// ─── Constants ──────────────────────────────────────────────────────

const METHOD_LABELS: Record<string, string> = {
  zelle: 'Zelle',
  venmo: 'Venmo',
  cashapp: 'Cash App',
  cash: 'Cash',
  check: 'Check',
  online: 'Online',
}

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const initialState = {
  success: false,
  message: '',
  errors: undefined as Record<string, string[]> | undefined,
}

// ─── Component ──────────────────────────────────────────────────────

export function PendingPaymentsQueue({ payments }: PendingPaymentsQueueProps) {
  if (payments.length === 0) return null

  return (
    <section className="admin-section">
      <div className="admin-section-head">
        <h2>Pending payments</h2>
        <span className="admin-meta">{payments.length} pending</span>
      </div>

      <div className="admin-table-wrap">
        <div>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Family</th>
                <th>Type</th>
                <th>Method</th>
                <th>Reference</th>
                <th className="admin-cell-number">Amount</th>
                <th>Submitted</th>
                <th className="admin-cell-number">Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <PendingPaymentRow key={payment.id} payment={payment} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

// ─── Row Component ──────────────────────────────────────────────────

function PendingPaymentRow({ payment }: { payment: PendingPayment }) {
  const [confirmState, confirmAction, isConfirming] = useActionState(confirmPayment, initialState)
  const [rejectState, rejectAction, isRejecting] = useActionState(rejectPayment, initialState)
  const [showRejectForm, setShowRejectForm] = useState(false)

  if (confirmState.success || rejectState.success) {
    return null // Row disappears on success (revalidation handles the refresh)
  }

  return (
    <>
      <tr>
        <td className="admin-cell-primary whitespace-nowrap">{payment.family_name ?? '—'}</td>
        <td className="admin-cell-secondary whitespace-nowrap">
          <span className="capitalize">{payment.type}</span>
        </td>
        <td className="admin-cell-secondary whitespace-nowrap">
          {METHOD_LABELS[payment.method ?? ''] ?? payment.method ?? '—'}
        </td>
        <td className="whitespace-nowrap">
          <code className="admin-meta">{payment.reference_memo ?? '—'}</code>
        </td>
        <td className="admin-cell-number whitespace-nowrap">{usd.format(payment.amount)}</td>
        <td className="admin-cell-mono admin-cell-secondary whitespace-nowrap">
          {formatDate(payment.created_at)}
        </td>
        <td className="admin-cell-number whitespace-nowrap">
          <div className="flex items-center justify-end gap-2">
            <form action={confirmAction}>
              <input type="hidden" name="payment_id" value={payment.id} />
              <Button
                type="submit"
                size="sm"
                disabled={isConfirming || isRejecting}
                className="admin-button admin-button-quiet"
              >
                {isConfirming ? 'Confirming...' : 'Confirm'}
              </Button>
            </form>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowRejectForm(!showRejectForm)}
              disabled={isConfirming || isRejecting}
              className="admin-button admin-button-bare"
            >
              Reject
            </Button>
          </div>
          {confirmState.message && !confirmState.success && (
            <p className="admin-error">{confirmState.message}</p>
          )}
        </td>
      </tr>

      {/* Inline reject form */}
      {showRejectForm && (
        <tr>
          <td colSpan={7}>
            <form action={rejectAction} className="flex items-center gap-3">
              <input type="hidden" name="payment_id" value={payment.id} />
              <input
                name="reason"
                type="text"
                required
                placeholder="Reason for rejection..."
                className="flex-1"
              />
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                disabled={isRejecting}
                className="admin-button admin-button-quiet"
              >
                {isRejecting ? 'Rejecting...' : 'Submit'}
              </Button>
              <button
                type="button"
                onClick={() => setShowRejectForm(false)}
                className="admin-button admin-button-bare"
              >
                Cancel
              </button>
            </form>
            {rejectState.message && !rejectState.success && (
              <p className="admin-error">{rejectState.message}</p>
            )}
          </td>
        </tr>
      )}
    </>
  )
}
