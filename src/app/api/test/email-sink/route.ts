import { NextRequest, NextResponse } from 'next/server'

import { clearMockEmails, listMockEmails, storeMockEmail } from '@/lib/email-sink'
import { withRequestLogging } from '@/lib/logger.server'
import {
  isAuthorizedTestSupportRequest,
  isMockEmailTransportEnabled,
  isTestSupportEnabled,
} from '@/lib/test-support'

export const dynamic = 'force-dynamic'

function notFoundResponse() {
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}

function isAuthorized(request: NextRequest): boolean {
  return (
    isTestSupportEnabled() && isAuthorizedTestSupportRequest(request.headers.get('x-test-secret'))
  )
}

async function getImpl(request: NextRequest) {
  if (!isAuthorized(request) || !isMockEmailTransportEnabled()) {
    return notFoundResponse()
  }

  const to = request.nextUrl.searchParams.get('to') || undefined
  const subject = request.nextUrl.searchParams.get('subject') || undefined
  const template = request.nextUrl.searchParams.get('template') || undefined

  const emails = await listMockEmails({ to, subject, template })
  return NextResponse.json({ emails })
}

async function postImpl(request: NextRequest) {
  if (!isAuthorized(request) || !isMockEmailTransportEnabled()) {
    return notFoundResponse()
  }

  const payload = (await request.json()) as {
    from: string
    to: string | string[]
    subject: string
    html?: string
    text?: string
    metadata?: Record<string, string | null>
  }

  const record = await storeMockEmail({
    from: payload.from,
    to: Array.isArray(payload.to) ? payload.to : [payload.to],
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
    metadata: payload.metadata ?? {},
  })

  return NextResponse.json({ email: record }, { status: 201 })
}

async function deleteImpl(request: NextRequest) {
  if (!isAuthorized(request) || !isMockEmailTransportEnabled()) {
    return notFoundResponse()
  }

  await clearMockEmails()
  return NextResponse.json({ cleared: true })
}

export const GET = withRequestLogging('/api/test/email-sink', getImpl)
export const POST = withRequestLogging('/api/test/email-sink', postImpl)
export const DELETE = withRequestLogging('/api/test/email-sink', deleteImpl)
