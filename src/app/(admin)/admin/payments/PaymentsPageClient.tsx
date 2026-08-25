'use client'

import { useState } from 'react'

import { PaymentsTable } from '@/components/features/PaymentsTable'
import { RecordPaymentPanel } from '@/components/features/RecordPaymentPanel'
import { PendingPaymentsQueue } from '@/components/features/PendingPaymentsQueue'
import type { Payment } from '@/components/features/PaymentsTable'
import type { PendingPayment } from '@/components/features/PendingPaymentsQueue'

interface PaymentsPageClientProps {
  payments: Payment[]
  pendingPayments: PendingPayment[]
  families: { id: string; family_name: string }[]
  events: { id: string; title: string }[]
  unpaidShares: {
    id: string
    family_id: string
    person_name: string
    year: number
    amount: number | string
  }[]
}

export function PaymentsPageClient({
  payments,
  pendingPayments,
  families,
  events,
  unpaidShares,
}: PaymentsPageClientProps) {
  const [panelOpen, setPanelOpen] = useState(false)
  const pendingCount = payments.filter((payment) => payment.status === 'pending').length

  return (
    <>
      <div className="admin-page-head">
        <div>
          <h1>Payments</h1>
          <p className="admin-page-subtitle">
            Record and track member payments, dues, and donations.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setPanelOpen(true)}
          className="admin-button admin-button-primary"
        >
          <PlusIcon />
          Record payment
        </button>
      </div>

      <div className="admin-stats">
        <SummaryStat label="Total" count={payments.length} detail="recorded payments" />
        <SummaryStat label="Pending" count={pendingCount} detail="awaiting review" />
        <SummaryStat
          label="Membership"
          count={payments.filter((payment) => payment.type === 'membership').length}
          detail="membership dues"
        />
        <SummaryStat
          label="Shares"
          count={payments.filter((payment) => payment.type === 'share').length}
          detail="share payments"
        />
        <SummaryStat
          label="Events"
          count={payments.filter((payment) => payment.type === 'event').length}
          detail="event payments"
        />
        <SummaryStat
          label="Donations"
          count={payments.filter((payment) => payment.type === 'donation').length}
          detail="donations"
        />
      </div>

      <PendingPaymentsQueue payments={pendingPayments} />

      <PaymentsTable payments={payments} />

      <RecordPaymentPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        families={families}
        events={events}
        unpaidShares={unpaidShares}
      />
    </>
  )
}

function SummaryStat({ label, count, detail }: { label: string; count: number; detail: string }) {
  return (
    <div>
      <div className="admin-stat-label">{label}</div>
      <div className="admin-stat-value">{count}</div>
      <div className="admin-stat-detail">{detail}</div>
    </div>
  )
}

function PlusIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}
