import type { Instrumentation } from 'next'

import { logger } from '@/lib/logger'

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Installs AsyncLocalStorage request context. Edge keeps the dependency-free stdout logger.
    await import('@/lib/logger.server')
  }
}

function headerValue(headers: NodeJS.Dict<string | string[]>, name: string): string | undefined {
  const value = headers[name]
  return Array.isArray(value) ? value[0] : value
}

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  logger.error('request.unhandled_error', {
    error,
    requestId: headerValue(request.headers, 'x-request-id'),
    route: request.path,
    method: request.method,
    routePath: context.routePath,
    routeType: context.routeType,
    routerKind: context.routerKind,
    renderSource: context.renderSource,
  })
}
