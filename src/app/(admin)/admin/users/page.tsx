import type { Metadata } from 'next'
import Link from 'next/link'

import { getRequestLogger } from '@/lib/logger.server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAuthWithProfile, getDataClient } from '@/lib/supabase/auth'
import { UsersPageClient } from './UsersPageClient'

export const metadata: Metadata = {
  title: 'Users',
}

export default async function UsersPage() {
  // Warm-pooled, RLS-enforced read client — see getDataClient() in lib/supabase/auth.
  const supabase = await getDataClient()

  // perPage: 1000 — single-page fetch is fine for a parish-sized user base.
  // If the church ever exceeds 1000 users, paginate with the page param.
  const [{ user }, profilesResult, authUsersResult, subscribersResult, familiesResult] =
    await Promise.all([
      getAuthWithProfile(),
      supabase
        .from('profiles')
        .select('id, email, full_name, role, is_active, family_id, created_at, updated_at')
        .order('created_at', { ascending: false }),
      createAdminClient().auth.admin.listUsers({ perPage: 1000 }),
      supabase
        .from('email_subscribers')
        .select('email')
        .eq('confirmed', true)
        .is('unsubscribed_at', null),
      supabase.from('families').select('id, family_name').order('family_name', { ascending: true }),
    ])

  const subscribedEmails = new Set(
    (subscribersResult.data ?? [])
      .map((s) => (s.email ?? '').toLowerCase())
      .filter((e) => e.length > 0)
  )

  const { data: profiles, error } = profilesResult

  if (error) {
    const log = await getRequestLogger('admin-users-page')
    log.error('users.fetch_failed', { error })
    return (
      <main className="admin-page">
        <h1>Users</h1>
        <p className="admin-error">Failed to load users. Please try refreshing the page.</p>
      </main>
    )
  }

  // Build a map of user ID → email_confirmed_at from auth.users.
  // If listUsers failed, the map stays empty and we fall back to showing
  // all users as "Pending" rather than breaking the page entirely.
  const confirmedMap = new Map<string, string | null>()
  if (authUsersResult.error) {
    const log = await getRequestLogger('admin-users-page')
    log.error('users.auth_fetch_failed', { error: authUsersResult.error })
  } else if (authUsersResult.data?.users) {
    for (const authUser of authUsersResult.data.users) {
      confirmedMap.set(authUser.id, authUser.email_confirmed_at ?? null)
    }
  }

  const all = (profiles ?? []).map((p) => ({
    ...p,
    email_confirmed_at: confirmedMap.get(p.id) ?? null,
  }))
  const adminCount = all.filter((p) => p.role === 'admin').length
  const memberCount = all.filter((p) => p.role === 'member' && p.is_active).length
  const deactivatedCount = all.filter((p) => !p.is_active).length
  const pendingCount = all.filter((p) => p.is_active && !p.email_confirmed_at).length

  return (
    <main className="admin-page">
      <div className="admin-page-head">
        <div>
          <h1>Users</h1>
          <p className="admin-page-subtitle">Manage admin accounts and church members.</p>
        </div>
        <Link href="/admin/users/invite" className="admin-button admin-button-primary">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Invite User
        </Link>
      </div>

      <div className="admin-stats">
        <SummaryStat label="Total" count={all.length} detail="all portal accounts" />
        <SummaryStat label="Admins" count={adminCount} detail="full access" />
        <SummaryStat label="Members" count={memberCount} detail="active members" />
        <SummaryStat label="Pending" count={pendingCount} detail="awaiting confirmation" />
        <SummaryStat label="Deactivated" count={deactivatedCount} detail="access disabled" />
      </div>

      <UsersPageClient
        users={all}
        currentUserId={user?.id ?? ''}
        subscribedEmails={subscribedEmails}
        families={familiesResult.data ?? []}
      />
    </main>
  )
}

// ─── Summary Card ─────────────────────────────────────────────────

function SummaryStat({ label, count, detail }: { label: string; count: number; detail: string }) {
  return (
    <div>
      <div className="admin-stat-label">{label}</div>
      <div className="admin-stat-value">{count}</div>
      <div className="admin-stat-detail">{detail}</div>
    </div>
  )
}
