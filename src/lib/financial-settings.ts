import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

export interface FinancialSettings {
  sharePrice: number
  membershipMonthlyDues: number
  membershipAnnualDues: number
}

export const DEFAULT_FINANCIAL_SETTINGS: FinancialSettings = {
  sharePrice: 50,
  membershipMonthlyDues: 100,
  membershipAnnualDues: 1200,
}

function positiveAmount(value: unknown, fallback: number): number {
  const amount = Number(value)
  return Number.isFinite(amount) && amount > 0 ? amount : fallback
}

/** Read the singleton financial configuration, with safe launch defaults. */
export async function getFinancialSettings(supabase: SupabaseClient): Promise<FinancialSettings> {
  const { data } = await supabase
    .from('site_settings')
    .select('share_price, membership_monthly_dues, membership_annual_dues')
    .limit(1)
    .maybeSingle()

  return {
    sharePrice: positiveAmount(data?.share_price, DEFAULT_FINANCIAL_SETTINGS.sharePrice),
    membershipMonthlyDues: positiveAmount(
      data?.membership_monthly_dues,
      DEFAULT_FINANCIAL_SETTINGS.membershipMonthlyDues
    ),
    membershipAnnualDues: positiveAmount(
      data?.membership_annual_dues,
      DEFAULT_FINANCIAL_SETTINGS.membershipAnnualDues
    ),
  }
}
