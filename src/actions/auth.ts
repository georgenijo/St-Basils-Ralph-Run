'use server'

import { redirect } from 'next/navigation'

import { withLogging } from '@/lib/logger.server'
import { createClient } from '@/lib/supabase/server'

async function logoutImpl() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/')
}

export const logout = withLogging('logout', logoutImpl)
