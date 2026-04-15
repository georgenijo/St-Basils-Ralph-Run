'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { sendFamilyNotification } from '@/lib/notifications'
import { PaymentRejected } from '@/emails/payment-rejected'
import { PaymentConfirmed } from '@/emails/payment-confirmed'
import { EventChargeAssigned } from '@/emails/event-charge-assigned'
import { MembershipRenewed } from '@/emails/membership-renewed'
import {
  assignEventCostsSchema,
  recordPaymentSchema,
  confirmPaymentSchema,
  rejectPaymentSchema,
} from '@/lib/validators/member'

type ActionState = {
  success: boolean
  message: string
  errors?: Record<string, string[]>
}

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { user: null, error: 'Unauthorized' as const }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin')
    return { user: null, error: 'Forbidden: admin access required' as const }

  return { user, error: null }
}

export async function assignEventCosts(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  // 1. Parse charges JSON from formData
  const chargesRaw = formData.get('charges')
  let chargesParsed: unknown
  try {
    chargesParsed = typeof chargesRaw === 'string' ? JSON.parse(chargesRaw) : []
  } catch {
    return {
      success: false,
      message: 'Validation failed',
      errors: { charges: ['Invalid charges format'] },
    }
  }

  // 2. Validate with Zod
  const parsed = assignEventCostsSchema.safeParse({
    event_id: formData.get('event_id'),
    charges: chargesParsed,
  })

  if (!parsed.success) {
    return {
      success: false,
      message: 'Validation failed',
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  // 3. Auth check — admin only
  const supabase = await createClient()
  const { user, error: authError } = await requireAdmin(supabase)
  if (!user) return { success: false, message: authError }

  // 4. Insert event charges
  const rows = parsed.data.charges.map((charge) => ({
    event_id: parsed.data.event_id,
    family_id: charge.family_id,
    amount: charge.amount,
  }))

  const { error } = await supabase.from('event_charges').insert(rows)

  if (error) {
    if (error.code === '23505') {
      return {
        success: false,
        message: 'One or more families already have a charge for this event',
      }
    }
    console.error('[assignEventCosts] DB error:', error.message)
    return { success: false, message: 'Failed to assign event costs' }
  }

  // 5. Send notification emails — one per family
  const { data: eventRow } = await supabase
    .from('events')
    .select('title')
    .eq('id', parsed.data.event_id)
    .maybeSingle()

  const eventTitle = eventRow?.title ?? 'an event'

  for (const charge of parsed.data.charges) {
    await sendFamilyNotification(supabase, charge.family_id, 'events', {
      subject: `You've been charged ${usd.format(charge.amount)} for ${eventTitle}`,
      react: EventChargeAssigned({
        eventTitle,
        amount: usd.format(charge.amount),
      }),
    })
  }

  // 6. Revalidate and return
  revalidatePath('/admin')
  return { success: true, message: `Assigned costs to ${parsed.data.charges.length} families` }
}

export async function recordPaymentReceived(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  // 1. Validate with Zod
  const parsed = recordPaymentSchema.safeParse({
    family_id: formData.get('family_id'),
    type: formData.get('type'),
    amount: formData.get('amount'),
    method: formData.get('method'),
    note: formData.get('note') ?? '',
    related_event_id: formData.get('related_event_id') ?? '',
    related_share_id: formData.get('related_share_id') ?? '',
  })

  if (!parsed.success) {
    return {
      success: false,
      message: 'Validation failed',
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  // 2. Auth check — admin only
  const supabase = await createClient()
  const { user, error: authError } = await requireAdmin(supabase)
  if (!user) return { success: false, message: authError }

  // 3. Insert payment row
  const { error: paymentError } = await supabase.from('payments').insert({
    family_id: parsed.data.family_id,
    type: parsed.data.type,
    amount: parsed.data.amount,
    method: parsed.data.method,
    note: parsed.data.note || null,
    recorded_by: user.id,
    related_event_id: parsed.data.type === 'event' ? parsed.data.related_event_id : null,
    related_share_id: parsed.data.type === 'share' ? parsed.data.related_share_id : null,
  })

  if (paymentError) {
    console.error('[recordPaymentReceived] DB error:', paymentError.message)
    return { success: false, message: 'Failed to record payment' }
  }

  // 4. Apply side effects based on payment type
  const sideEffectWarning = await applyPaymentSideEffects(supabase, {
    type: parsed.data.type,
    family_id: parsed.data.family_id,
    related_event_id: parsed.data.type === 'event' ? (parsed.data.related_event_id ?? null) : null,
    related_share_id: parsed.data.type === 'share' ? (parsed.data.related_share_id ?? null) : null,
  })

  // 5. Send membership renewal email if applicable
  if (parsed.data.type === 'membership') {
    const { data: family } = await supabase
      .from('families')
      .select('family_name, membership_expires_at')
      .eq('id', parsed.data.family_id)
      .maybeSingle()

    if (family?.membership_expires_at) {
      await sendFamilyNotification(supabase, parsed.data.family_id, 'membership', {
        subject: `Membership extended through ${formatDate(family.membership_expires_at)}`,
        react: MembershipRenewed({
          familyName: family.family_name ?? "St. Basil's",
          newExpiryDate: formatDate(family.membership_expires_at),
        }),
      })
    }
  }

  // 6. Revalidate and return
  revalidatePath('/admin')
  return {
    success: true,
    message: `Payment recorded successfully${sideEffectWarning}`,
  }
}

// ─── Side-effect helper (shared by recordPaymentReceived + confirmPayment) ──

async function applyPaymentSideEffects(
  supabase: Awaited<ReturnType<typeof createClient>>,
  payment: {
    type: string
    family_id: string
    related_event_id: string | null
    related_share_id: string | null
  }
): Promise<string> {
  let warning = ''

  if (payment.type === 'event' && payment.related_event_id) {
    const { error } = await supabase
      .from('event_charges')
      .update({ paid: true })
      .eq('event_id', payment.related_event_id)
      .eq('family_id', payment.family_id)

    if (error) {
      console.error('[applyPaymentSideEffects] Failed to mark charge as paid:', error.message)
      warning = ' (but failed to mark event charge as paid — please check manually)'
    }
  }

  if (payment.type === 'share' && payment.related_share_id) {
    const { error } = await supabase
      .from('shares')
      .update({ paid: true })
      .eq('id', payment.related_share_id)

    if (error) {
      console.error('[applyPaymentSideEffects] Failed to mark share as paid:', error.message)
      warning = ' (but failed to mark share as paid — please check manually)'
    }
  }

  if (payment.type === 'membership') {
    const { data: family } = await supabase
      .from('families')
      .select('membership_type, membership_expires_at')
      .eq('id', payment.family_id)
      .single()

    if (family) {
      const today = new Date()
      const currentExpiry = family.membership_expires_at
        ? new Date(family.membership_expires_at)
        : today
      const baseDate = currentExpiry > today ? currentExpiry : today

      const newExpiry = new Date(baseDate)
      if (family.membership_type === 'monthly') {
        newExpiry.setMonth(newExpiry.getMonth() + 1)
      } else {
        newExpiry.setFullYear(newExpiry.getFullYear() + 1)
      }

      const { error } = await supabase
        .from('families')
        .update({
          membership_expires_at: newExpiry.toISOString().split('T')[0],
          membership_status: 'active',
        })
        .eq('id', payment.family_id)

      if (error) {
        console.error(
          '[applyPaymentSideEffects] Failed to update membership expiry:',
          error.message
        )
        warning = ' (but failed to update membership expiry — please check manually)'
      }
    } else {
      warning = ' (but could not find family record to update membership expiry)'
    }
  }

  return warning
}

// ─── Confirm Payment ──────────────────────────────────────────────────

const METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  check: 'Check',
  zelle: 'Zelle',
  venmo: 'Venmo',
  cashapp: 'Cash App',
  online: 'Online',
}

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

function formatDate(dateString: string): string {
  const [year, month, day] = dateString.split('-').map(Number)
  const d = new Date(Date.UTC(year, month - 1, day))
  return d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export async function confirmPayment(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = confirmPaymentSchema.safeParse({
    payment_id: formData.get('payment_id'),
  })

  if (!parsed.success) {
    return {
      success: false,
      message: 'Validation failed',
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const supabase = await createClient()
  const { user, error: authError } = await requireAdmin(supabase)
  if (!user) return { success: false, message: authError }

  // Fetch the pending payment
  const { data: payment, error: fetchError } = await supabase
    .from('payments')
    .select('id, family_id, type, amount, method, related_event_id, related_share_id, status')
    .eq('id', parsed.data.payment_id)
    .single()

  if (fetchError || !payment) {
    return { success: false, message: 'Payment not found' }
  }

  if (payment.status !== 'pending') {
    return { success: false, message: 'Payment is not in pending status' }
  }

  // Update status to confirmed
  const { error: updateError } = await supabase
    .from('payments')
    .update({
      status: 'confirmed',
      confirmed_by: user.id,
      confirmed_at: new Date().toISOString(),
    })
    .eq('id', payment.id)

  if (updateError) {
    console.error('[confirmPayment] DB error:', updateError.message)
    return { success: false, message: 'Failed to confirm payment' }
  }

  // Apply side effects
  const warning = await applyPaymentSideEffects(supabase, payment)

  // Notify family of confirmation
  await sendFamilyNotification(supabase, payment.family_id, 'payments', {
    subject: `Your ${usd.format(payment.amount)} payment was confirmed`,
    react: PaymentConfirmed({
      paymentType: payment.type,
      amount: usd.format(payment.amount),
      method: METHOD_LABELS[payment.method ?? ''] ?? payment.method ?? 'Unknown',
    }),
  })

  revalidatePath('/admin')
  return {
    success: true,
    message: `Payment confirmed${warning}`,
  }
}

// ─── Reject Payment ──────────────────────────────────────────────────

export async function rejectPayment(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = rejectPaymentSchema.safeParse({
    payment_id: formData.get('payment_id'),
    reason: formData.get('reason'),
  })

  if (!parsed.success) {
    return {
      success: false,
      message: 'Validation failed',
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const supabase = await createClient()
  const { user, error: authError } = await requireAdmin(supabase)
  if (!user) return { success: false, message: authError }

  // Fetch the pending payment
  const { data: payment, error: fetchError } = await supabase
    .from('payments')
    .select('id, family_id, type, amount, method, reference_memo, status')
    .eq('id', parsed.data.payment_id)
    .single()

  if (fetchError || !payment) {
    return { success: false, message: 'Payment not found' }
  }

  if (payment.status !== 'pending') {
    return { success: false, message: 'Payment is not in pending status' }
  }

  // Update status to rejected
  const { error: updateError } = await supabase
    .from('payments')
    .update({
      status: 'rejected',
      rejected_reason: parsed.data.reason,
    })
    .eq('id', payment.id)

  if (updateError) {
    console.error('[rejectPayment] DB error:', updateError.message)
    return { success: false, message: 'Failed to reject payment' }
  }

  // Send rejection email to family members (preference-gated)
  await sendFamilyNotification(supabase, payment.family_id, 'payments', {
    subject: 'Payment Not Confirmed',
    react: PaymentRejected({
      paymentType: payment.type,
      amount: usd.format(payment.amount),
      method: METHOD_LABELS[payment.method ?? ''] ?? payment.method ?? 'Unknown',
      referenceMemo: payment.reference_memo ?? '—',
      reason: parsed.data.reason,
    }),
  })

  revalidatePath('/admin')
  return { success: true, message: 'Payment rejected and member notified' }
}
