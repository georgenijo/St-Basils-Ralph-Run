'use client'

import { useActionState, useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

import { cn } from '@/lib/utils'
import {
  updateUserRole,
  deactivateUser,
  reactivateUser,
  sendPasswordReset,
  fetchUserAuditLog,
} from '@/actions/users'
import { assignUserToFamily, removeUserFromFamily } from '@/actions/admin-families'
import type { AuditLogEntry } from '@/actions/users'
import { Button } from '@/components/ui'
import { UserActionDialog } from './UserActionDialog'

import type { User } from '@/types/user'
import type { FamilyOption } from '@/types/admin-family'

// ─── Types ───────────────────────────────────────────────────────────

interface UserDetailPanelProps {
  user: User | null
  currentUserId: string
  families: FamilyOption[]
  onClose: () => void
}

// ─── Constants ───────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  member: 'Member',
}

type DialogType = 'role' | 'deactivate' | 'reactivate' | 'password' | null

// ─── Helpers ─────────────────────────────────────────────────────────

function getInitials(name: string | null, email: string | null): string {
  if (name) {
    return name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }
  return (email?.[0] ?? '?').toUpperCase()
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function describeAction(entry: AuditLogEntry): string {
  switch (entry.action) {
    case 'user.invite':
      return `invited this user as ${entry.metadata.role ?? 'member'}`
    case 'user.role_change':
      return `changed role from ${entry.metadata.old_role ?? '?'} to ${entry.metadata.new_role ?? '?'}`
    case 'user.deactivate':
      return 'deactivated this account'
    case 'user.reactivate':
      return 'reactivated this account'
    case 'user.password_reset':
      return 'sent a password reset email'
    case 'family.assign_member':
      return `assigned this user to ${entry.metadata.family_name ?? 'a family'}`
    case 'family.remove_member':
      return `removed this user from ${entry.metadata.family_name ?? 'a family'}`
    case 'family.create':
      return `created ${entry.metadata.family_name ?? 'a family'}`
    case 'family.update':
      return `updated ${entry.metadata.family_name ?? 'a family'}`
    default:
      return entry.action
  }
}

// ─── Component ───────────────────────────────────────────────────────

export function UserDetailPanel({ user, currentUserId, families, onClose }: UserDetailPanelProps) {
  const router = useRouter()
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([])
  const [auditLoading, setAuditLoading] = useState(false)
  const [activeDialog, setActiveDialog] = useState<DialogType>(null)

  const isOpen = user !== null
  const isSelf = user?.id === currentUserId

  // Fetch audit log when user changes
  useEffect(() => {
    if (!user) {
      setAuditLog([])
      return
    }
    let stale = false
    setAuditLoading(true)
    fetchUserAuditLog(user.id)
      .then((entries) => {
        if (!stale) setAuditLog(entries)
      })
      .finally(() => {
        if (!stale) setAuditLoading(false)
      })
    return () => {
      stale = true
    }
  }, [user])

  // Escape key handler
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen && !activeDialog) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, activeDialog, onClose])

  // Prevent body scroll when panel is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const handleActionSuccess = useCallback(() => {
    router.refresh()
    if (user) {
      fetchUserAuditLog(user.id).then(setAuditLog)
    }
  }, [router, user])

  if (!user) return null

  const status = user.is_active ? 'active' : 'deactivated'
  const displayName = user.full_name || user.email || 'Unknown'
  const initials = getInitials(user.full_name, user.email)
  // Derive "Invited By" from audit log
  const inviteEntry = auditLog.find((e) => e.action === 'user.invite')
  const invitedBy = inviteEntry?.actor_name ?? '—'

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'admin-modal-backdrop transition-opacity',
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Details for ${displayName}`}
        className={cn(
          'admin-dialog-panel transition-transform',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
        style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between bg-[var(--surface)] px-6 pt-6">
          <div />
          <button
            onClick={onClose}
            aria-label="Close panel"
            className="admin-button admin-button-quiet"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {/* User info */}
          <div className="flex gap-4">
            <div className="admin-meta flex h-14 w-14 flex-shrink-0 items-center justify-center text-xl font-semibold">
              {initials}
            </div>
            <div>
              <h2 className="font-heading text-xl font-semibold text-wood-900">
                {displayName}
                {isSelf && (
                  <span className="ml-1 font-body text-sm font-normal text-wood-800/50">(you)</span>
                )}
              </h2>
              <p className="mt-0.5 font-body text-sm text-wood-800/60">{user.email}</p>
              <div className="mt-2 flex gap-2">
                <span className="admin-status">{ROLE_LABELS[user.role] ?? user.role}</span>
                <span className={cn('admin-status', status === 'active' && 'admin-status-ok')}>
                  {status === 'active' ? 'Active' : 'Deactivated'}
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-5 border-b border-wood-800/10 pb-5">
            {isSelf ? (
              <p className="font-body text-sm text-wood-800/50">
                Actions are disabled for your own account.
              </p>
            ) : user.is_active ? (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setActiveDialog('password')}
                  className="admin-button admin-button-quiet"
                >
                  <LockIcon />
                  Password Reset
                </button>
                <button
                  onClick={() => setActiveDialog('role')}
                  className="admin-button admin-button-quiet"
                >
                  <UserCheckIcon />
                  Change Role
                </button>
                <button
                  onClick={() => setActiveDialog('deactivate')}
                  className="admin-button admin-button-quiet"
                >
                  <BanIcon />
                  Deactivate
                </button>
              </div>
            ) : (
              <button
                onClick={() => setActiveDialog('reactivate')}
                className="admin-button admin-button-quiet"
              >
                <RefreshIcon />
                Reactivate
              </button>
            )}
          </div>

          {/* Account details */}
          <div className="mt-5">
            <h3 className="mb-3 font-body text-xs font-semibold uppercase tracking-wider text-wood-800/50">
              Account Details
            </h3>
            <div className="admin-list">
              <DetailRow label="Email" value={user.email ?? '—'} />
              <DetailRow
                label="Role"
                value={<span className="admin-status">{ROLE_LABELS[user.role] ?? user.role}</span>}
              />
              <DetailRow
                label="Status"
                value={
                  <span className={cn('admin-status', status === 'active' && 'admin-status-ok')}>
                    {status === 'active' ? 'Active' : 'Deactivated'}
                  </span>
                }
              />
              <DetailRow label="Joined" value={formatDate(user.created_at)} />
              <DetailRow label="Last Updated" value={formatDate(user.updated_at)} />
              <DetailRow label="Invited By" value={invitedBy} />
              <DetailRow
                label="Family"
                value={families.find((family) => family.id === user.family_id)?.family_name ?? '—'}
              />
            </div>
          </div>

          <UserFamilyControl
            key={`${user.id}:${user.family_id ?? ''}`}
            user={user}
            families={families}
            onSuccess={handleActionSuccess}
          />

          {/* Activity / Audit log */}
          <div className="mt-5">
            <h3 className="mb-3 font-body text-xs font-semibold uppercase tracking-wider text-wood-800/50">
              Activity
            </h3>
            <div className="admin-list">
              {auditLoading ? (
                <div className="px-4 py-8 text-center font-body text-sm text-wood-800/50">
                  Loading activity...
                </div>
              ) : auditLog.length === 0 ? (
                <div className="px-4 py-8 text-center font-body text-sm text-wood-800/50">
                  No activity recorded yet.
                </div>
              ) : (
                auditLog.map((entry) => (
                  <div key={entry.id} className="admin-list-row items-start">
                    <span className="admin-status mt-1.5" aria-hidden="true" />
                    <p className="flex-1 font-body text-[13px] leading-relaxed text-wood-800">
                      <strong className="font-semibold">{entry.actor_name}</strong>{' '}
                      {describeAction(entry)}
                    </p>
                    <span className="flex-shrink-0 font-body text-xs text-wood-800/40">
                      {formatDate(entry.created_at)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation dialogs */}
      {activeDialog === 'role' && (
        <ChangeRoleDialog
          key={user.id}
          open
          onClose={() => setActiveDialog(null)}
          onSuccess={handleActionSuccess}
          user={user}
        />
      )}
      {activeDialog === 'deactivate' && (
        <UserActionDialog
          key={user.id}
          open
          onClose={() => setActiveDialog(null)}
          onSuccess={handleActionSuccess}
          title="Deactivate User"
          description={`Deactivate ${displayName}? They won\u2019t be able to log in.`}
          action={deactivateUser}
          hiddenFields={{ user_id: user.id }}
          confirmLabel="Deactivate"
          intent="destructive"
        />
      )}
      {activeDialog === 'reactivate' && (
        <UserActionDialog
          key={user.id}
          open
          onClose={() => setActiveDialog(null)}
          onSuccess={handleActionSuccess}
          title="Reactivate User"
          description={`Reactivate ${displayName}? They\u2019ll be able to log in again.`}
          action={reactivateUser}
          hiddenFields={{ user_id: user.id }}
          confirmLabel="Reactivate"
        />
      )}
      {activeDialog === 'password' && (
        <UserActionDialog
          key={user.id}
          open
          onClose={() => setActiveDialog(null)}
          onSuccess={handleActionSuccess}
          title="Password Reset"
          description={`Send a password reset email to ${user.email}?`}
          action={sendPasswordReset}
          hiddenFields={{ user_id: user.id }}
          confirmLabel="Send Reset Email"
        />
      )}
    </>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="admin-setting-row">
      <span className="font-body text-sm text-wood-800/60">{label}</span>
      <span className="font-body text-sm font-medium text-wood-900">{value}</span>
    </div>
  )
}

function UserFamilyControl({
  user,
  families,
  onSuccess,
}: {
  user: User
  families: FamilyOption[]
  onSuccess: () => void
}) {
  const [selectedFamilyId, setSelectedFamilyId] = useState(user.family_id ?? '')
  const [assignState, assignAction, assignPending] = useActionState(assignUserToFamily, {
    success: false,
    message: '',
  })
  const [removeState, removeAction, removePending] = useActionState(removeUserFromFamily, {
    success: false,
    message: '',
  })
  const handledAssign = useRef(false)
  const handledRemove = useRef(false)

  useEffect(() => {
    if (assignState.success && !handledAssign.current) {
      handledAssign.current = true
      onSuccess()
    }
  }, [assignState.success, onSuccess])

  useEffect(() => {
    if (removeState.success && !handledRemove.current) {
      handledRemove.current = true
      setSelectedFamilyId('')
      onSuccess()
    }
  }, [removeState.success, onSuccess])

  const message = assignState.message || removeState.message
  const success = assignState.success || removeState.success

  return (
    <div className="mt-5">
      <h3 className="mb-3 font-body text-xs font-semibold uppercase tracking-wider text-wood-800/50">
        Family assignment
      </h3>
      <div className="admin-list p-4">
        {message && (
          <div className={success ? 'admin-status admin-status-ok' : 'admin-error'} role="status">
            {message}
          </div>
        )}
        <form action={assignAction} className="mt-3 flex flex-wrap items-end gap-2">
          <input type="hidden" name="user_id" value={user.id} />
          <div className="admin-field min-w-0 flex-1">
            <label htmlFor={`user-family-${user.id}`}>Family</label>
            <select
              id={`user-family-${user.id}`}
              name="family_id"
              required
              value={selectedFamilyId}
              onChange={(event) => setSelectedFamilyId(event.target.value)}
            >
              <option value="">Select a family...</option>
              {families.map((family) => (
                <option key={family.id} value={family.id}>
                  {family.family_name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={
              assignPending || !selectedFamilyId || selectedFamilyId === (user.family_id ?? '')
            }
            className="admin-button admin-button-primary"
          >
            {assignPending ? 'Saving...' : user.family_id ? 'Reassign' : 'Assign'}
          </button>
        </form>
        {user.family_id && (
          <form action={removeAction} className="mt-2">
            <input type="hidden" name="user_id" value={user.id} />
            <input type="hidden" name="family_id" value={user.family_id} />
            <button
              type="submit"
              disabled={removePending}
              className="admin-button admin-button-quiet"
            >
              {removePending ? 'Removing...' : 'Remove from family'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

// ─── Change Role Dialog ──────────────────────────────────────────────

function ChangeRoleDialog({
  open,
  onClose,
  onSuccess,
  user,
}: {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  user: User
}) {
  const [state, formAction, isPending] = useActionState(updateUserRole, {
    success: false,
    message: '',
  })
  const [selectedRole, setSelectedRole] = useState(user.role)
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    if (open) {
      dialogRef.current?.showModal()
    } else {
      dialogRef.current?.close()
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

  const displayName = user.full_name || user.email || 'Unknown'
  const isSameRole = selectedRole === user.role

  return (
    <dialog ref={dialogRef} onClose={onClose}>
      <div className="admin-dialog-head">
        <h2>Change Role</h2>
        <p>Select a new role for {displayName}.</p>

        <div className="admin-segmented mt-4">
          {(['admin', 'member'] as const).map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => setSelectedRole(role)}
              aria-pressed={selectedRole === role}
            >
              {ROLE_LABELS[role]}
              {user.role === role && (
                <span className="ml-1.5 text-xs font-normal text-wood-800/40">(current)</span>
              )}
            </button>
          ))}
        </div>

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
            <input type="hidden" name="user_id" value={user.id} />
            <input type="hidden" name="role" value={selectedRole} />
            <button
              type="submit"
              disabled={isPending || isSameRole}
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
                  Updating...
                </span>
              ) : (
                'Change Role'
              )}
            </button>
          </form>
        </div>
      </div>
    </dialog>
  )
}

// ─── Icons ───────────────────────────────────────────────────────────

function LockIcon() {
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
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

function UserCheckIcon() {
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
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <polyline points="17 11 19 13 23 9" />
    </svg>
  )
}

function BanIcon() {
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
      <circle cx="12" cy="12" r="10" />
      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
    </svg>
  )
}

function RefreshIcon() {
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
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
    </svg>
  )
}
