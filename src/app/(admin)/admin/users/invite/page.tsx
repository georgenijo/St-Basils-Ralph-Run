import type { Metadata } from 'next'
import Link from 'next/link'

import { InviteUserForm } from '@/components/features/InviteUserForm'
import { getDataClient } from '@/lib/supabase/auth'

export const metadata: Metadata = {
  title: 'Invite User',
}

export default async function InviteUserPage() {
  const supabase = await getDataClient()
  const { data: families } = await supabase
    .from('families')
    .select('id, family_name')
    .order('family_name', { ascending: true })

  return (
    <main className="admin-page">
      <div className="mb-6">
        <Link href="/admin/users" className="admin-button admin-button-bare">
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
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
          Back to Users
        </Link>
        <h1 className="mt-2 font-heading text-3xl font-semibold text-wood-900">Invite User</h1>
      </div>

      <div className="max-w-2xl">
        <InviteUserForm families={families ?? []} />
      </div>
    </main>
  )
}
