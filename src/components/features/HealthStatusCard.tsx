'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui'
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
    <section className="admin-section">
      <p className="sr-only" role="status" aria-live="polite">
        {liveMessage}
      </p>

      <div className="admin-section-head">
        <h2>Services</h2>
        <span
          className={cn(
            'admin-status',
            overall === 'operational' && 'admin-status-ok',
            overall === 'down' && 'admin-status-warn'
          )}
        >
          {overallLabel}
        </span>
      </div>

      <ul className="admin-list">
        {ROWS.map(({ key, label }) => {
          const row = rowFor(key)
          return (
            <li key={key} className="admin-list-row">
              <div className="admin-list-grow">
                <div className="admin-list-title">{label}</div>
                <div className="admin-list-subtitle">Live dependency probe</div>
              </div>
              {row.latencyMs != null && <span className="admin-meta">{row.latencyMs} ms</span>}
              <span
                className={cn(
                  'admin-status',
                  row.state === 'operational' && 'admin-status-ok',
                  row.state === 'down' && 'admin-status-warn'
                )}
              >
                {view ? stateLabel[row.state] : 'Checking…'}
              </span>
            </li>
          )
        })}
      </ul>

      <div className="admin-toolbar mt-4">
        <span className="admin-meta">
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
              className="admin-button admin-button-bare"
            >
              Status history ↗
            </a>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => probe({ fresh: true })}
            disabled={isRefreshing}
            className="admin-button admin-button-quiet"
          >
            {isRefreshing ? 'Refreshing…' : 'Refresh'}
          </Button>
        </div>
      </div>
    </section>
  )
}
