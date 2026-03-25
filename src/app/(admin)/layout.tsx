import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { AdminSidebar } from '@/components/layout/AdminSidebar'
import { AdminTopBar } from '@/components/layout/AdminTopBar'

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const supabase = await createClient()

  // Auth check — redirect unauthenticated users to login
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Role check — only admins can access this layout
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

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
