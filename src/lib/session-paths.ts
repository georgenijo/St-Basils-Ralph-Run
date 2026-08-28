const SESSION_PATH_PREFIXES = [
  '/admin',
  '/member',
  '/login',
  '/forgot-password',
  '/set-password',
  '/rsvp',
  '/api',
]

export function requiresSessionRefresh(pathname: string): boolean {
  return SESSION_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
}
