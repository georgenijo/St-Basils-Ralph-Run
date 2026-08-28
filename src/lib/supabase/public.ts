import 'server-only'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let publicClient: SupabaseClient | null = null

/**
 * Cookie-free Supabase client for data covered by public SELECT policies.
 *
 * Public pages must not use the SSR client: reading request cookies opts the
 * route into per-request rendering and prevents Next/Vercel from caching it.
 */
export function getPublicSupabaseClient(): SupabaseClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // CI intentionally builds without production credentials. Static generation
  // should fall back to empty public data rather than failing the entire build.
  if (!supabaseUrl || !supabaseAnonKey) return null

  if (!publicClient) {
    publicClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    })
  }

  return publicClient
}
