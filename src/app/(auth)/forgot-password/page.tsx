import Image from 'next/image'
import { redirect } from 'next/navigation'

import type { Metadata } from 'next'

import { ForgotPasswordForm } from '@/components/features/ForgotPasswordForm'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Reset Password',
  description: "Request a password reset for the St. Basil's church portal.",
}

export default async function ForgotPasswordPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) redirect('/')

  return (
    <main className="w-full max-w-md px-4 py-10">
      <div className="rounded-2xl bg-white p-8 shadow-md sm:p-10">
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <Image
            src="/logo.png"
            alt="St. Basil's Syriac Orthodox Church"
            width={220}
            height={42}
            priority
          />
          <h1 className="font-heading text-2xl font-semibold text-wood-900">Reset Your Password</h1>
        </div>

        <ForgotPasswordForm />
      </div>
    </main>
  )
}
