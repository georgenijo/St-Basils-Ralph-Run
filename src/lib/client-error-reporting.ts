'use client'

export interface ClientErrorDetails {
  digest?: string
  componentStack?: string | null
}

export function reportClientError(
  error: Error & { digest?: string },
  details = {} as ClientErrorDetails
) {
  const payload = {
    name: error.name,
    message: error.message,
    stack: error.stack,
    digest: details.digest ?? error.digest,
    componentStack: details.componentStack ?? undefined,
    path: typeof window === 'undefined' ? undefined : window.location.pathname,
  }

  void fetch('/api/log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => undefined)
}
