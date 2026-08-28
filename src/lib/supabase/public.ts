import 'server-only'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let publicClient: SupabaseClient | null = null

/**
 * Cookie-free Supabase client for data covered by public SELECT policies.
 *
 * Public pages must not use the SSR client: reading request cookies opts the
 * route into per-request rendering and prevents Next/Vercel from caching it.
 */
export function getPublicSupabaseClient(): SupabaseClient {
  if (!publicClient) {
    publicClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          detectSessionInUrl: false,
          persistSession: false,
        },
      }
    )
  }

  return publicClient
}
