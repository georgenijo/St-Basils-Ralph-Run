import { redirect } from 'next/navigation'

import { getAuthWithProfile } from '@/lib/supabase/auth'
import { AdminSidebar } from '@/components/layout/AdminSidebar'
import { AdminTopBar } from '@/components/layout/AdminTopBar'

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Auth + role lookup run in parallel and are shared with pages in the same
  // request via React cache — see getAuthWithProfile().
  const { user, profile } = await getAuthWithProfile()

  // Auth check — redirect unauthenticated users to login
  if (!user) {
    redirect('/login')
  }

  // Role check — only admins can access this layout
  if (!profile || profile.role !== 'admin') {
    redirect('/')
  }

  return (
    <div className="flex min-h-screen bg-cream-50">
      <AdminSidebar />
      <div className="flex flex-1 flex-col">
        <AdminTopBar email={user.email ?? ''} />
        <div className="flex-1">{children}</div>
      </div>
    </div>
  )
}
