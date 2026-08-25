import Link from 'next/link'
import { notFound } from 'next/navigation'

import { AdminSidebar } from '@/components/layout/AdminSidebar'

const events = [
  ['Sun 9:30', 'Divine Liturgy', 'Main church', 'Confirmed'],
  ['Wed 18:00', 'Vespers', 'Chapel', 'Confirmed'],
  ['Thu 19:00', 'Parish Council meeting', 'Community hall', 'Needs agenda'],
  ['Sat 10:00', 'Greek school — first day', 'Classrooms A–C', 'Confirmed'],
]

const activity = [
  ['Announcement published', 'Feast of the Dormition — schedule', '2h ago'],
  ['9 new subscribers', 'via website signup form', 'Today'],
  ['Donation received', '$250 · candles fund', 'Yesterday'],
  ['User invited', 'm.pappas@stbasilsboston.org · Editor', 'Aug 22'],
]

export default function AdminPreviewPage() {
  if (process.env.NODE_ENV !== 'development') notFound()

  return (
    <div className="admin-shell">
      <AdminSidebar activePath="/admin/dashboard" />
      <div className="admin-main">
        <header className="admin-topbar">
          <span className="admin-breadcrumb">
            Admin / <strong>Dashboard</strong>
          </span>
          <div className="admin-topbar-actions">
            <span className="admin-account">design-preview@stbasilsboston.org</span>
            <span className="admin-button admin-button-bare">Tailnet preview</span>
          </div>
        </header>

        <div className="admin-content">
          <main className="admin-page">
            <div className="admin-page-head">
              <div>
                <h1>Good afternoon</h1>
                <p className="admin-page-subtitle">
                  Monday, August 24 · sample data for design review
                </p>
              </div>
              <button type="button" className="admin-button admin-button-primary">
                <PlusIcon />
                New event
              </button>
            </div>

            <div className="admin-stats">
              <Stat label="Upcoming events" value="6" detail="next: Divine Liturgy, Sun 9:30" />
              <Stat label="Subscribers" value="412" detail="+9 this month" />
              <Stat label="Announcements live" value="3" detail="1 draft pending" />
              <Stat label="Donations · August" value="$4,180" detail="23 transactions" />
            </div>

            <div className="admin-grid-two">
              <section className="admin-section">
                <div className="admin-section-head">
                  <h2>This week</h2>
                  <Link href="/admin-preview" className="admin-button admin-button-quiet">
                    All events
                  </Link>
                </div>
                <ul className="admin-list">
                  {events.map(([time, title, location, status]) => (
                    <li className="admin-list-row" key={title}>
                      <time className="admin-list-time">{time}</time>
                      <div className="admin-list-grow">
                        <div className="admin-list-title">{title}</div>
                        <div className="admin-list-subtitle">{location}</div>
                      </div>
                      <span
                        className={`admin-status ${status === 'Confirmed' ? 'admin-status-ok' : 'admin-status-warn'}`}
                      >
                        {status}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="admin-section">
                <div className="admin-section-head">
                  <h2>Recent activity</h2>
                </div>
                <ul className="admin-list">
                  {activity.map(([title, detail, time]) => (
                    <li className="admin-list-row" key={title}>
                      <div className="admin-list-grow">
                        <div className="admin-list-title">{title}</div>
                        <div className="admin-list-subtitle">{detail}</div>
                      </div>
                      <time className="admin-list-time">{time}</time>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div>
      <div className="admin-stat-label">{label}</div>
      <div className="admin-stat-value">{value}</div>
      <div className="admin-stat-detail">{detail}</div>
    </div>
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
