import 'server-only'

import { redact, type LogLevel } from '@/lib/logger'

// This is the project-level request-log endpoint used by Vercel CLI's
// `vercel logs` implementation. It returns historical runtime requests and
// their associated console output, unlike the deployment-only streaming API.
const VERCEL_LOGS_URL = 'https://vercel.com/api/logs/request-logs'
const REQUEST_PAGE_SIZE = 50
const QUERY_TIMEOUT_MS = 8_000

export const LOG_VIEWER_LEVELS = ['all', 'info', 'warn', 'error'] as const
export const LOG_VIEWER_RANGES = ['1h', '6h', '24h'] as const

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
  requestCount: number
}

export interface VercelLogViewerConfiguration {
  ready: boolean
  missing: Array<'VERCEL_ACCESS_TOKEN' | 'VERCEL_PROJECT_ID' | 'VERCEL_TEAM_ID'>
}

interface VercelConsoleLog {
  level?: unknown
  message?: unknown
  messageTruncated?: unknown
}

interface VercelRequestLog {
  requestId?: unknown
  timestamp?: unknown
  deploymentId?: unknown
  requestMethod?: unknown
  requestPath?: unknown
  statusCode?: unknown
  environment?: unknown
  branch?: unknown
  cache?: unknown
  cacheReason?: unknown
  traceId?: unknown
  domain?: unknown
  logs?: unknown
  events?: unknown
}

interface VercelLogsResponse {
  rows?: unknown
  hasMoreRows?: unknown
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
  const timestamp =
    typeof value === 'number' && Number.isFinite(value)
      ? value
      : typeof value === 'string'
        ? Date.parse(value)
        : Number.NaN
  if (!Number.isFinite(timestamp)) return undefined
  return new Date(timestamp).toISOString()
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

function safeRequestPath(value: unknown): string | undefined {
  const path = limitedString(value, 2_000)
  if (!path) return undefined
  try {
    return new URL(path, 'https://stbasilsboston.org').pathname.slice(0, 500)
  } catch {
    return path.split('?')[0].slice(0, 500) || undefined
  }
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
  if (value === 'warning') return 'warn'
  if (value === 'fatal') return 'error'
  return 'info'
}

function parseStructuredLog(message: string): Record<string, unknown> | undefined {
  try {
    const parsed = JSON.parse(message)
    return isRecord(parsed) ? parsed : undefined
  } catch {
    return undefined
  }
}

function consoleLogs(row: VercelRequestLog): VercelConsoleLog[] {
  return Array.isArray(row.logs)
    ? row.logs.filter((value): value is VercelConsoleLog => isRecord(value))
    : []
}

function firstEventSource(row: VercelRequestLog): string | undefined {
  if (!Array.isArray(row.events)) return undefined
  const first = row.events.find(isRecord)
  return limitedString(first?.source, 80)
}

function safeRequestContext(row: VercelRequestLog) {
  return {
    requestId: limitedString(row.requestId, 128),
    deploymentId: limitedString(row.deploymentId, 128),
    method: limitedString(row.requestMethod, 20),
    route: safeRequestPath(row.requestPath),
    status: finiteNumber(row.statusCode),
    environment: limitedString(row.environment, 30),
    branch: limitedString(row.branch, 150),
    cache: limitedString(row.cache, 50),
    cacheReason: limitedString(row.cacheReason, 150),
    traceId: limitedString(row.traceId, 128),
    domain: limitedString(row.domain, 253),
    source: firstEventSource(row),
  }
}

function mapVercelLogLine(
  row: VercelRequestLog,
  logLine: VercelConsoleLog,
  index: number
): AdminLogEntry | undefined {
  const rawMessage = limitedString(logLine.message, 20_000)
  if (!rawMessage) return undefined
  const structured = parseStructuredLog(rawMessage)
  const request = safeRequestContext(row)
  const timestamp = validTimestamp(structured?.timestamp) ?? validTimestamp(row.timestamp)
  if (!timestamp) return undefined

  const message = limitedString(structured?.message, 1_000) ?? rawMessage.slice(0, 1_000)
  const details: AdminLogEntry['details'] = {}
  if (structured) {
    for (const key of SAFE_DETAIL_KEYS) {
      const value = scalarDetail(structured[key])
      if (value !== undefined) details[key] = redact(value)
    }
  }

  const platformDetails = {
    status: request.status,
    environment: request.environment,
    branch: request.branch,
    cache: request.cache,
    source: request.source,
    deploymentId: request.deploymentId,
    traceId: request.traceId,
    messageTruncated: logLine.messageTruncated === true ? true : undefined,
  }
  for (const [key, value] of Object.entries(platformDetails)) {
    if (value !== undefined) details[key] = redact(value)
  }

  const entry: AdminLogEntry = {
    id: `${request.requestId ?? 'request'}:${index}:${timestamp}`,
    timestamp,
    level: safeLevel(structured?.level ?? logLine.level),
    message: redact(message),
    details,
  }

  const optionalStrings = {
    scope: limitedString(structured?.scope, 150),
    route: safeRequestPath(structured?.route) ?? request.route,
    method: limitedString(structured?.method, 20) ?? request.method,
    requestId: limitedString(structured?.requestId, 128) ?? request.requestId,
    userId: limitedString(structured?.userId, 128),
    action: limitedString(structured?.action, 150),
    clientPath: safeRequestPath(structured?.clientPath),
  }
  for (const [key, value] of Object.entries(optionalStrings)) {
    if (value) Object.assign(entry, { [key]: redact(value) })
  }

  const durationMs = finiteNumber(structured?.durationMs)
  if (durationMs !== undefined) entry.durationMs = durationMs
  const error = safeError(structured?.error) ?? safeError(structured?.clientError)
  if (error) entry.error = error

  return entry
}

function mapVercelRequest(row: VercelRequestLog): AdminLogEntry | undefined {
  const request = safeRequestContext(row)
  const timestamp = validTimestamp(row.timestamp)
  if (!timestamp) return undefined

  const details: AdminLogEntry['details'] = {}
  for (const [key, value] of Object.entries({
    status: request.status,
    environment: request.environment,
    branch: request.branch,
    cache: request.cache,
    source: request.source,
    deploymentId: request.deploymentId,
    traceId: request.traceId,
  })) {
    if (value !== undefined) details[key] = redact(value)
  }

  return {
    id: `${request.requestId ?? 'request'}:invocation:${timestamp}`,
    timestamp,
    level:
      request.status !== undefined && request.status >= 500
        ? 'error'
        : request.status !== undefined && request.status >= 400
          ? 'warn'
          : 'info',
    message: 'runtime.request',
    ...(request.route ? { route: redact(request.route) } : {}),
    ...(request.method ? { method: redact(request.method) } : {}),
    ...(request.requestId ? { requestId: redact(request.requestId) } : {}),
    details,
  }
}

export function mapVercelRequestLogs(rows: VercelRequestLog[]): AdminLogEntry[] {
  return rows.flatMap((row) => {
    const lines = consoleLogs(row)
    if (lines.length === 0) {
      const entry = mapVercelRequest(row)
      return entry ? [entry] : []
    }
    return lines.flatMap((line, index) => {
      const entry = mapVercelLogLine(row, line, index)
      return entry ? [entry] : []
    })
  })
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
    range: isOneOf(rawRange, LOG_VIEWER_RANGES) ? rawRange : '1h',
    search,
    ...(before ? { before } : {}),
  }
}

export function getVercelLogViewerConfiguration(): VercelLogViewerConfiguration {
  const missing: VercelLogViewerConfiguration['missing'] = []
  if (!process.env.VERCEL_ACCESS_TOKEN) missing.push('VERCEL_ACCESS_TOKEN')
  if (!process.env.VERCEL_PROJECT_ID) missing.push('VERCEL_PROJECT_ID')
  if (!process.env.VERCEL_TEAM_ID && !process.env.VERCEL_ORG_ID) missing.push('VERCEL_TEAM_ID')
  return { ready: missing.length === 0, missing }
}

function rangeStart(range: LogViewerRange): number {
  const duration =
    range === '1h' ? 60 * 60_000 : range === '6h' ? 6 * 60 * 60_000 : 24 * 60 * 60_000
  return Date.now() - duration
}

function vercelLevel(level: LogViewerLevel): string | undefined {
  if (level === 'warn') return 'warning'
  return level === 'all' ? undefined : level
}

export async function queryVercelLogs(filters: LogViewerFilters): Promise<AdminLogPage> {
  const configuration = getVercelLogViewerConfiguration()
  if (!configuration.ready) throw new Error('Vercel log viewer is not configured')

  const token = process.env.VERCEL_ACCESS_TOKEN as string
  const projectId = process.env.VERCEL_PROJECT_ID as string
  const teamId = (process.env.VERCEL_TEAM_ID ?? process.env.VERCEL_ORG_ID) as string
  const endDate = filters.before ? Date.parse(filters.before) : Date.now()
  const query = new URLSearchParams({
    projectId,
    ownerId: teamId,
    page: '0',
    startDate: String(rangeStart(filters.range)),
    endDate: String(endDate),
    environment: 'production',
    source: 'serverless,edge-function,edge-middleware',
  })
  const level = vercelLevel(filters.level)
  if (level) query.set('level', level)
  if (filters.search) query.set('search', filters.search)

  const response = await fetch(`${VERCEL_LOGS_URL}?${query}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
    signal: AbortSignal.timeout(QUERY_TIMEOUT_MS),
  })
  if (!response.ok) throw new Error(`Vercel log query failed with status ${response.status}`)

  const result = (await response.json()) as VercelLogsResponse
  const rows = Array.isArray(result.rows) ? (result.rows as VercelRequestLog[]) : []
  const entries = mapVercelRequestLogs(rows)
  const oldestTimestamp = validTimestamp(rows.at(-1)?.timestamp)

  return {
    entries,
    ...(result.hasMoreRows === true && rows.length === REQUEST_PAGE_SIZE && oldestTimestamp
      ? { nextBefore: oldestTimestamp }
      : {}),
    requestCount: rows.length,
  }
}
