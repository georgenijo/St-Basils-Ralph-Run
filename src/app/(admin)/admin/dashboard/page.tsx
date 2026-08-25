import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { getRequestLogger } from '@/lib/logger.server'
import { getAuthWithProfile, getDataClient } from '@/lib/supabase/auth'
import { listAllAuthUsers, listAllProfileStatuses } from '@/lib/supabase/admin-users'

export const metadata: Metadata = {
  title: 'Dashboard',
}

const adminSections = [
  {
    title: 'Events',
    description: 'Create and manage parish events, liturgical services, and community gatherings.',
    href: '/admin/events',
  },
  {
    title: 'Announcements',
    description: 'Publish announcements and updates for the congregation.',
    href: '/admin/announcements',
  },
  {
    title: 'Subscribers',
    description: 'View and manage newsletter subscribers and mailing lists.',
    href: '/admin/subscribers',
  },
  {
    title: 'Users',
    description: 'Manage admin accounts, roles, and user access.',
    href: '/admin/users',
  },
]

// ─── Page ───────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const [{ user, profile }, supabase] = await Promise.all([getAuthWithProfile(), getDataClient()])

  if (!user) {
    redirect('/login')
  }

  const now = new Date().toISOString()
  const [pendingPayments, upcomingEvents, activeSubscribers, profileStatuses, authUsers] =
    await Promise.all([
      supabase
        .from('payments')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending'),
      supabase
        .from('events')
        .select('id', { count: 'exact', head: true })
        .or(`is_recurring.eq.true,start_at.gte.${now}`),
      supabase
        .from('email_subscribers')
        .select('id', { count: 'exact', head: true })
        .eq('confirmed', true)
        .is('unsubscribed_at', null),
      listAllProfileStatuses(supabase),
      listAllAuthUsers(),
    ])

  const dataErrors = [
    pendingPayments.error,
    upcomingEvents.error,
    activeSubscribers.error,
    profileStatuses.error,
    authUsers.error,
  ].filter(Boolean)
  if (dataErrors.length > 0) {
    const log = await getRequestLogger('admin-dashboard')
    log.error('dashboard.counts_failed', { errors: dataErrors })
  }

  const activeProfileIds = new Set(
    profileStatuses.profiles.filter((item) => item.is_active).map((item) => item.id)
  )
  const pendingUserCount =
    authUsers.error || profileStatuses.error
      ? null
      : authUsers.users.filter(
          (authUser) => activeProfileIds.has(authUser.id) && !authUser.email_confirmed_at
        ).length
  const deactivatedUserCount = profileStatuses.error
    ? null
    : profileStatuses.profiles.filter((item) => !item.is_active).length

  const displayName = profile?.full_name || user.email

  return (
    <main className="admin-page">
      <div className="admin-page-head">
        <div>
          <h1>Welcome, {displayName}</h1>
          <p className="admin-page-subtitle">
            Signed in as {user.email} · {profile?.role === 'admin' ? 'Administrator' : 'Member'}
          </p>
        </div>
        <Link href="/admin/events/new" className="admin-button admin-button-primary">
          <PlusIcon />
          New event
        </Link>
      </div>

      <section className="admin-stats" aria-label="Current parish portal counts">
        <DashboardStat
          label="Pending payments"
          count={pendingPayments.error ? null : pendingPayments.count}
          detail="awaiting review"
          href="/admin/payments"
        />
        <DashboardStat
          label="Upcoming events"
          count={upcomingEvents.error ? null : upcomingEvents.count}
          detail="active/future event series"
          href="/admin/events"
        />
        <DashboardStat
          label="Pending users"
          count={pendingUserCount}
          detail="awaiting confirmation"
          href="/admin/users"
        />
        <DashboardStat
          label="Deactivated users"
          count={deactivatedUserCount}
          detail="access disabled"
          href="/admin/users"
        />
        <DashboardStat
          label="Subscribers"
          count={activeSubscribers.error ? null : activeSubscribers.count}
          detail="active newsletter readers"
          href="/admin/subscribers"
        />
      </section>

      <section className="admin-section" aria-label="Admin features">
        <div className="admin-section-head">
          <h2>Manage</h2>
          <span className="admin-meta">{adminSections.length} sections</span>
        </div>
        <ul className="admin-list">
          {adminSections.map((section) => (
            <li className="admin-list-row" key={section.title}>
              <div className="admin-list-grow">
                <div className="admin-list-title">{section.title}</div>
                <div className="admin-list-subtitle">{section.description}</div>
              </div>
              <Link href={section.href} className="admin-button admin-button-quiet">
                Open
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}

function DashboardStat({
  label,
  count,
  detail,
  href,
}: {
  label: string
  count: number | null
  detail: string
  href: string
}) {
  return (
    <Link href={href} className="text-inherit no-underline">
      <div className="admin-stat-label">{label}</div>
      <div className="admin-stat-value">{count ?? '—'}</div>
      <div className="admin-stat-detail">{detail}</div>
    </Link>
  )
}

function PlusIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}
