import type { Metadata } from 'next'

import { HealthStatusCard } from '@/components/features/HealthStatusCard'

export const metadata: Metadata = {
  title: 'System Status',
}

// Access is enforced by the (admin) layout guard (profiles.role === 'admin').
export default function HealthPage() {
  const statusPageUrl = process.env.NEXT_PUBLIC_STATUS_PAGE_URL

  return (
    <main className="admin-page">
      <div className="admin-page-head">
        <div>
          <h1>System status</h1>
          <p className="admin-page-subtitle">
            Live health of the website and its dependencies, read from{' '}
            <code className="admin-meta">/api/health</code>.
          </p>
        </div>
      </div>

      <HealthStatusCard statusPageUrl={statusPageUrl} />
    </main>
  )
}
