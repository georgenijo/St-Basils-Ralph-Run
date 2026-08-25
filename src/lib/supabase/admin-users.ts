import 'server-only'

import type {
  AuthError,
  PostgrestError,
  SupabaseClient,
  User as AuthUser,
} from '@supabase/supabase-js'

import { createAdminClient } from '@/lib/supabase/admin'

const AUTH_PAGE_SIZE = 1000

export interface AllAuthUsersResult {
  users: AuthUser[]
  error: AuthError | null
}

export interface AllProfileStatusesResult {
  profiles: { id: string; is_active: boolean }[]
  error: PostgrestError | null
}

/** Fetch every auth user without relying on GoTrue's single-request ceiling. */
export async function listAllAuthUsers(
  client: SupabaseClient = createAdminClient()
): Promise<AllAuthUsersResult> {
  const users: AuthUser[] = []

  for (let page = 1; ; page += 1) {
    const { data, error } = await client.auth.admin.listUsers({
      page,
      perPage: AUTH_PAGE_SIZE,
    })

    if (error) return { users, error }

    const batch = data?.users ?? []
    users.push(...batch)
    if (batch.length < AUTH_PAGE_SIZE) return { users, error: null }
  }
}

/** Fetch every profile status in bounded PostgREST requests. */
export async function listAllProfileStatuses(
  client: SupabaseClient
): Promise<AllProfileStatusesResult> {
  const profiles: { id: string; is_active: boolean }[] = []

  for (let from = 0; ; from += AUTH_PAGE_SIZE) {
    const { data, error } = await client
      .from('profiles')
      .select('id, is_active')
      .range(from, from + AUTH_PAGE_SIZE - 1)

    if (error) return { profiles, error }
    const batch = (data ?? []) as { id: string; is_active: boolean }[]
    profiles.push(...batch)
    if (batch.length < AUTH_PAGE_SIZE) return { profiles, error: null }
  }
}
