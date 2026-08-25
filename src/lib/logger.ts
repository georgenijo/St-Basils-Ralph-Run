export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export type LogContext = Record<string, unknown>

export interface LogRecord extends LogContext {
  timestamp: string
  level: LogLevel
  message: string
}

type ContextProvider = () => LogContext | undefined
type LogTransport = (record: LogRecord) => void

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
}

const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: '\u001b[90m',
  info: '\u001b[36m',
  warn: '\u001b[33m',
  error: '\u001b[31m',
}

const RESET_COLOR = '\u001b[0m'
const REDACTED = '[REDACTED]'
const OMITTED_BODY = '[REQUEST_BODY_OMITTED]'
const MAX_DEPTH = 8
const MAX_STRING_LENGTH = 20_000

const CONTEXT_PROVIDER = Symbol.for('st-basils.logger.context-provider')
const LOG_TRANSPORT = Symbol.for('st-basils.logger.transport')

type LoggerGlobals = typeof globalThis & {
  [CONTEXT_PROVIDER]?: ContextProvider
  [LOG_TRANSPORT]?: LogTransport
}

const SENSITIVE_KEY =
  /(?:^|[_-])(authorization|cookie|set-cookie|password|passwd|secret|token|api[_-]?key|service[_-]?role(?:[_-]?key)?)(?:$|[_-])/i
const BODY_KEY = /^(body|requestBody|emailBody|html|react)$/i
const JWT_VALUE = /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g
const SECRET_VALUE = /\b(?:sk|re|sb_secret)_[A-Za-z0-9_-]{12,}\b/g
const EMAIL_VALUE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi
const LABELED_SECRET =
  /\b(authorization|password|passwd|secret|token|api[_-]?key|service[_-]?role(?:[_-]?key)?)\s*[:=]\s*([^\s,;]+)/gi
const COOKIE_HEADER = /\bcookie\s*:\s*[^\r\n]*/gi

function getEnvironment(name: string): string | undefined {
  return typeof process === 'undefined' ? undefined : process.env[name]
}

function isBrowserRuntime(): boolean {
  return typeof window !== 'undefined'
}

function isProduction(): boolean {
  return getEnvironment('NODE_ENV') === 'production'
}

function configuredLevel(): LogLevel {
  const configured = getEnvironment('LOG_LEVEL')?.toLowerCase()
  if (configured && configured in LEVEL_PRIORITY) return configured as LogLevel
  return isProduction() ? 'info' : 'debug'
}

function redactString(value: string): string {
  const limited =
    value.length > MAX_STRING_LENGTH ? `${value.slice(0, MAX_STRING_LENGTH)}…[TRUNCATED]` : value

  return limited
    .replace(COOKIE_HEADER, `cookie: ${REDACTED}`)
    .replace(LABELED_SECRET, (_match, label: string) => `${label}: ${REDACTED}`)
    .replace(JWT_VALUE, REDACTED)
    .replace(SECRET_VALUE, REDACTED)
    .replace(EMAIL_VALUE, '[REDACTED_EMAIL]')
}

function serializeError(error: Error, seen: WeakSet<object>, depth: number): LogContext {
  const result: LogContext = {
    name: error.name,
    message: redactString(error.message),
  }

  if (error.stack) result.stack = redactString(error.stack)
  if ('code' in error && typeof error.code === 'string') result.code = redactString(error.code)
  if (error.cause !== undefined) result.cause = redactValue(error.cause, seen, depth + 1)

  return result
}

function redactValue(value: unknown, seen: WeakSet<object>, depth: number): unknown {
  if (value === null || value === undefined || typeof value === 'boolean') return value
  if (typeof value === 'number') return Number.isFinite(value) ? value : String(value)
  if (typeof value === 'bigint' || typeof value === 'symbol' || typeof value === 'function') {
    return String(value)
  }
  if (typeof value === 'string') return redactString(value)
  if (depth >= MAX_DEPTH) return '[MAX_DEPTH]'

  if (typeof FormData !== 'undefined' && value instanceof FormData) return OMITTED_BODY
  if (typeof Request !== 'undefined' && value instanceof Request) return '[REQUEST_OMITTED]'
  if (typeof Response !== 'undefined' && value instanceof Response) return '[RESPONSE_OMITTED]'
  if (value instanceof Error) return serializeError(value, seen, depth)
  if (value instanceof Date) return value.toISOString()

  if (typeof value === 'object') {
    if (seen.has(value)) return '[CIRCULAR]'
    seen.add(value)

    if (Array.isArray(value)) {
      return value.map((item) => redactValue(item, seen, depth + 1))
    }

    const output: LogContext = {}
    for (const [key, item] of Object.entries(value)) {
      if (SENSITIVE_KEY.test(key)) {
        output[key] = REDACTED
      } else if (BODY_KEY.test(key)) {
        output[key] = OMITTED_BODY
      } else {
        output[key] = redactValue(item, seen, depth + 1)
      }
    }
    return output
  }

  return redactString(String(value))
}

/**
 * Recursively strips credentials, cookies, request/email bodies, JWTs, service
 * keys, and email addresses before data reaches stdout or an external sink.
 */
export function redact<T>(value: T): T {
  return redactValue(value, new WeakSet<object>(), 0) as T
}

function currentContext(): LogContext {
  const provider = (globalThis as LoggerGlobals)[CONTEXT_PROVIDER]
  try {
    return provider?.() ?? {}
  } catch {
    return {}
  }
}

function writeToStdout(record: LogRecord): void {
  const output = console
  if (isProduction()) {
    const line = JSON.stringify(record)
    const method = record.level === 'debug' ? 'debug' : record.level
    output[method](line)
    return
  }

  const { timestamp, level, message, ...fields } = record
  const suffix = Object.keys(fields).length > 0 ? ` ${JSON.stringify(fields)}` : ''
  output[level](
    `${LEVEL_COLORS[level]}${timestamp} ${level.toUpperCase()}${RESET_COLOR} ${message}${suffix}`
  )
}

function emit(level: LogLevel, message: string, bound: LogContext, fields?: LogContext): void {
  if (isBrowserRuntime() || LEVEL_PRIORITY[level] < LEVEL_PRIORITY[configuredLevel()]) return

  const data = redact({ ...currentContext(), ...bound, ...(fields ?? {}) }) as LogContext
  const record: LogRecord = {
    ...data,
    timestamp: new Date().toISOString(),
    level,
    message: redactString(message),
  }

  writeToStdout(record)

  try {
    ;(globalThis as LoggerGlobals)[LOG_TRANSPORT]?.(record)
  } catch {
    // Logging must never make an application request fail.
  }
}

export interface Logger {
  child(context: LogContext): Logger
  debug(message: string, fields?: LogContext): void
  info(message: string, fields?: LogContext): void
  warn(message: string, fields?: LogContext): void
  error(message: string, fields?: LogContext): void
}

export function createLogger(bound: LogContext = {}): Logger {
  const safeBound = redact(bound) as LogContext
  return {
    child(context) {
      return createLogger({ ...safeBound, ...context })
    },
    debug(message, fields) {
      emit('debug', message, safeBound, fields)
    },
    info(message, fields) {
      emit('info', message, safeBound, fields)
    },
    warn(message, fields) {
      emit('warn', message, safeBound, fields)
    },
    error(message, fields) {
      emit('error', message, safeBound, fields)
    },
  }
}

export function registerLogContextProvider(provider: ContextProvider): void {
  ;(globalThis as LoggerGlobals)[CONTEXT_PROVIDER] = provider
}

export function registerLogTransport(transport: LogTransport | undefined): void {
  ;(globalThis as LoggerGlobals)[LOG_TRANSPORT] = transport
}

export const logger = createLogger()
