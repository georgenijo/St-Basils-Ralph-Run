'use client'

import { useEffect, useState } from 'react'

import { UsersTable } from '@/components/features/UsersTable'
import { UserDetailPanel } from '@/components/features/UserDetailPanel'
import type { User } from '@/types/user'
import type { FamilyOption } from '@/types/admin-family'

interface UsersPageClientProps {
  users: User[]
  currentUserId: string
  subscribedEmails?: Set<string>
  families: FamilyOption[]
}

export function UsersPageClient({
  users,
  currentUserId,
  subscribedEmails,
  families,
}: UsersPageClientProps) {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)

  // Derive selected user from the fresh server data so it stays in sync after actions
  const selectedUser = selectedUserId ? (users.find((u) => u.id === selectedUserId) ?? null) : null

  // Clear selection if the user was removed from the list
  useEffect(() => {
    if (selectedUserId && !users.find((u) => u.id === selectedUserId)) {
      setSelectedUserId(null)
    }
  }, [users, selectedUserId])

  return (
    <>
      <UsersTable
        users={users}
        currentUserId={currentUserId}
        selectedUserId={selectedUserId}
        subscribedEmails={subscribedEmails}
        onRowClick={(user) => setSelectedUserId(user.id)}
      />
      <UserDetailPanel
        user={selectedUser}
        currentUserId={currentUserId}
        families={families}
        onClose={() => setSelectedUserId(null)}
      />
    </>
  )
}
