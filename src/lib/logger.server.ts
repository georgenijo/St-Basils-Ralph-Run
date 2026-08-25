import 'server-only'

import { AsyncLocalStorage } from 'node:async_hooks'

import { headers } from 'next/headers'
import { after } from 'next/server'

import {
  logger,
  registerLogContextProvider,
  registerLogTransport,
  type LogContext,
  type LogRecord,
} from '@/lib/logger'

const REQUEST_CONTEXT = Symbol.for('st-basils.logger.async-context')

type ServerGlobals = typeof globalThis & {
  [REQUEST_CONTEXT]?: AsyncLocalStorage<LogContext>
}

const globals = globalThis as ServerGlobals
const requestContext = globals[REQUEST_CONTEXT] ?? new AsyncLocalStorage<LogContext>()
globals[REQUEST_CONTEXT] = requestContext

registerLogContextProvider(() => requestContext.getStore())

function environment(name: string): string | undefined {
  return process.env[name]
}

async function sendToAxiom(record: LogRecord): Promise<void> {
  const token = environment('AXIOM_TOKEN')
  const dataset = environment('AXIOM_DATASET')
  if (!token || !dataset || environment('LOG_DRAIN') !== 'axiom') return

  await fetch(`https://api.axiom.co/v1/datasets/${encodeURIComponent(dataset)}/ingest`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([record]),
  })
}

registerLogTransport((record) => {
  if (
    environment('LOG_DRAIN') !== 'axiom' ||
    !environment('AXIOM_TOKEN') ||
    !environment('AXIOM_DATASET')
  ) {
    return
  }

  try {
    after(() => sendToAxiom(record))
  } catch {
    // Instrumentation hooks can run outside a Next request context. The
    // fallback is deliberately unawaited so logging never adds hot-path time.
    void sendToAxiom(record).catch(() => undefined)
  }
})

export function runWithLogContext<T>(context: LogContext, callback: () => T): T {
  return requestContext.run(context, callback)
}

export function addLogContext(context: LogContext): void {
  const current = requestContext.getStore()
  if (current) Object.assign(current, context)
}

export async function getRequestLogger(scope: string) {
  const context = await actionRequestContext(scope)
  return logger.child({ ...context, scope })
}

function generatedRequestId(): string {
  return globalThis.crypto.randomUUID()
}

function normalizedRequestId(value: string | null): string {
  return value && /^[A-Za-z0-9._:-]{1,128}$/.test(value) ? value : generatedRequestId()
}

async function actionRequestContext(action: string): Promise<LogContext> {
  try {
    const requestHeaders = await headers()
    return {
      requestId: normalizedRequestId(requestHeaders.get('x-request-id')),
      route: requestHeaders.get('x-request-path') ?? `action:${action}`,
      method: requestHeaders.get('x-request-method') ?? 'POST',
      ...(requestHeaders.get('x-auth-user-id')
        ? { userId: requestHeaders.get('x-auth-user-id') }
        : {}),
    }
  } catch {
    return { requestId: generatedRequestId(), route: `action:${action}`, method: 'POST' }
  }
}

function requestContextFromRequest(request: Request, route: string): LogContext {
  return {
    requestId: normalizedRequestId(request.headers.get('x-request-id')),
    route: request.headers.get('x-request-path') ?? new URL(request.url).pathname ?? route,
    method: request.method,
    ...(request.headers.get('x-auth-user-id')
      ? { userId: request.headers.get('x-auth-user-id') }
      : {}),
  }
}

function isNextControlFlow(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  if ('digest' in error) {
    const digest = String(error.digest)
    if (
      digest.startsWith('NEXT_REDIRECT') ||
      digest.startsWith('NEXT_NOT_FOUND') ||
      digest.startsWith('DYNAMIC_SERVER_USAGE')
    ) {
      return true
    }
  }
  return error instanceof Error && error.message.startsWith('Dynamic server usage:')
}

function elapsedSince(startedAt: number): number {
  return Math.round((performance.now() - startedAt) * 100) / 100
}

export function withLogging<Args extends unknown[], Result>(
  name: string,
  action: (...args: Args) => Promise<Result>
): (...args: Args) => Promise<Result> {
  return async (...args: Args): Promise<Result> => {
    const context = await actionRequestContext(name)
    return runWithLogContext(context, async () => {
      const actionLogger = logger.child({ scope: 'server-action', action: name })
      const startedAt = performance.now()
      actionLogger.debug('action.invoked')

      try {
        const result = await action(...args)
        actionLogger.debug('action.completed', { durationMs: elapsedSince(startedAt) })
        return result
      } catch (error) {
        if (isNextControlFlow(error)) {
          actionLogger.debug('action.completed', {
            durationMs: elapsedSince(startedAt),
            outcome: 'navigation',
          })
        } else {
          actionLogger.error('action.failed', { error, durationMs: elapsedSince(startedAt) })
        }
        throw error
      }
    })
  }
}

export function withRequestLogging<
  RequestType extends Request,
  Args extends unknown[],
  Result extends Response,
>(
  route: string,
  handler: (request: RequestType, ...args: Args) => Promise<Result>
): (request: RequestType, ...args: Args) => Promise<Result> {
  return async (request: RequestType, ...args: Args): Promise<Result> => {
    const context = requestContextFromRequest(request, route)
    return runWithLogContext(context, async () => {
      const requestLogger = logger.child({ scope: 'route-handler' })
      const startedAt = performance.now()
      requestLogger.debug('request.started')

      try {
        const response = await handler(request, ...args)
        response.headers.set('x-request-id', String(context.requestId))
        requestLogger.debug('request.completed', {
          status: response.status,
          durationMs: elapsedSince(startedAt),
        })
        return response
      } catch (error) {
        requestLogger.error('request.failed', { error, durationMs: elapsedSince(startedAt) })
        throw error
      }
    })
  }
}
