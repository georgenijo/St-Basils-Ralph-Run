import { z } from 'zod'

export const clientLogSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    message: z.string().trim().min(1).max(500),
    stack: z.string().max(4_000).optional(),
    digest: z.string().max(200).optional(),
    componentStack: z.string().max(4_000).optional(),
    path: z.string().max(500).optional(),
  })
  .strict()

const WINDOW_MS = 60_000
export const CLIENT_LOG_RATE_LIMIT = 10
const MAX_BUCKETS = 1_000

interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

export function consumeClientLogRateLimit(
  key: string,
  now = Date.now()
): { allowed: boolean; retryAfterSeconds: number } {
  let bucket = buckets.get(key)
  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + WINDOW_MS }
    buckets.set(key, bucket)
  }

  bucket.count += 1

  if (buckets.size > MAX_BUCKETS) {
    for (const [bucketKey, value] of buckets) {
      if (now >= value.resetAt) buckets.delete(bucketKey)
      if (buckets.size <= MAX_BUCKETS) break
    }
    while (buckets.size > MAX_BUCKETS) {
      const oldest = buckets.keys().next().value
      if (oldest === undefined) break
      buckets.delete(oldest)
    }
  }

  return {
    allowed: bucket.count <= CLIENT_LOG_RATE_LIMIT,
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1_000)),
  }
}

export function sanitizeClientPath(path: string | undefined): string | undefined {
  if (!path) return undefined
  try {
    return new URL(path, 'https://stbasilsboston.org').pathname.slice(0, 500)
  } catch {
    return undefined
  }
}

export function resetClientLogRateLimitsForTests(): void {
  if (process.env.NODE_ENV === 'test') buckets.clear()
}
