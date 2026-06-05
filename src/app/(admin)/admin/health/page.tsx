import type { Metadata } from 'next'

import { HealthStatusCard } from '@/components/features/HealthStatusCard'

export const metadata: Metadata = {
  title: 'System Status',
}

// Access is enforced by the (admin) layout guard (profiles.role === 'admin').
export default function HealthPage() {
  const statusPageUrl = process.env.NEXT_PUBLIC_STATUS_PAGE_URL

  return (
    <main className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-semibold text-wood-900">System Status</h1>
        <p className="mt-2 text-sm text-wood-800/60">
          Live health of the website and its dependencies, read from{' '}
          <code className="rounded bg-sand px-1 py-0.5 text-xs">/api/health</code>.
        </p>
      </div>

      <HealthStatusCard statusPageUrl={statusPageUrl} />
    </main>
  )
}
