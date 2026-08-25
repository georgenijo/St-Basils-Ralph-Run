'use client'

import { useEffect } from 'react'

import { reportClientError } from '@/lib/client-error-reporting'

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => reportClientError(error), [error])

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-6 text-center">
      <h1 className="font-heading text-3xl font-semibold text-wood-900">Something went wrong</h1>
      <p className="mt-4 font-body text-wood-800/70">
        The problem has been reported. Please try again.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-lg bg-burgundy-700 px-5 py-2.5 font-body text-sm font-medium text-cream-50"
      >
        Try again
      </button>
    </main>
  )
}
