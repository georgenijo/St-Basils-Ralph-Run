const DEFAULT_SITE_URL = 'https://stbasilsboston.org'

function normalizeSiteUrl(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, '')
  if (!trimmed) return DEFAULT_SITE_URL

  return /^https?:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`
}

function isLocalhostSiteUrl(value: string): boolean {
  try {
    const url = new URL(normalizeSiteUrl(value))
    return url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '[::1]'
  } catch {
    return false
  }
}

export function getSiteUrl(requestOrigin?: string): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    if (process.env.VERCEL_URL && isLocalhostSiteUrl(process.env.NEXT_PUBLIC_SITE_URL)) {
      return normalizeSiteUrl(process.env.VERCEL_URL)
    }

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
