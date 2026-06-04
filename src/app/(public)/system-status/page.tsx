import type { Metadata } from 'next'

import { SystemStatusDashboard } from '@/components/features/SystemStatusDashboard'
import { JsonLd, PageHero, SectionHeader } from '@/components/ui'
import { breadcrumbSchema } from '@/lib/structured-data'

export const metadata: Metadata = {
  title: 'System Status',
  description:
    "Live system health for St. Basil's website, including database and content service reachability.",
  robots: {
    index: false,
    follow: false,
  },
}

export default function SystemStatusPage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: 'System Status', path: '/system-status' }])} />
      <main>
        <PageHero title="System Status" backgroundImage="/images/about/church-exterior.jpg" />

        <section className="bg-sand py-16 md:py-22 lg:py-28">
          <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
            <SectionHeader
              title="Website Health"
              subtitle="A public-safe view of the same health endpoint used by uptime monitoring."
            />

            <div className="mt-12">
              <SystemStatusDashboard />
            </div>
          </div>
        </section>
      </main>
    </>
  )
}
