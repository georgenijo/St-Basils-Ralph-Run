/** Build a query string from admin-table URL params, omitting empty values. */
export function buildAdminQueryString(
  params: Record<string, string | undefined>
): '' | `?${string}` {
  const searchParams = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value) searchParams.set(key, value)
  }
  const query = searchParams.toString()
  return query ? `?${query}` : ''
}
