'use client'

import Link from 'next/link'
import { useActionState, useRef } from 'react'
import type { TurnstileInstance } from '@marsidev/react-turnstile'

import { requestPasswordReset } from '@/actions/forgot-password'
import { CaptchaField } from '@/components/features/CaptchaField'
import { Button } from '@/components/ui'

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, {
    success: false,
    message: '',
  })
  const turnstileRef = useRef<TurnstileInstance>(null)

  if (state.success) {
    return (
      <div className="space-y-5 text-center" role="status" aria-live="polite">
        <p className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {state.message}
        </p>
        <p className="text-sm text-wood-800/70">
          Check your inbox and spam folder. Reset links expire after one hour.
        </p>
        <Link href="/login" className="text-sm font-medium text-burgundy-700 hover:underline">
          Return to sign in
        </Link>
      </div>
    )
  }

  return (
    <form action={formAction} className="space-y-5">
      <p className="text-sm leading-relaxed text-wood-800/70">
        Enter the email address for your portal account and we’ll send instructions for choosing a
        new password.
      </p>

      <div className="hidden" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {state.message && !state.errors && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {state.message}
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-sm font-medium text-wood-800">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="block w-full rounded-lg border border-wood-800/20 bg-cream-50 px-4 py-3 text-wood-800 placeholder:text-wood-800/40 focus-visible:border-burgundy-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burgundy-700 focus-visible:ring-offset-2"
          placeholder="you@example.com"
        />
        {state.errors?.email && (
          <p className="text-sm text-red-600" role="alert">
            {state.errors.email[0]}
          </p>
        )}
      </div>

      <CaptchaField turnstileRef={turnstileRef} theme="light" />

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? 'Sending…' : 'Send reset link'}
      </Button>

      <p className="text-center">
        <Link href="/login" className="text-sm font-medium text-burgundy-700 hover:underline">
          Back to sign in
        </Link>
      </p>
    </form>
  )
}
