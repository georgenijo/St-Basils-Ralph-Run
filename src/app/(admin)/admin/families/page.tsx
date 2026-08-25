import type { Metadata } from 'next'

import { getRequestLogger } from '@/lib/logger.server'
import { getDataClient } from '@/lib/supabase/auth'
import type { AdminFamily, FamilyProfile } from '@/types/admin-family'
import { FamiliesPageClient } from './FamiliesPageClient'

export const metadata: Metadata = {
  title: 'Families',
}

export default async function FamiliesPage() {
  const supabase = await getDataClient()
  const [familiesResult, profilesResult] = await Promise.all([
    supabase
      .from('families')
      .select(
        'id, family_name, phone, address, membership_status, membership_type, membership_expires_at, head_of_household, created_at, updated_at'
      )
      .order('family_name', { ascending: true }),
    supabase
      .from('profiles')
      .select('id, email, full_name, role, is_active, family_id')
      .order('full_name', { ascending: true }),
  ])

  if (familiesResult.error || profilesResult.error) {
    const log = await getRequestLogger('admin-families-page')
    log.error('families.fetch_failed', {
      familiesError: familiesResult.error,
      profilesError: profilesResult.error,
    })
    return (
      <main className="admin-page">
        <h1>Families</h1>
        <p className="admin-error">Failed to load families. Please try refreshing the page.</p>
      </main>
    )
  }

  const profiles = (profilesResult.data ?? []) as FamilyProfile[]
  const memberCounts = new Map<string, number>()
  for (const profile of profiles) {
    if (profile.family_id) {
      memberCounts.set(profile.family_id, (memberCounts.get(profile.family_id) ?? 0) + 1)
    }
  }

  const families = (familiesResult.data ?? []).map((family) => ({
    ...family,
    member_count: memberCounts.get(family.id) ?? 0,
  })) as AdminFamily[]

  return (
    <main className="admin-page">
      <FamiliesPageClient families={families} profiles={profiles} />
    </main>
  )
}
