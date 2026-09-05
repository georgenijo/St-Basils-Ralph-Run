import 'server-only'

import { cache } from 'react'
import { createClient as createBareClient } from '@supabase/supabase-js'
import type { SupabaseClient, User } from '@supabase/supabase-js'

import { createClient } from '@/lib/supabase/server'

export interface AuthProfile {
  full_name: string | null
  role: string | null
}

export interface AuthWithProfile {
  user: User | null
  profile: AuthProfile | null
}

/**
 * Extract the `sub` claim from a JWT without verifying it. Used ONLY as a
 * query hint — see the security note in getAuthWithProfile().
 */
export function subFromJwt(token: string): string | null {
  try {
    const payload = token.split('.')[1]
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    return typeof decoded.sub === 'string' ? decoded.sub : null
  } catch {
    return null
  }
}

/**
 * PostgREST-only client authenticated with the request's access token via the
 * `accessToken` option. This bypasses the supabase-js auth mutex — a query on
 * the cookie-based client would otherwise wait for any in-flight getUser()
 * network call on that client, silently serializing "parallel" requests.
 * Auth methods must never be called on this client; use it for reads only.
 */
const tokenClientCache = new Map<string, SupabaseClient>()

function createTokenClient(accessToken: string): SupabaseClient {
  const cached = tokenClientCache.get(accessToken)
  if (cached) return cached

  const client = createBareClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { accessToken: async () => accessToken }
  )
  // Sessions rotate every hour, so entries go stale quickly; cap the map so a
  // burst of distinct tokens can't grow it unbounded.
  if (tokenClientCache.size >= 50) {
    const oldest = tokenClientCache.keys().next().value
    if (oldest !== undefined) tokenClientCache.delete(oldest)
  }
  tokenClientCache.set(accessToken, client)
  return client
}

/**
 * Request-scoped PostgREST client for admin page reads, backed by the cached
 * token client above so the HTTP connection pool stays warm across invocations
 * (a fresh cookie client pays connection setup on every request). Reads run
 * under the session JWT, so RLS enforces authorization exactly as before; the
 * middleware + admin layout `getUser()` checks remain the auth gate. Never call
 * auth methods on the returned client. Falls back to the cookie client when no
 * session cookie is present (middleware will have redirected already).
 */
export const getDataClient = cache(async (): Promise<SupabaseClient> => {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const token = session?.access_token
  return token ? createTokenClient(token) : (supabase as unknown as SupabaseClient)
})

/**
 * Validated auth user + their profile row, fetched in parallel and deduplicated
 * per request (React cache), so the admin layout and pages share one lookup.
 *
 * Why parallel is safe: `getUser()` remains the security gate — callers must
 * treat `user === null` as unauthenticated. The profile query is keyed by the
 * session JWT's unverified `sub` claim purely as a round-trip optimization;
 * that same JWT authenticates the query at Postgres, where RLS decides what it
 * may read. A forged/expired token fails both calls. The profile result is
 * discarded unless its id matches the *validated* user id.
 */
export const getAuthWithProfile = cache(async (): Promise<AuthWithProfile> => {
  const supabase = await createClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()
  const token = session?.access_token
  const uidHint = token ? subFromJwt(token) : null

  const [userRes, profileRes] = await Promise.all([
    supabase.auth.getUser(),
    token && uidHint
      ? createTokenClient(token)
          .from('profiles')
          .select('full_name, role')
          .eq('id', uidHint)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const user = userRes.data.user
  if (!user) {
    return { user: null, profile: null }
  }

  if (uidHint === user.id && profileRes.data) {
    return { user, profile: profileRes.data }
  }

  // Fallback (hint mismatch, stale token on the parallel read, or no profile
  // yet): refetch sequentially on the validated cookie client so a real admin
  // is never mis-classified by a transient parallel-read failure.
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .maybeSingle()

  return { user, profile }
})
