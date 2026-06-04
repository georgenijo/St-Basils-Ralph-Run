import { NextResponse } from 'next/server'

import { checkDependencies } from '@/lib/health'

// Live reachability probe — never statically prerendered or cached.
export const dynamic = 'force-dynamic'

/**
 * Public health endpoint for external uptime monitoring (BetterStack).
 *
 * Returns `{ ok, db, cms, latency_ms }`:
 * - 200 when every dependency is reachable, 503 otherwise.
 * - `Cache-Control: no-store` on every response so a real outage is never
 *   masked by a cached 200. Accuracy is worth more than saving probe load.
 * - No PII; dependency errors are swallowed into booleans.
 */
export async function GET() {
  const start = Date.now()
  const { ok, db, cms } = await checkDependencies()
  const latency_ms = Date.now() - start

  return NextResponse.json(
    { ok, db, cms, latency_ms },
    {
      status: ok ? 200 : 503,
      headers: { 'Cache-Control': 'no-store' },
    }
  )
}
