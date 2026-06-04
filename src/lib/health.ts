import { createAdminClient } from '@/lib/supabase/admin'
import { getSanityClient, hasSanityConfig } from '@/lib/sanity/client'

/** Result of probing external dependencies for the /api/health endpoint. */
export interface DependencyHealth {
  /** True only when every dependency is reachable. */
  ok: boolean
  /** Supabase Postgres reachable. */
  db: boolean
  /** Sanity CMS reachable. */
  cms: boolean
}

/** Per-dependency probe budget. Keeps a single hung dependency from stalling the probe. */
const PROBE_TIMEOUT_MS = 2000

/**
 * Resolve to `false` if `probe` rejects or does not settle within `ms`, otherwise
 * the probe's own boolean. This bounds the handler even if an underlying client
 * ignores its abort signal, so the result never depends on the installed client
 * version's timeout behavior.
 */
function withTimeout(probe: Promise<boolean>, ms: number): Promise<boolean> {
  const timeout = new Promise<boolean>((resolve) => {
    setTimeout(() => resolve(false), ms).unref?.()
  })
  return Promise.race([probe.catch(() => false), timeout])
}

/** `select 1`-equivalent reachability check against Supabase Postgres. */
function checkDb(): Promise<boolean> {
  let probe: Promise<boolean>
  try {
    const admin = createAdminClient()
    // Tiny reachability query (not a count). Service role bypasses RLS, so a
    // success/failure is unambiguous reachability rather than a permissions artifact.
    // Wrap in Promise.resolve — the query builder is only a PromiseLike thenable.
    probe = Promise.resolve(
      admin
        .from('families')
        .select('id')
        .limit(1)
        .abortSignal(AbortSignal.timeout(PROBE_TIMEOUT_MS))
    ).then((res: { error: unknown }) => !res?.error)
  } catch {
    // Missing Supabase env throws synchronously from createAdminClient().
    return Promise.resolve(false)
  }
  return withTimeout(probe, PROBE_TIMEOUT_MS)
}

/**
 * GROQ literal ping against Sanity. Touches no content/documents, returns no PII.
 *
 * Forces `useCdn: false` so the probe hits `api.sanity.io` (the Content Lake)
 * directly. The shared client uses the CDN, which can serve a cached success
 * even while the dataset backend is unreachable — useless for a health check.
 */
function checkCms(): Promise<boolean> {
  if (!hasSanityConfig) {
    return Promise.resolve(false)
  }
  let probe: Promise<boolean>
  try {
    probe = getSanityClient()
      .withConfig({ useCdn: false })
      .fetch('1', {}, { signal: AbortSignal.timeout(PROBE_TIMEOUT_MS) })
      .then(() => true)
  } catch {
    return Promise.resolve(false)
  }
  return withTimeout(probe, PROBE_TIMEOUT_MS)
}

/**
 * Probe all external dependencies in parallel. Never throws — any failure or
 * timeout surfaces as `false` on the relevant flag. `ok` is the conjunction.
 */
export async function checkDependencies(): Promise<DependencyHealth> {
  const [db, cms] = await Promise.all([checkDb(), checkCms()])
  return { ok: db && cms, db, cms }
}
