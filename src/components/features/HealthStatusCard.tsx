'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { Button, Card } from '@/components/ui'
import { cn } from '@/lib/utils'
import {
  deriveHealthView,
  type DependencyState,
  type FetchOutcome,
  type HealthRow,
} from '@/lib/health-status'

const POLL_INTERVAL_MS = 30_000
// Past the server's 2s + 2s parallel probe budget, so a hung browser fetch can't
// wedge the loop while still cutting off a genuinely stuck request.
const PROBE_TIMEOUT_MS = 8_000

export interface HealthStatusCardProps {
  /** External status page (BetterStack). Link is hidden when unset. */
  statusPageUrl?: string
}

const dotClass: Record<DependencyState, string> = {
  operational: 'bg-emerald-500',
  down: 'bg-red-500',
  unknown: 'bg-wood-800/30',
}

const statusTextClass: Record<DependencyState, string> = {
  operational: 'text-emerald-700',
  down: 'text-red-700',
  unknown: 'text-wood-800/50',
}

const stateLabel: Record<DependencyState, string> = {
  operational: 'Operational',
  down: 'Down',
  unknown: 'Unknown',
}

const ROWS = [
  { key: 'website', label: 'Website' },
  { key: 'database', label: 'Database' },
  { key: 'cms', label: 'Content (CMS)' },
] as const

export function HealthStatusCard({ statusPageUrl }: HealthStatusCardProps) {
  const [outcome, setOutcome] = useState<FetchOutcome | null>(null)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const inFlightRef = useRef(false)
  const controllerRef = useRef<AbortController | null>(null)
  const mountedRef = useRef(true)

  const probe = useCallback(async ({ fresh }: { fresh: boolean }) => {
    // Skip if a probe is already running so the 30s interval can't stack on a slow request.
    if (inFlightRef.current) return
    inFlightRef.current = true
    setIsRefreshing(true)

    const controller = new AbortController()
    controllerRef.current = controller
    const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS)

    let next: FetchOutcome
    try {
      // Auto-poll hits the bare (CDN-cacheable) endpoint; manual refresh busts the
      // 30s edge cache with a unique query for a true "check now".
      const url = fresh ? `/api/health?t=${Date.now()}` : '/api/health'
      const res = await fetch(url, { cache: 'no-store', signal: controller.signal })
      const body = await res.json()
      next = { kind: 'response', status: res.status, body }
    } catch {
      next = { kind: 'error' }
    } finally {
      clearTimeout(timeout)
      controllerRef.current = null
      inFlightRef.current = false
    }

    if (mountedRef.current) {
      setOutcome(next)
      setLastChecked(new Date())
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    probe({ fresh: false })
    const id = setInterval(() => probe({ fresh: false }), POLL_INTERVAL_MS)
    return () => {
      mountedRef.current = false
      clearInterval(id)
      controllerRef.current?.abort()
    }
  }, [probe])

  const view = outcome ? deriveHealthView(outcome) : null

  const overall: DependencyState = view?.overall ?? 'unknown'
  const overallLabel = !view
    ? 'Checking…'
    : overall === 'operational'
      ? 'All operational'
      : 'Service issue'

  // Bound only to `overall` so the polite live region re-announces solely when the
  // overall state flips — not on every 30s latency/timestamp change.
  const liveMessage = view
    ? overall === 'operational'
      ? 'System status: all operational'
      : 'System status: service issue'
    : ''

  const rowFor = (key: (typeof ROWS)[number]['key']): HealthRow =>
    view ? view[key] : { state: 'unknown', latencyMs: null }

  return (
    <Card variant="outlined" className="max-w-2xl">
      <p className="sr-only" role="status" aria-live="polite">
        {liveMessage}
      </p>

      <Card.Header className="flex items-center justify-between gap-4 pb-4">
        <h2 className="font-heading text-lg font-semibold text-wood-900">System Status</h2>
        <span className="inline-flex items-center gap-2 text-sm font-medium text-wood-900">
          <span className={cn('h-2.5 w-2.5 rounded-full', dotClass[overall])} aria-hidden="true" />
          {overallLabel}
        </span>
      </Card.Header>

      <div className="mx-6 h-px bg-wood-800/10" aria-hidden="true" />

      <Card.Body className="space-y-3">
        {ROWS.map(({ key, label }) => {
          const row = rowFor(key)
          return (
            <div key={key} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <span
                  className={cn('h-2 w-2 rounded-full', dotClass[row.state])}
                  aria-hidden="true"
                />
                <span className="text-sm font-medium text-wood-900">{label}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className={statusTextClass[row.state]}>
                  {view ? stateLabel[row.state] : 'Checking…'}
                </span>
                {row.latencyMs != null && (
                  <span className="tabular-nums text-wood-800/50">{row.latencyMs} ms</span>
                )}
              </div>
            </div>
          )
        })}
      </Card.Body>

      <div className="mx-6 h-px bg-wood-800/10" aria-hidden="true" />

      <Card.Footer className="flex flex-wrap items-center justify-between gap-3 pt-4">
        <span className="text-sm text-wood-800/60">
          {lastChecked
            ? `Last checked ${lastChecked.toLocaleTimeString()} · auto-refresh 30s`
            : 'Checking…'}
        </span>
        <div className="flex items-center gap-4">
          {statusPageUrl && (
            <a
              href={statusPageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-burgundy-700 transition-colors hover:text-burgundy-800"
            >
              Status history ↗
            </a>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => probe({ fresh: true })}
            disabled={isRefreshing}
          >
            {isRefreshing ? 'Refreshing…' : 'Refresh'}
          </Button>
        </div>
      </Card.Footer>
    </Card>
  )
}
