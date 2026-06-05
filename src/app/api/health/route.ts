import { NextResponse } from 'next/server'

import { checkDependencies } from '@/lib/health'

// Live reachability probe — never statically prerendered.
export const dynamic = 'force-dynamic'

/**
 * Public health endpoint for external uptime monitoring (BetterStack).
 *
 * Returns `{ ok, db, cms, latency_ms, db_latency_ms, cms_latency_ms }`:
 * - 200 when every dependency is reachable, 503 otherwise.
 * - `latency_ms` is the total probe time (BetterStack's signal); `db_latency_ms`
 *   and `cms_latency_ms` are per-dependency probe times feeding the in-app admin
 *   `/admin/health` card. Additive fields — the BetterStack contract is unchanged.
 * - Caching is asymmetric on purpose:
 *   - Healthy (200): `s-maxage=30` so the public endpoint serves a cached
 *     response for 30s (cuts Supabase/Sanity load from repeated/public hits;
 *     honors the issue's "cacheable for 30s"). No `stale-while-revalidate` —
 *     once the 30s lapses the CDN must revalidate before serving again, so a
 *     stale 200 can't survive past the outage transition. BetterStack probes
 *     every 180s, well past the TTL, so the monitor always sees a fresh check.
 *   - Failure (503): `no-store` so a real outage is never masked by a cached
 *     200 and recovery is never delayed by a cached 503.
 * - No PII; dependency errors are swallowed into booleans.
 */
export async function GET() {
  const start = Date.now()
  const { ok, db, cms, db_latency_ms, cms_latency_ms } = await checkDependencies()
  const latency_ms = Date.now() - start

  return NextResponse.json(
    { ok, db, cms, latency_ms, db_latency_ms, cms_latency_ms },
    {
      status: ok ? 200 : 503,
      headers: {
        'Cache-Control': ok ? 'public, max-age=0, s-maxage=30' : 'no-store',
      },
    }
  )
}
