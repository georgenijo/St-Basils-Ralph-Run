import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { getAuthWithProfile } from '@/lib/supabase/auth'

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
  const { user, profile } = await getAuthWithProfile()

  if (!user) {
    redirect('/login')
  }

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
