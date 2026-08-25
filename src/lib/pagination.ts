export const ADMIN_PAGE_SIZE = 25

export function parsePageParam(value: string | string[] | undefined): number {
  const candidate = Array.isArray(value) ? value[0] : value
  if (!candidate || !/^\d+$/.test(candidate)) return 1

  const parsed = Number(candidate)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1
}

export function paginationRange(page: number, pageSize = ADMIN_PAGE_SIZE) {
  const from = (page - 1) * pageSize
  return { from, to: from + pageSize - 1 }
}

export function totalPageCount(totalCount: number, pageSize = ADMIN_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(totalCount / pageSize))
}
