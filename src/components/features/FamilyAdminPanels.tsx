'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

import {
  assignUserToFamily,
  createFamily,
  removeUserFromFamily,
  updateFamilyAdmin,
} from '@/actions/admin-families'
import { cn } from '@/lib/utils'
import type { AdminFamily, FamilyProfile } from '@/types/admin-family'

const initialState = {
  success: false,
  message: '',
  errors: undefined as Record<string, string[]> | undefined,
}

interface CreateFamilyPanelProps {
  open: boolean
  onClose: () => void
}

export function CreateFamilyPanel({ open, onClose }: CreateFamilyPanelProps) {
  const router = useRouter()
  const [state, formAction, isPending] = useActionState(createFamily, initialState)
  const handledSuccess = useRef(false)

  useEffect(() => {
    if (state.success && !handledSuccess.current) {
      handledSuccess.current = true
      onClose()
      router.refresh()
    }
  }, [state.success, onClose, router])

  useEffect(() => {
    if (open) handledSuccess.current = false
  }, [open])

  usePanelEffects(open, onClose)

  return (
    <PanelShell open={open} onClose={onClose} title="Create Family" label="Create family">
      <form action={formAction} className="space-y-5 px-6 py-6">
        <ActionMessage state={state} />
        <Field label="Family name" name="family_name" required errors={state.errors} />
        <Field label="Phone" name="phone" type="tel" errors={state.errors} />
        <Field label="Address" name="address" errors={state.errors} />
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Membership status"
            name="membership_status"
            defaultValue="pending"
            options={[
              ['pending', 'Pending'],
              ['active', 'Active'],
              ['expired', 'Expired'],
            ]}
            errors={state.errors}
          />
          <SelectField
            label="Membership type"
            name="membership_type"
            defaultValue=""
            options={[
              ['', 'Not set'],
              ['monthly', 'Monthly'],
              ['annual', 'Annual'],
            ]}
            errors={state.errors}
          />
        </div>
        <Field
          label="Membership expires"
          name="membership_expires_at"
          type="date"
          errors={state.errors}
        />
        <div className="flex justify-end gap-2 border-t border-wood-800/10 pt-5">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="admin-button admin-button-quiet"
          >
            Cancel
          </button>
          <button type="submit" disabled={isPending} className="admin-button admin-button-primary">
            {isPending ? 'Creating...' : 'Create family'}
          </button>
        </div>
      </form>
    </PanelShell>
  )
}

interface FamilyAdminPanelProps {
  family: AdminFamily | null
  profiles: FamilyProfile[]
  onClose: () => void
}

export function FamilyAdminPanel({ family, profiles, onClose }: FamilyAdminPanelProps) {
  const open = family !== null
  usePanelEffects(open, onClose)
  if (!family) return null

  const members = profiles.filter((profile) => profile.family_id === family.id)
  const availableProfiles = profiles.filter(
    (profile) => profile.is_active && profile.family_id !== family.id
  )

  return (
    <PanelShell open onClose={onClose} title={family.family_name} label={family.family_name}>
      <div className="space-y-7 px-6 py-6">
        <section>
          <h3 className="mb-3 font-body text-xs font-semibold uppercase tracking-wider text-wood-800/50">
            Family details
          </h3>
          <div className="admin-list">
            <DetailRow label="Phone" value={family.phone ?? '—'} />
            <DetailRow label="Address" value={family.address ?? '—'} />
            <DetailRow label="Portal users" value={String(members.length)} />
          </div>
        </section>

        <MembershipForm key={family.updated_at} family={family} members={members} />
        <MemberAssignmentForm
          key={members.map((member) => member.id).join(':')}
          family={family}
          profiles={availableProfiles}
        />

        <section>
          <h3 className="mb-3 font-body text-xs font-semibold uppercase tracking-wider text-wood-800/50">
            Assigned portal users
          </h3>
          <div className="admin-list">
            {members.length === 0 ? (
              <div className="px-4 py-8 text-center font-body text-sm text-wood-800/50">
                No portal users assigned.
              </div>
            ) : (
              members.map((member) => (
                <div key={member.id} className="admin-list-row">
                  <div className="min-w-0 flex-1">
                    <p className="admin-cell-primary truncate">{profileName(member)}</p>
                    <p className="admin-list-subtitle truncate">{member.email ?? 'No email'}</p>
                  </div>
                  {family.head_of_household === member.id ? (
                    <span className="admin-status admin-status-ok">Head</span>
                  ) : (
                    <RemoveMemberForm familyId={family.id} user={member} />
                  )}
                </div>
              ))
            )}
          </div>
          {family.head_of_household && (
            <p className="mt-2 font-body text-xs text-wood-800/50">
              Change or clear the head of household before removing that user.
            </p>
          )}
        </section>
      </div>
    </PanelShell>
  )
}

function MembershipForm({ family, members }: { family: AdminFamily; members: FamilyProfile[] }) {
  const router = useRouter()
  const [state, formAction, isPending] = useActionState(updateFamilyAdmin, initialState)

  useEffect(() => {
    if (state.success) router.refresh()
  }, [state.success, router])

  return (
    <section>
      <h3 className="mb-3 font-body text-xs font-semibold uppercase tracking-wider text-wood-800/50">
        Membership
      </h3>
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="family_id" value={family.id} />
        <ActionMessage state={state} />
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Status"
            name="membership_status"
            defaultValue={family.membership_status}
            options={[
              ['pending', 'Pending'],
              ['active', 'Active'],
              ['expired', 'Expired'],
            ]}
            errors={state.errors}
          />
          <SelectField
            label="Type"
            name="membership_type"
            defaultValue={family.membership_type ?? ''}
            options={[
              ['', 'Not set'],
              ['monthly', 'Monthly'],
              ['annual', 'Annual'],
            ]}
            errors={state.errors}
          />
        </div>
        <Field
          label="Expires"
          name="membership_expires_at"
          type="date"
          defaultValue={family.membership_expires_at ?? ''}
          errors={state.errors}
        />
        <SelectField
          label="Head of household"
          name="head_of_household"
          defaultValue={family.head_of_household ?? ''}
          options={[
            ['', 'Not set'],
            ...members.map((member) => [member.id, profileName(member)] as [string, string]),
          ]}
          errors={state.errors}
        />
        <button type="submit" disabled={isPending} className="admin-button admin-button-primary">
          {isPending ? 'Saving...' : 'Save membership'}
        </button>
      </form>
    </section>
  )
}

function MemberAssignmentForm({
  family,
  profiles,
}: {
  family: AdminFamily
  profiles: FamilyProfile[]
}) {
  const router = useRouter()
  const [state, formAction, isPending] = useActionState(assignUserToFamily, initialState)
  const [userId, setUserId] = useState('')

  useEffect(() => {
    if (state.success) {
      setUserId('')
      router.refresh()
    }
  }, [state.success, router])

  return (
    <section>
      <h3 className="mb-3 font-body text-xs font-semibold uppercase tracking-wider text-wood-800/50">
        Assign portal user
      </h3>
      <form action={formAction} className="space-y-3">
        <input type="hidden" name="family_id" value={family.id} />
        <ActionMessage state={state} />
        <div className="admin-field">
          <label htmlFor={`assign-user-${family.id}`}>User</label>
          <select
            id={`assign-user-${family.id}`}
            name="user_id"
            required
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
          >
            <option value="">Select a user...</option>
            {profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profileName(profile)}
                {profile.family_id ? ' — reassign' : ''}
              </option>
            ))}
          </select>
          <FieldError errors={state.errors?.user_id} />
        </div>
        <button
          type="submit"
          disabled={isPending || !userId}
          className="admin-button admin-button-primary"
        >
          {isPending ? 'Assigning...' : 'Assign user'}
        </button>
      </form>
    </section>
  )
}

function RemoveMemberForm({ familyId, user }: { familyId: string; user: FamilyProfile }) {
  const router = useRouter()
  const [state, formAction, isPending] = useActionState(removeUserFromFamily, initialState)

  useEffect(() => {
    if (state.success) router.refresh()
  }, [state.success, router])

  return (
    <form action={formAction} className="text-right">
      <input type="hidden" name="family_id" value={familyId} />
      <input type="hidden" name="user_id" value={user.id} />
      <button
        type="submit"
        disabled={isPending}
        className="admin-button admin-button-quiet"
        aria-label={`Remove ${profileName(user)} from family`}
      >
        {isPending ? 'Removing...' : 'Remove'}
      </button>
      {state.message && !state.success && (
        <p className="mt-1 font-body text-xs text-red-600" role="alert">
          {state.message}
        </p>
      )}
    </form>
  )
}

function PanelShell({
  open,
  onClose,
  title,
  label,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  label: string
  children: React.ReactNode
}) {
  return (
    <>
      <div
        className={cn(
          'admin-modal-backdrop transition-opacity',
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={cn(
          'admin-dialog-panel transition-transform',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
        style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        <div className="flex items-center justify-between border-b border-wood-800/10 px-6 py-4">
          <h2 className="font-heading text-xl font-semibold text-wood-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            className="admin-button admin-button-quiet"
          >
            <CloseIcon />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </>
  )
}

function usePanelEffects(open: boolean, onClose: () => void) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && open) onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])
}

function Field({
  label,
  name,
  type = 'text',
  required,
  defaultValue,
  errors,
}: {
  label: string
  name: string
  type?: string
  required?: boolean
  defaultValue?: string
  errors?: Record<string, string[]>
}) {
  return (
    <div className="admin-field">
      <label htmlFor={name}>
        {label} {required && <span className="admin-required">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        aria-invalid={Boolean(errors?.[name])}
      />
      <FieldError errors={errors?.[name]} />
    </div>
  )
}

function SelectField({
  label,
  name,
  defaultValue,
  options,
  errors,
}: {
  label: string
  name: string
  defaultValue: string
  options: [string, string][]
  errors?: Record<string, string[]>
}) {
  return (
    <div className="admin-field">
      <label htmlFor={name}>{label}</label>
      <select
        id={name}
        name={name}
        defaultValue={defaultValue}
        aria-invalid={Boolean(errors?.[name])}
      >
        {options.map(([value, optionLabel]) => (
          <option key={value} value={value}>
            {optionLabel}
          </option>
        ))}
      </select>
      <FieldError errors={errors?.[name]} />
    </div>
  )
}

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null
  return (
    <p className="font-body text-xs text-red-600" role="alert">
      {errors[0]}
    </p>
  )
}

function ActionMessage({
  state,
}: {
  state: { success: boolean; message: string; errors?: Record<string, string[]> }
}) {
  if (!state.message) return null
  return (
    <div className={state.success ? 'admin-status admin-status-ok' : 'admin-error'} role="status">
      {state.message}
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="admin-setting-row">
      <span className="font-body text-sm text-wood-800/60">{label}</span>
      <span className="font-body text-sm font-medium text-wood-900">{value}</span>
    </div>
  )
}

function profileName(profile: FamilyProfile): string {
  return profile.full_name || profile.email || 'Unknown user'
}

function CloseIcon() {
  return (
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
  )
}
