/**
 * Pure mapping from a `/api/health` fetch outcome to a view model for the admin
 * health card. No React — kept here so the rules are unit-tested independently of
 * the component (the test env is node, with no DOM/RTL).
 */

/** Status of one dependency (or the overall system) as rendered in the card. */
export type DependencyState = 'operational' | 'down' | 'unknown'

/** Shape of the JSON body returned by `/api/health`. */
export interface HealthApiResponse {
  ok: boolean
  db: boolean
  cms: boolean
  latency_ms: number
  db_latency_ms?: number
  cms_latency_ms?: number
}

/** Statuses that represent a real health response (not a server/edge error). */
const EXPECTED_HEALTH_STATUSES = new Set([200, 503])

/** A single row in the card: its state plus latency in ms (null when unknown). */
export interface HealthRow {
  state: DependencyState
  latencyMs: number | null
}

/** Everything the card needs to render. */
export interface HealthView {
  overall: DependencyState
  website: HealthRow
  database: HealthRow
  cms: HealthRow
  /** Total probe time reported by the endpoint, or null when unavailable. */
  totalLatencyMs: number | null
}

/**
 * Result of attempting to fetch `/api/health`:
 * - `response`: an HTTP response arrived and its JSON body parsed.
 * - `error`: network failure, abort/timeout, or a body that did not parse as JSON.
 */
export type FetchOutcome = { kind: 'response'; status: number; body: unknown } | { kind: 'error' }

/** Narrow an unknown JSON body to the expected health shape. */
export function isHealthBody(body: unknown): body is HealthApiResponse {
  if (typeof body !== 'object' || body === null) return false
  const b = body as Record<string, unknown>
  return (
    typeof b.ok === 'boolean' &&
    typeof b.db === 'boolean' &&
    typeof b.cms === 'boolean' &&
    typeof b.latency_ms === 'number'
  )
}

function num(value: unknown): number | null {
  return typeof value === 'number' ? value : null
}

const UNKNOWN_ROW: HealthRow = { state: 'unknown', latencyMs: null }

/** A view where nothing could be determined — the website itself is down. */
function unreachableView(): HealthView {
  return {
    overall: 'down',
    website: { state: 'down', latencyMs: null },
    database: { ...UNKNOWN_ROW },
    cms: { ...UNKNOWN_ROW },
    totalLatencyMs: null,
  }
}

/**
 * Map a fetch outcome to the card's view model.
 *
 * The website is "operational" only when the endpoint answered with an *expected*
 * health status (200 or 503) and a well-formed body. A 500, a 401, a redirect, or
 * an HTML/garbage body all mean the site is not serving health correctly — website
 * `down`, dependencies `unknown`.
 */
export function deriveHealthView(outcome: FetchOutcome): HealthView {
  if (outcome.kind === 'error') {
    return unreachableView()
  }

  if (!EXPECTED_HEALTH_STATUSES.has(outcome.status) || !isHealthBody(outcome.body)) {
    return unreachableView()
  }

  const body = outcome.body
  return {
    overall: body.ok ? 'operational' : 'down',
    website: { state: 'operational', latencyMs: null },
    database: { state: body.db ? 'operational' : 'down', latencyMs: num(body.db_latency_ms) },
    cms: { state: body.cms ? 'operational' : 'down', latencyMs: num(body.cms_latency_ms) },
    totalLatencyMs: num(body.latency_ms),
  }
}
