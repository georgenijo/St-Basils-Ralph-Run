import 'server-only'

import { redact, type LogLevel } from '@/lib/logger'

const AXIOM_QUERY_URL = 'https://api.axiom.co/v1/datasets/_apl?format=legacy'
const PAGE_SIZE = 50
const QUERY_TIMEOUT_MS = 8_000

export const LOG_VIEWER_LEVELS = ['all', 'debug', 'info', 'warn', 'error'] as const
export const LOG_VIEWER_RANGES = ['1h', '6h', '24h', '7d'] as const

export type LogViewerLevel = (typeof LOG_VIEWER_LEVELS)[number]
export type LogViewerRange = (typeof LOG_VIEWER_RANGES)[number]

export interface LogViewerFilters {
  level: LogViewerLevel
  range: LogViewerRange
  search: string
  before?: string
}

export interface AdminLogError {
  name: string
  message: string
  code?: string
  stack?: string
}

export interface AdminLogEntry {
  id: string
  timestamp: string
  level: LogLevel
  message: string
  scope?: string
  route?: string
  method?: string
  requestId?: string
  userId?: string
  action?: string
  durationMs?: number
  clientPath?: string
  error?: AdminLogError
  details: Record<string, string | number | boolean>
}

export interface AdminLogPage {
  entries: AdminLogEntry[]
  nextBefore?: string
  rowsMatched: number
  partial: boolean
}

export interface AxiomLogViewerConfiguration {
  ready: boolean
  missing: Array<'LOG_DRAIN' | 'AXIOM_DATASET' | 'AXIOM_TOKEN' | 'AXIOM_QUERY_TOKEN'>
}

interface AxiomMatch {
  _rowId?: unknown
  _time?: unknown
  data?: unknown
}

interface AxiomResponse {
  matches?: unknown
  status?: {
    isPartial?: unknown
    rowsMatched?: unknown
  }
}

const SAFE_DETAIL_KEYS = [
  'announcementId',
  'category',
  'date',
  'dependency',
  'digest',
  'eventId',
  'familyId',
  'flowType',
  'hasToken',
  'hasUserId',
  'latencyMs',
  'outcome',
  'paymentId',
  'status',
  'targetUserId',
] as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isOneOf<const Values extends readonly string[]>(
  value: string | undefined,
  values: Values
): value is Values[number] {
  return typeof value === 'string' && values.includes(value)
}

function limitedString(value: unknown, maximum: number): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  return trimmed.slice(0, maximum)
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function scalarDetail(value: unknown): string | number | boolean | undefined {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number' && Number.isFinite(value)) return value
  return limitedString(value, 300)
}

function validTimestamp(value: unknown): string | undefined {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) return undefined
  return new Date(value).toISOString()
}

function validTimeBoundary(value: unknown): string | undefined {
  if (
    typeof value !== 'string' ||
    value.length > 40 ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/.test(value) ||
    !Number.isFinite(Date.parse(value))
  ) {
    return undefined
  }
  return value
}

function safeError(value: unknown): AdminLogError | undefined {
  if (!isRecord(value)) return undefined
  const message = limitedString(value.message, 2_000)
  if (!message) return undefined

  return redact({
    name: limitedString(value.name, 100) ?? 'Error',
    message,
    ...(limitedString(value.code, 100) ? { code: limitedString(value.code, 100) } : {}),
    ...(limitedString(value.stack, 8_000) ? { stack: limitedString(value.stack, 8_000) } : {}),
  })
}

function safeLevel(value: unknown): LogLevel {
  if (value === 'debug' || value === 'info' || value === 'warn' || value === 'error') return value
  return 'info'
}

export function parseLogViewerFilters(input: {
  level?: string | string[]
  range?: string | string[]
  q?: string | string[]
  before?: string | string[]
}): LogViewerFilters {
  const rawLevel = Array.isArray(input.level) ? input.level[0] : input.level
  const rawRange = Array.isArray(input.range) ? input.range[0] : input.range
  const rawSearch = Array.isArray(input.q) ? input.q[0] : input.q
  const rawBefore = Array.isArray(input.before) ? input.before[0] : input.before

  const search = (rawSearch ?? '').trim().slice(0, 120)
  const before = validTimeBoundary(rawBefore)

  return {
    level: isOneOf(rawLevel, LOG_VIEWER_LEVELS) ? rawLevel : 'all',
    range: isOneOf(rawRange, LOG_VIEWER_RANGES) ? rawRange : '24h',
    search,
    ...(before ? { before } : {}),
  }
}

export function getAxiomLogViewerConfiguration(): AxiomLogViewerConfiguration {
  const missing: AxiomLogViewerConfiguration['missing'] = []
  if (process.env.LOG_DRAIN !== 'axiom') missing.push('LOG_DRAIN')
  if (!process.env.AXIOM_DATASET) missing.push('AXIOM_DATASET')
  if (!process.env.AXIOM_TOKEN) missing.push('AXIOM_TOKEN')
  if (!process.env.AXIOM_QUERY_TOKEN) missing.push('AXIOM_QUERY_TOKEN')
  return { ready: missing.length === 0, missing }
}

export function buildAxiomLogQuery(dataset: string, filters: LogViewerFilters): string {
  const source = `[${JSON.stringify(dataset)}]`
  const clauses = [
    'declare query_parameters (_viewer_search:string = "");',
    source,
    ...(filters.level === 'all' ? [] : [`| where level == ${JSON.stringify(filters.level)}`]),
    '| where isempty(_viewer_search) or message contains _viewer_search or requestId contains _viewer_search or route contains _viewer_search or scope contains _viewer_search or action contains _viewer_search or clientPath contains _viewer_search',
    '| sort by _time desc',
    '| project timestamp, level, message, scope, route, method, requestId, userId, action, durationMs, clientPath, error, clientError, announcementId, category, date, dependency, digest, eventId, familyId, flowType, hasToken, hasUserId, latencyMs, outcome, paymentId, status, targetUserId',
    `| limit ${PAGE_SIZE}`,
  ]

  return clauses.join('\n')
}

export function mapAxiomMatch(match: AxiomMatch): AdminLogEntry | undefined {
  if (!isRecord(match.data)) return undefined
  const data = match.data
  const timestamp = validTimestamp(data.timestamp) ?? validTimestamp(match._time)
  const message = limitedString(data.message, 1_000)
  if (!timestamp || !message) return undefined

  const details: AdminLogEntry['details'] = {}
  for (const key of SAFE_DETAIL_KEYS) {
    const value = scalarDetail(data[key])
    if (value !== undefined) details[key] = redact(value)
  }

  const entry: AdminLogEntry = {
    id: limitedString(match._rowId, 256) ?? `${timestamp}:${message}`,
    timestamp,
    level: safeLevel(data.level),
    message: redact(message),
    details,
  }

  const optionalStrings = {
    scope: limitedString(data.scope, 150),
    route: limitedString(data.route, 500),
    method: limitedString(data.method, 20),
    requestId: limitedString(data.requestId, 128),
    userId: limitedString(data.userId, 128),
    action: limitedString(data.action, 150),
    clientPath: limitedString(data.clientPath, 500),
  }

  for (const [key, value] of Object.entries(optionalStrings)) {
    if (value) Object.assign(entry, { [key]: redact(value) })
  }

  const durationMs = finiteNumber(data.durationMs)
  if (durationMs !== undefined) entry.durationMs = durationMs

  const error = safeError(data.error) ?? safeError(data.clientError)
  if (error) entry.error = error

  return entry
}

export async function queryAxiomLogs(filters: LogViewerFilters): Promise<AdminLogPage> {
  const configuration = getAxiomLogViewerConfiguration()
  if (!configuration.ready) throw new Error('Axiom log viewer is not configured')

  const dataset = process.env.AXIOM_DATASET as string
  const token = process.env.AXIOM_QUERY_TOKEN as string
  const response = await fetch(AXIOM_QUERY_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      apl: buildAxiomLogQuery(dataset, filters),
      startTime: `now-${filters.range}`,
      endTime: filters.before ?? 'now',
      variables: { _viewer_search: filters.search },
    }),
    cache: 'no-store',
    signal: AbortSignal.timeout(QUERY_TIMEOUT_MS),
  })

  if (!response.ok) throw new Error(`Axiom query failed with status ${response.status}`)

  const result = (await response.json()) as AxiomResponse
  const matches = Array.isArray(result.matches) ? (result.matches as AxiomMatch[]) : []
  const entries = matches.flatMap((match) => {
    const entry = mapAxiomMatch(match)
    return entry ? [entry] : []
  })
  const nextBefore =
    matches.length === PAGE_SIZE ? validTimeBoundary(matches.at(-1)?._time) : undefined

  return {
    entries,
    ...(nextBefore ? { nextBefore } : {}),
    rowsMatched: finiteNumber(result.status?.rowsMatched) ?? entries.length,
    partial: result.status?.isPartial === true,
  }
}
