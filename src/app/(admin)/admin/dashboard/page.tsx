import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dashboard',
}

export default function DashboardPage() {
  return (
    <main className="px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="font-heading text-3xl font-semibold text-wood-900">Dashboard</h1>
      <p className="mt-2 text-sm text-wood-800/60">
        Welcome to the admin panel.
      </p>
    </main>
  )
}
