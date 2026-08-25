import { describe, expect, it, vi } from 'vitest'

import { DEFAULT_FINANCIAL_SETTINGS, getFinancialSettings } from '@/lib/financial-settings'

function clientReturning(data: unknown) {
  const maybeSingle = vi.fn().mockResolvedValue({ data, error: null })
  const limit = vi.fn(() => ({ maybeSingle }))
  const select = vi.fn(() => ({ limit }))
  const from = vi.fn(() => ({ select }))

  return { client: { from } as never, from, select }
}

describe('getFinancialSettings', () => {
  it('maps persisted numeric settings into application values', async () => {
    const { client, from, select } = clientReturning({
      share_price: '75.00',
      membership_monthly_dues: 125,
      membership_annual_dues: '1400',
    })

    await expect(getFinancialSettings(client)).resolves.toEqual({
      sharePrice: 75,
      membershipMonthlyDues: 125,
      membershipAnnualDues: 1400,
    })
    expect(from).toHaveBeenCalledWith('site_settings')
    expect(select).toHaveBeenCalledWith(
      'share_price, membership_monthly_dues, membership_annual_dues'
    )
  })

  it('uses safe defaults when settings are absent or invalid', async () => {
    const { client } = clientReturning({
      share_price: null,
      membership_monthly_dues: -1,
      membership_annual_dues: 'not-a-number',
    })

    await expect(getFinancialSettings(client)).resolves.toEqual(DEFAULT_FINANCIAL_SETTINGS)
  })
})
