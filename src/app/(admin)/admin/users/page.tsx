import type { Metadata } from 'next'
import Link from 'next/link'
import type { SupabaseClient } from '@supabase/supabase-js'

import { getRequestLogger } from '@/lib/logger.server'
import { listAllAuthUsers } from '@/lib/supabase/admin-users'
import { getAuthWithProfile, getDataClient } from '@/lib/supabase/auth'
import { UsersPageClient } from './UsersPageClient'

export const metadata: Metadata = {
  title: 'Users',
}

const DATA_PAGE_SIZE = 500

async function fetchAllProfiles(supabase: SupabaseClient) {
  const rows: {
    id: string
    email: string | null
    full_name: string | null
    role: string
    is_active: boolean
    created_at: string
    updated_at: string
  }[] = []

  for (let from = 0; ; from += DATA_PAGE_SIZE) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, is_active, created_at, updated_at')
      .order('created_at', { ascending: false })
      .range(from, from + DATA_PAGE_SIZE - 1)

    if (error) return { data: null, error }
    rows.push(...(data ?? []))
    if ((data?.length ?? 0) < DATA_PAGE_SIZE) return { data: rows, error: null }
  }
}

async function fetchAllActiveSubscriberEmails(supabase: SupabaseClient) {
  const rows: { email: string | null }[] = []

  for (let from = 0; ; from += DATA_PAGE_SIZE) {
    const { data, error } = await supabase
      .from('email_subscribers')
      .select('email')
      .eq('confirmed', true)
      .is('unsubscribed_at', null)
      .range(from, from + DATA_PAGE_SIZE - 1)

    if (error) return { data: rows, error }
    rows.push(...(data ?? []))
    if ((data?.length ?? 0) < DATA_PAGE_SIZE) return { data: rows, error: null }
  }
}

export default async function UsersPage() {
  // Warm-pooled, RLS-enforced read client — see getDataClient() in lib/supabase/auth.
  const supabase = await getDataClient()

  const [{ user }, profilesResult, authUsersResult, subscribersResult] = await Promise.all([
    getAuthWithProfile(),
    fetchAllProfiles(supabase),
    listAllAuthUsers(),
    fetchAllActiveSubscriberEmails(supabase),
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
  } else {
    for (const authUser of authUsersResult.users) {
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
