'use client'

import { useActionState } from 'react'

import { updateProfile } from '@/actions/profile'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'

interface ProfileSettingsFormProps {
  email: string
  initial: {
    full_name: string
    phone: string
    avatar_url: string
  }
}

const inputBase =
  'mt-1 block w-full rounded-lg border border-wood-800/20 bg-cream-50 px-4 py-3 text-wood-800 placeholder:text-wood-800/40 focus-visible:border-burgundy-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burgundy-700 focus-visible:ring-offset-2'

export function ProfileSettingsForm({ email, initial }: ProfileSettingsFormProps) {
  const [state, formAction, pending] = useActionState(updateProfile, {
    success: false,
    message: '',
  })

  return (
    <form action={formAction} className="space-y-5">
      {state.message && (
        <div
          role={state.success ? 'status' : 'alert'}
          className={cn(
            'rounded-lg border px-4 py-3 text-sm',
            state.success
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-red-200 bg-red-50 text-red-700'
          )}
        >
          {state.message}
        </div>
      )}

      <div>
        <label htmlFor="profile-email" className="block text-sm font-medium text-wood-900">
          Email
        </label>
        <input
          id="profile-email"
          type="email"
          value={email}
          disabled
          className={cn(inputBase, 'cursor-not-allowed opacity-60')}
        />
        <p className="mt-1 text-xs text-wood-800/60">Contact an administrator to change it.</p>
      </div>

      <div>
        <label htmlFor="profile-full-name" className="block text-sm font-medium text-wood-900">
          Full name
        </label>
        <input
          id="profile-full-name"
          name="full_name"
          type="text"
          autoComplete="name"
          required
          maxLength={200}
          defaultValue={initial.full_name}
          aria-invalid={Boolean(state.errors?.full_name)}
          aria-describedby={state.errors?.full_name ? 'profile-full-name-error' : undefined}
          className={cn(inputBase, state.errors?.full_name && 'border-red-400')}
        />
        {state.errors?.full_name && (
          <p id="profile-full-name-error" className="mt-1 text-xs text-red-600">
            {state.errors.full_name[0]}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="profile-phone" className="block text-sm font-medium text-wood-900">
          Phone
        </label>
        <input
          id="profile-phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          maxLength={30}
          defaultValue={initial.phone}
          aria-invalid={Boolean(state.errors?.phone)}
          aria-describedby={state.errors?.phone ? 'profile-phone-error' : undefined}
          className={cn(inputBase, state.errors?.phone && 'border-red-400')}
        />
        {state.errors?.phone && (
          <p id="profile-phone-error" className="mt-1 text-xs text-red-600">
            {state.errors.phone[0]}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="profile-avatar-url" className="block text-sm font-medium text-wood-900">
          Avatar URL
        </label>
        <input
          id="profile-avatar-url"
          name="avatar_url"
          type="url"
          inputMode="url"
          placeholder="https://example.com/photo.jpg"
          maxLength={2048}
          defaultValue={initial.avatar_url}
          aria-invalid={Boolean(state.errors?.avatar_url)}
          aria-describedby={state.errors?.avatar_url ? 'profile-avatar-url-error' : undefined}
          className={cn(inputBase, state.errors?.avatar_url && 'border-red-400')}
        />
        {state.errors?.avatar_url && (
          <p id="profile-avatar-url-error" className="mt-1 text-xs text-red-600">
            {state.errors.avatar_url[0]}
          </p>
        )}
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? 'Saving…' : 'Save profile'}
      </Button>
    </form>
  )
}
