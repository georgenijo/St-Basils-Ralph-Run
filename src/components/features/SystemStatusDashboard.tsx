'use client'

import { useEffect, useMemo, useState } from 'react'

import { Button, Card } from '@/components/ui'
import { cn } from '@/lib/utils'

type HealthPayload = {
  ok: boolean
  db: boolean
  cms: boolean
  latency_ms: number
}

type HealthSnapshot =
  | {
      state: 'loading'
    }
  | {
      state: 'ready'
      body: HealthPayload
      httpStatus: number
      cacheControl: string
      checkedAt: Date
    }
  | {
      state: 'error'
      message: string
      checkedAt: Date
    }

const refreshIntervalMs = 60_000

export function SystemStatusDashboard() {
  const [snapshot, setSnapshot] = useState<HealthSnapshot>({ state: 'loading' })
  const [isRefreshing, setIsRefreshing] = useState(false)

  async function refresh() {
    setIsRefreshing(true)
    try {
      const response = await fetch('/api/health', {
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      })
      const body = (await response.json()) as Partial<HealthPayload>

      if (!isHealthPayload(body)) {
        throw new Error('Health endpoint returned an unexpected response.')
      }

      setSnapshot({
        state: 'ready',
        body,
        httpStatus: response.status,
        cacheControl: response.headers.get('cache-control') ?? '',
        checkedAt: new Date(),
      })
    } catch (error) {
      setSnapshot({
        state: 'error',
        message: error instanceof Error ? error.message : 'Unable to read system health.',
        checkedAt: new Date(),
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    void refresh()
    const interval = window.setInterval(() => {
      void refresh()
    }, refreshIntervalMs)

    return () => window.clearInterval(interval)
  }, [])

  const componentRows = useMemo(() => {
    if (snapshot.state !== 'ready') return []

    return [
      {
        label: 'Website',
        ok: snapshot.body.ok,
        detail: snapshot.body.ok
          ? 'The app can reach its monitored dependencies.'
          : 'One or more monitored dependencies is unavailable.',
      },
      {
        label: 'Database',
        ok: snapshot.body.db,
        detail: snapshot.body.db
          ? 'Supabase responded to the reachability query.'
          : 'Supabase did not respond successfully.',
      },
      {
        label: 'Content',
        ok: snapshot.body.cms,
        detail: snapshot.body.cms
          ? 'Sanity responded to the content ping.'
          : 'Sanity is failing or is not configured for this deployment.',
      },
    ]
  }, [snapshot])

  return (
    <div className="space-y-6">
      <Card variant="outlined" className="overflow-hidden border-wood-800/10 bg-cream-50">
        <Card.Body className="space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.08em] text-burgundy-700">
                Live health check
              </p>
              <h2 className="mt-2 font-heading text-2xl font-semibold text-wood-900 md:text-3xl">
                {snapshot.state === 'ready'
                  ? snapshot.body.ok
                    ? 'All monitored systems operational'
                    : 'Service degradation detected'
                  : snapshot.state === 'error'
                    ? 'Health check unavailable'
                    : 'Checking system health'}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-wood-800/70">
                This view reads the same public JSON endpoint used by uptime monitoring and presents
                the component status in a form that is easier to scan.
              </p>
            </div>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => void refresh()}
              disabled={isRefreshing}
              className="w-full md:w-auto"
            >
              {isRefreshing ? 'Refreshing' : 'Refresh'}
            </Button>
          </div>

          {snapshot.state === 'loading' && (
            <div className="grid gap-4 md:grid-cols-3" aria-live="polite">
              {['Website', 'Database', 'Content'].map((label) => (
                <StatusSkeleton key={label} label={label} />
              ))}
            </div>
          )}

          {snapshot.state === 'error' && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
              <p className="font-semibold">Unable to load health data</p>
              <p className="mt-1 text-red-900/80">{snapshot.message}</p>
              <p className="mt-3 text-xs text-red-900/60">
                Last attempted {formatTime(snapshot.checkedAt)}
              </p>
            </div>
          )}

          {snapshot.state === 'ready' && (
            <>
              <div className="grid gap-4 md:grid-cols-3" aria-live="polite">
                {componentRows.map((row) => (
                  <ComponentStatusCard key={row.label} {...row} />
                ))}
              </div>

              <div className="grid gap-4 border-t border-wood-800/10 pt-6 md:grid-cols-3">
                <Metric label="HTTP status" value={String(snapshot.httpStatus)} />
                <Metric label="Latency" value={`${snapshot.body.latency_ms} ms`} />
                <Metric label="Last checked" value={formatTime(snapshot.checkedAt)} />
              </div>

              <div className="rounded-lg border border-wood-800/10 bg-sand/60 p-4">
                <h3 className="font-heading text-lg font-semibold text-wood-900">Current signal</h3>
                <p className="mt-2 text-sm leading-relaxed text-wood-800/75">
                  {statusSummary(snapshot.body)}
                </p>
                {snapshot.cacheControl && (
                  <p className="mt-3 break-words font-mono text-xs text-wood-800/55">
                    Cache-Control: {snapshot.cacheControl}
                  </p>
                )}
              </div>
            </>
          )}
        </Card.Body>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card variant="outlined" className="border-wood-800/10 bg-white">
          <Card.Body>
            <h3 className="font-heading text-xl font-semibold text-wood-900">What this checks</h3>
            <ul className="mt-4 space-y-3 text-sm leading-relaxed text-wood-800/75">
              <li>Database: Supabase Postgres reachability.</li>
              <li>Content: Sanity CMS reachability.</li>
              <li>Overall: healthy only when both checks pass.</li>
            </ul>
          </Card.Body>
        </Card>

        <Card variant="outlined" className="border-wood-800/10 bg-white">
          <Card.Body>
            <h3 className="font-heading text-xl font-semibold text-wood-900">When a check fails</h3>
            <p className="mt-4 text-sm leading-relaxed text-wood-800/75">
              A failed content check usually means Sanity is unavailable or the deployment is
              missing Sanity configuration. A failed database check points to Supabase availability
              or configuration. The page never displays secret values.
            </p>
          </Card.Body>
        </Card>
      </div>
    </div>
  )
}

function ComponentStatusCard({
  label,
  ok,
  detail,
}: {
  label: string
  ok: boolean
  detail: string
}) {
  return (
    <div
      className={cn(
        'rounded-lg border p-4',
        ok ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'
      )}
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className={cn('h-3 w-3 rounded-full', ok ? 'bg-emerald-600' : 'bg-red-600')}
        />
        <h3
          className={cn(
            'font-heading text-lg font-semibold',
            ok ? 'text-emerald-950' : 'text-red-950'
          )}
        >
          {label}
        </h3>
      </div>
      <p className={cn('mt-2 text-sm', ok ? 'text-emerald-950/75' : 'text-red-950/75')}>
        {ok ? 'Operational' : 'Needs attention'}
      </p>
      <p
        className={cn(
          'mt-3 text-sm leading-relaxed',
          ok ? 'text-emerald-950/70' : 'text-red-950/70'
        )}
      >
        {detail}
      </p>
    </div>
  )
}

function StatusSkeleton({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-wood-800/10 bg-white p-4">
      <div className="flex items-center gap-3">
        <span className="h-3 w-3 rounded-full bg-wood-800/20" aria-hidden="true" />
        <h3 className="font-heading text-lg font-semibold text-wood-900">{label}</h3>
      </div>
      <div className="mt-4 h-4 w-24 rounded bg-wood-800/10" />
      <div className="mt-3 h-4 w-full rounded bg-wood-800/10" />
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-wood-800/50">{label}</p>
      <p className="mt-1 font-heading text-xl font-semibold text-wood-900">{value}</p>
    </div>
  )
}

function isHealthPayload(value: Partial<HealthPayload>): value is HealthPayload {
  return (
    typeof value.ok === 'boolean' &&
    typeof value.db === 'boolean' &&
    typeof value.cms === 'boolean' &&
    typeof value.latency_ms === 'number'
  )
}

function statusSummary(body: HealthPayload) {
  if (body.ok) {
    return 'The application can reach both Supabase and Sanity. BetterStack should see this endpoint as healthy.'
  }

  if (!body.db && !body.cms) {
    return 'Both Supabase and Sanity are failing from the application runtime. Check deployment environment variables first, then provider status pages.'
  }

  if (!body.db) {
    return 'Supabase is failing from the application runtime. Check the Supabase project, database availability, and server-side environment variables.'
  }

  return 'Sanity is failing from the application runtime. Check the Sanity project, dataset, and public Sanity environment variables on this deployment.'
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  }).format(date)
}
