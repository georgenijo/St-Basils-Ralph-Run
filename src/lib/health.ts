import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'
import { getSanityClient, hasSanityConfig } from '@/lib/sanity/client'

const log = logger.child({ scope: 'health' })

/** Result of probing external dependencies for the /api/health endpoint. */
export interface DependencyHealth {
  /** True only when every dependency is reachable and production config is safe. */
  ok: boolean
  /** Production runtime configuration is safe for public traffic. */
  config: 'ok' | 'unsafe'
  /** Supabase Postgres reachable. */
  db: boolean
  /** Sanity CMS reachable. */
  cms: boolean
  /** Time in ms to probe Supabase (capped near PROBE_TIMEOUT_MS on a hang). */
  db_latency_ms: number
  /** Time in ms to probe Sanity (capped near PROBE_TIMEOUT_MS on a hang). */
  cms_latency_ms: number
}

/** Per-dependency probe budget. Keeps a single hung dependency from stalling the probe. */
const PROBE_TIMEOUT_MS = 2000

export interface RuntimeHealthConfig {
  VERCEL_ENV?: string
  TEST_SUPPORT_ENABLED?: string
  E2E_MODE?: string
  EMAIL_TRANSPORT?: string
  ALLOW_TURNSTILE_TEST_BYPASS?: string
  NEXT_PUBLIC_ALLOW_TURNSTILE_TEST_BYPASS?: string
  TURNSTILE_TEST_BYPASS_TOKEN?: string
  NEXT_PUBLIC_TURNSTILE_TEST_BYPASS_TOKEN?: string
}

const UNSAFE_PRODUCTION_FLAGS = [
  'TEST_SUPPORT_ENABLED',
  'E2E_MODE',
  'ALLOW_TURNSTILE_TEST_BYPASS',
  'NEXT_PUBLIC_ALLOW_TURNSTILE_TEST_BYPASS',
  'TURNSTILE_TEST_BYPASS_TOKEN',
  'NEXT_PUBLIC_TURNSTILE_TEST_BYPASS_TOKEN',
] as const

function currentRuntimeConfig(): RuntimeHealthConfig {
  return {
    VERCEL_ENV: process.env.VERCEL_ENV,
    TEST_SUPPORT_ENABLED: process.env.TEST_SUPPORT_ENABLED,
    E2E_MODE: process.env.E2E_MODE,
    EMAIL_TRANSPORT: process.env.EMAIL_TRANSPORT,
    ALLOW_TURNSTILE_TEST_BYPASS: process.env.ALLOW_TURNSTILE_TEST_BYPASS,
    NEXT_PUBLIC_ALLOW_TURNSTILE_TEST_BYPASS: process.env.NEXT_PUBLIC_ALLOW_TURNSTILE_TEST_BYPASS,
    TURNSTILE_TEST_BYPASS_TOKEN: process.env.TURNSTILE_TEST_BYPASS_TOKEN,
    NEXT_PUBLIC_TURNSTILE_TEST_BYPASS_TOKEN: process.env.NEXT_PUBLIC_TURNSTILE_TEST_BYPASS_TOKEN,
  }
}

function unsafeProductionConfigNames(config: RuntimeHealthConfig): string[] {
  if (config.VERCEL_ENV !== 'production') return []

  const unsafeNames: string[] = UNSAFE_PRODUCTION_FLAGS.filter((name) => config[name] !== undefined)
  if (config.EMAIL_TRANSPORT === 'mock') unsafeNames.push('EMAIL_TRANSPORT')
  return unsafeNames
}

/** Classify runtime flags without revealing which flag made production unsafe. */
export function checkRuntimeConfig(config: RuntimeHealthConfig): 'ok' | 'unsafe' {
  return unsafeProductionConfigNames(config).length > 0 ? 'unsafe' : 'ok'
}

/**
 * Resolve to `false` if `probe` rejects or does not settle within `ms`, otherwise
 * the probe's own boolean. This bounds the handler even if an underlying client
 * ignores its abort signal, so the result never depends on the installed client
 * version's timeout behavior.
 */
function withTimeout(
  probe: Promise<boolean>,
  ms: number,
  dependency: 'db' | 'cms'
): Promise<boolean> {
  const timeout = new Promise<boolean>((resolve) => {
    setTimeout(() => resolve(false), ms).unref?.()
  })
  return Promise.race([
    probe.catch((error) => {
      log.error('health.probe_failed', { error, dependency })
      return false
    }),
    timeout,
  ])
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
  } catch (error) {
    // Missing Supabase env throws synchronously from createAdminClient().
    log.error('health.probe_setup_failed', { error, dependency: 'db' })
    return Promise.resolve(false)
  }
  return withTimeout(probe, PROBE_TIMEOUT_MS, 'db')
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
  } catch (error) {
    log.error('health.probe_setup_failed', { error, dependency: 'cms' })
    return Promise.resolve(false)
  }
  return withTimeout(probe, PROBE_TIMEOUT_MS, 'cms')
}

/** Run a boolean probe and measure how long it took to settle. */
async function timed(probe: () => Promise<boolean>): Promise<{ ok: boolean; latency_ms: number }> {
  const start = Date.now()
  const ok = await probe()
  return { ok, latency_ms: Date.now() - start }
}

/**
 * Probe all external dependencies in parallel. Never throws — any failure or
 * timeout surfaces as `false` on the relevant flag. `ok` requires reachable
 * dependencies and production-safe configuration. Per-dependency latency is
 * measured for the in-app admin /admin/health card.
 */
export async function checkDependencies(
  runtimeConfig: RuntimeHealthConfig = currentRuntimeConfig()
): Promise<DependencyHealth> {
  const unsafeConfigNames = unsafeProductionConfigNames(runtimeConfig)
  const config = unsafeConfigNames.length > 0 ? 'unsafe' : 'ok'
  if (config === 'unsafe') {
    log.error('health.unsafe_production_config', { unsafeConfigNames })
  }

  const [db, cms] = await Promise.all([timed(checkDb), timed(checkCms)])
  return {
    ok: db.ok && cms.ok && config === 'ok',
    config,
    db: db.ok,
    cms: cms.ok,
    db_latency_ms: db.latency_ms,
    cms_latency_ms: cms.latency_ms,
  }
}
