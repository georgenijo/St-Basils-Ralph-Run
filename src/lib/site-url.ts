const DEFAULT_SITE_URL = 'https://stbasilsboston.org'

function normalizeSiteUrl(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, '')
  if (!trimmed) return DEFAULT_SITE_URL

  return /^https?:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`
}

export function getSiteUrl(requestOrigin?: string): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL)
  }

  if (process.env.VERCEL_URL) {
    return normalizeSiteUrl(process.env.VERCEL_URL)
  }

  if (requestOrigin) {
    return normalizeSiteUrl(requestOrigin)
  }

  return DEFAULT_SITE_URL
}
