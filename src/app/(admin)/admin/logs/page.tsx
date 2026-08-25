import type { Metadata } from 'next'
import Link from 'next/link'

import {
  getVercelLogViewerConfiguration,
  parseLogViewerFilters,
  queryVercelLogs,
  type AdminLogEntry,
  type LogViewerFilters,
} from '@/lib/vercel-logs.server'
import { logger } from '@/lib/logger'

const log = logger.child({ scope: 'admin-logs' })

export const metadata: Metadata = {
  title: 'Application Logs',
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface LogsPageProps {
  searchParams: Promise<{
    level?: string | string[]
    range?: string | string[]
    q?: string | string[]
    before?: string | string[]
  }>
}

function logsHref(filters: LogViewerFilters, before?: string): string {
  const parameters = new URLSearchParams()
  if (filters.level !== 'all') parameters.set('level', filters.level)
  if (filters.range !== '1h') parameters.set('range', filters.range)
  if (filters.search) parameters.set('q', filters.search)
  if (before) parameters.set('before', before)
  const query = parameters.toString()
  return query ? `/admin/logs?${query}` : '/admin/logs'
}

function formatTimestamp(timestamp: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(new Date(timestamp))
}

function Context({ entry }: { entry: AdminLogEntry }) {
  const primary = [entry.method, entry.route ?? entry.clientPath].filter(Boolean).join(' ')
  const secondary = entry.requestId ? `request ${entry.requestId}` : entry.scope

  if (!primary && !secondary) return <span className="admin-cell-secondary">—</span>

  return (
    <div className="admin-log-context">
      {primary && <span>{primary}</span>}
      {secondary && <code>{secondary}</code>}
    </div>
  )
}

function LogDetails({ entry }: { entry: AdminLogEntry }) {
  const detailEntries = Object.entries(entry.details)
  if (!entry.error && detailEntries.length === 0 && !entry.userId && !entry.action) return null

  return (
    <details className="admin-log-details">
      <summary>Details</summary>
      <dl>
        {entry.action && (
          <>
            <dt>Action</dt>
            <dd>{entry.action}</dd>
          </>
        )}
        {entry.userId && (
          <>
            <dt>User ID</dt>
            <dd>{entry.userId}</dd>
          </>
        )}
        {detailEntries.map(([key, value]) => (
          <div key={key} className="admin-log-detail-pair">
            <dt>{key}</dt>
            <dd>{String(value)}</dd>
          </div>
        ))}
      </dl>
      {entry.error && (
        <div className="admin-log-error-detail">
          <strong>
            {entry.error.name}
            {entry.error.code ? ` · ${entry.error.code}` : ''}
          </strong>
          <p>{entry.error.message}</p>
          {entry.error.stack && <pre>{entry.error.stack}</pre>}
        </div>
      )}
    </details>
  )
}

function ConfigurationState({ missing }: { missing: string[] }) {
  return (
    <section className="admin-log-setup" aria-labelledby="log-setup-title">
      <span className="admin-log-setup-kicker">Setup required</span>
      <h2 id="log-setup-title">Authorize the Vercel log reader</h2>
      <p>
        The logs already exist in Vercel. The admin console needs a server-only Vercel access token
        before it can read them on your behalf.
      </p>
      <ol>
        <li>Create an access token in the Vercel account that owns this project.</li>
        <li>Scope the token to the project&apos;s team and give it a descriptive name.</li>
        <li>Add the token and team ID below to Vercel Production and Preview.</li>
        <li>Redeploy once so the new server-only configuration is available.</li>
      </ol>
      <div className="admin-log-env" aria-label="Missing environment variables">
        {missing.map((name) => (
          <code key={name}>{name}</code>
        ))}
      </div>
      <a
        href="https://vercel.com/docs/rest-api#authentication"
        target="_blank"
        rel="noreferrer"
        className="admin-button admin-button-quiet"
      >
        Open Vercel token guide
      </a>
    </section>
  )
}

// Access is enforced by the (admin) layout guard (profiles.role === 'admin').
export default async function LogsPage({ searchParams }: LogsPageProps) {
  const filters = parseLogViewerFilters(await searchParams)
  const configuration = getVercelLogViewerConfiguration()

  let result: Awaited<ReturnType<typeof queryVercelLogs>> | undefined
  let queryFailed = false
  if (configuration.ready) {
    try {
      result = await queryVercelLogs(filters)
    } catch (error) {
      log.warn('admin_logs.query_failed', { error })
      queryFailed = true
    }
  }

  return (
    <main className="admin-page admin-logs-page">
      <div className="admin-page-head">
        <div>
          <h1>Application logs</h1>
          <p className="admin-page-subtitle">
            Search Vercel runtime requests and redacted application output. Times are shown in
            Eastern Time.
          </p>
        </div>
        {configuration.ready && (
          <Link href={logsHref(filters)} className="admin-button admin-button-quiet">
            Refresh
          </Link>
        )}
      </div>

      {!configuration.ready ? (
        <ConfigurationState missing={configuration.missing} />
      ) : (
        <>
          <form method="get" action="/admin/logs" className="admin-log-filters">
            <div className="admin-field admin-log-search-field">
              <label htmlFor="log-search">Search</label>
              <input
                id="log-search"
                name="q"
                type="search"
                defaultValue={filters.search}
                maxLength={120}
                placeholder="Message, route, scope, or request ID"
              />
            </div>
            <div className="admin-field">
              <label htmlFor="log-level">Level</label>
              <select id="log-level" name="level" defaultValue={filters.level}>
                <option value="all">All levels</option>
                <option value="info">Info</option>
                <option value="warn">Warning</option>
                <option value="error">Error</option>
              </select>
            </div>
            <div className="admin-field">
              <label htmlFor="log-range">Time range</label>
              <select id="log-range" name="range" defaultValue={filters.range}>
                <option value="1h">Last hour</option>
                <option value="6h">Last 6 hours</option>
                <option value="24h">Last 24 hours</option>
              </select>
            </div>
            <button type="submit" className="admin-button admin-button-primary">
              Apply filters
            </button>
            <Link href="/admin/logs" className="admin-button admin-button-bare">
              Clear
            </Link>
          </form>

          {queryFailed ? (
            <section className="admin-log-query-error" role="alert">
              <h2>Logs could not be loaded</h2>
              <p>
                Vercel did not accept the query. Verify the access token and team scope, then try
                again.
              </p>
              <Link href={logsHref(filters)} className="admin-button admin-button-quiet">
                Try again
              </Link>
            </section>
          ) : (
            <section className="admin-section" aria-labelledby="log-results-title">
              <div className="admin-section-head">
                <h2 id="log-results-title">Recent events</h2>
                <span className="admin-meta">
                  {result?.entries.length.toLocaleString() ?? 0} events ·{' '}
                  {result?.requestCount.toLocaleString() ?? 0} requests
                </span>
              </div>

              {result?.entries.length ? (
                <div className="admin-table-wrap">
                  <table className="admin-table admin-log-table">
                    <thead>
                      <tr>
                        <th scope="col">Time</th>
                        <th scope="col">Level</th>
                        <th scope="col">Event</th>
                        <th scope="col">Context</th>
                        <th scope="col">Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.entries.map((entry) => (
                        <tr key={entry.id}>
                          <td className="admin-cell-mono admin-log-time">
                            <time dateTime={entry.timestamp}>
                              {formatTimestamp(entry.timestamp)}
                            </time>
                          </td>
                          <td>
                            <span className={`admin-log-level admin-log-level-${entry.level}`}>
                              {entry.level}
                            </span>
                          </td>
                          <td className="admin-log-event-cell">
                            <span className="admin-cell-primary">{entry.message}</span>
                            <LogDetails entry={entry} />
                          </td>
                          <td>
                            <Context entry={entry} />
                          </td>
                          <td className="admin-cell-mono admin-log-duration">
                            {entry.durationMs === undefined
                              ? '—'
                              : `${entry.durationMs.toFixed(1)} ms`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="admin-empty">No logs matched these filters.</p>
              )}

              {result?.nextBefore && (
                <div className="admin-pagination">
                  <span>Showing up to 50 events per page</span>
                  <Link
                    href={logsHref(filters, result.nextBefore)}
                    className="admin-button admin-button-quiet"
                  >
                    Older events
                  </Link>
                </div>
              )}
            </section>
          )}
        </>
      )}
    </main>
  )
}
