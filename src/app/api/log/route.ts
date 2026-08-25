import { NextResponse, type NextRequest } from 'next/server'

import { clientLogSchema, consumeClientLogRateLimit, sanitizeClientPath } from '@/lib/client-log'
import { logger } from '@/lib/logger'
import { withRequestLogging } from '@/lib/logger.server'

export const dynamic = 'force-dynamic'

const log = logger.child({ scope: 'client-errors' })
const MAX_BODY_BYTES = 12_000

function clientKey(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

async function postImpl(request: NextRequest) {
  const rate = consumeClientLogRateLimit(clientKey(request))
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'rate_limited' },
      {
        status: 429,
        headers: {
          'Cache-Control': 'no-store',
          'Retry-After': String(rate.retryAfterSeconds),
        },
      }
    )
  }

  const declaredLength = Number(request.headers.get('content-length') ?? 0)
  if (declaredLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'payload_too_large' }, { status: 413 })
  }

  let body: unknown
  try {
    const rawBody = await request.text()
    if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'payload_too_large' }, { status: 413 })
    }
    body = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const parsed = clientLogSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 })
  }

  log.error('client.error', {
    clientError: {
      name: parsed.data.name ?? 'Error',
      message: parsed.data.message,
      stack: parsed.data.stack,
      digest: parsed.data.digest,
      componentStack: parsed.data.componentStack,
    },
    clientPath: sanitizeClientPath(parsed.data.path),
  })

  return new NextResponse(null, {
    status: 202,
    headers: { 'Cache-Control': 'no-store' },
  })
}

export const POST = withRequestLogging('/api/log', postImpl)
