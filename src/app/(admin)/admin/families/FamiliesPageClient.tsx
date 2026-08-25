'use client'

import { useEffect, useState } from 'react'

import { CreateFamilyPanel, FamilyAdminPanel } from '@/components/features/FamilyAdminPanels'
import { FamiliesTable } from '@/components/features/FamiliesTable'
import type { AdminFamily, FamilyProfile } from '@/types/admin-family'

interface FamiliesPageClientProps {
  families: AdminFamily[]
  profiles: FamilyProfile[]
}

export function FamiliesPageClient({ families, profiles }: FamiliesPageClientProps) {
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const selectedFamily = selectedFamilyId
    ? (families.find((family) => family.id === selectedFamilyId) ?? null)
    : null

  useEffect(() => {
    if (selectedFamilyId && !families.some((family) => family.id === selectedFamilyId)) {
      setSelectedFamilyId(null)
    }
  }, [families, selectedFamilyId])

  const activeCount = families.filter((family) => family.membership_status === 'active').length
  const pendingCount = families.filter((family) => family.membership_status === 'pending').length
  const expiredCount = families.filter((family) => family.membership_status === 'expired').length
  const assignedCount = profiles.filter((profile) => profile.family_id).length

  return (
    <>
      <div className="admin-page-head">
        <div>
          <h1>Families</h1>
          <p className="admin-page-subtitle">
            Create households, manage membership, and assign portal users.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="admin-button admin-button-primary"
        >
          <PlusIcon />
          Create family
        </button>
      </div>

      <div className="admin-stats">
        <SummaryStat label="Total" count={families.length} detail="family records" />
        <SummaryStat label="Active" count={activeCount} detail="active memberships" />
        <SummaryStat label="Pending" count={pendingCount} detail="awaiting activation" />
        <SummaryStat label="Expired" count={expiredCount} detail="expired memberships" />
        <SummaryStat label="Assigned" count={assignedCount} detail="portal users" />
      </div>

      <FamiliesTable
        families={families}
        selectedFamilyId={selectedFamilyId}
        onRowClick={(family) => setSelectedFamilyId(family.id)}
      />

      <FamilyAdminPanel
        key={selectedFamily?.id ?? 'closed'}
        family={selectedFamily}
        profiles={profiles}
        onClose={() => setSelectedFamilyId(null)}
      />
      {createOpen && <CreateFamilyPanel open onClose={() => setCreateOpen(false)} />}
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
