// Admin navigation benchmark: measures sidebar-click → destination heading AND
// data rendered, for every admin route, cold and warm, randomized order.
//
// Usage: node scripts/bench/bench-admin-nav.mjs <baseURL> <label> [iterations]
// Requires /tmp/sb-session.json from mint-session.mjs.
//
// "Cold": first visit to a route within a fresh browser context (empty HTTP
// cache, empty router cache). "Warm": revisit in the same page session.
// networkidle is deliberately never used.
import { readFileSync, writeFileSync } from 'fs'
import { chromium } from '@playwright/test'

const [baseURL, label, itersArg] = process.argv.slice(2)
if (!baseURL || !label) {
  console.error('usage: bench-admin-nav.mjs <baseURL> <label> [iterations]')
  process.exit(1)
}
const ITERATIONS = Number(itersArg || 12)

const { ref, session } = JSON.parse(readFileSync('/tmp/sb-session.json', 'utf8'))

// Rebuild the @supabase/ssr cookie format: "base64-" + base64url(JSON), chunked.
function sessionCookies(urlBase) {
  const raw = 'base64-' + Buffer.from(JSON.stringify(session)).toString('base64url')
  const CHUNK = 3180
  const u = new URL(urlBase)
  const base = {
    domain: u.hostname,
    path: '/',
    httpOnly: false,
    secure: u.protocol === 'https:',
    sameSite: 'Lax',
  }
  if (raw.length <= CHUNK) return [{ name: `sb-${ref}-auth-token`, value: raw, ...base }]
  const cookies = []
  for (let i = 0; i * CHUNK < raw.length; i++) {
    cookies.push({
      name: `sb-${ref}-auth-token.${i}`,
      value: raw.slice(i * CHUNK, (i + 1) * CHUNK),
      ...base,
    })
  }
  return cookies
}

const ROUTES = [
  { path: '/admin/dashboard', h1: 'Welcome', data: 'main :text("Signed in as")' },
  { path: '/admin/events', h1: 'Events', data: 'main table tbody tr' },
  { path: '/admin/announcements', h1: 'Announcements', data: 'main table tbody tr' },
  { path: '/admin/subscribers', h1: 'Subscribers', data: 'main table tbody tr' },
  { path: '/admin/users', h1: 'Users', data: 'main table tbody tr' },
  { path: '/admin/shares', h1: 'Shares', data: 'main table tbody tr' },
  { path: '/admin/payments', h1: 'Payments', data: 'main table tbody tr' },
  { path: '/admin/settings', h1: 'Theme Settings', data: 'main :text("Font Selection")' },
  { path: '/admin/health', h1: 'System Status', data: 'main :text("/api/health")' },
]

function shuffle(a) {
  const arr = [...a]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

async function measureClick(page, route) {
  const link = page
    .locator(`aside a[href="${route.path}"]:visible, nav a[href="${route.path}"]:visible`)
    .first()
  const t0 = Date.now()
  await link.click()
  await page.waitForSelector(`main h1:has-text("${route.h1}")`, {
    state: 'visible',
    timeout: 20000,
  })
  await page.waitForSelector(route.data, { state: 'visible', timeout: 20000 })
  const total = Date.now() - t0
  // Attribute the RSC fetch portion (server time incl. middleware) if present.
  const rsc = await page.evaluate(
    () =>
      performance
        .getEntriesByType('resource')
        .filter((e) => e.name.includes('_rsc'))
        .map((e) => e.duration)
        .at(-1) ?? null
  )
  return { total, rsc }
}

const samples = {} // path -> {cold: [], warm: [], rscCold: [], rscWarm: []}
for (const r of ROUTES) samples[r.path] = { cold: [], warm: [], rscCold: [], rscWarm: [] }

const browser = await chromium.launch()
for (let iter = 0; iter < ITERATIONS; iter++) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  await context.addCookies(sessionCookies(baseURL))
  const page = await context.newPage()

  const start = ROUTES[iter % ROUTES.length]
  await page.goto(baseURL + start.path, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector(`main h1:has-text("${start.h1}")`, { timeout: 20000 })
  await page.waitForSelector(start.data, { state: 'visible', timeout: 20000 })

  // Cold pass: first click-visit to each remaining route, random order.
  for (const route of shuffle(ROUTES.filter((r) => r !== start))) {
    const { total, rsc } = await measureClick(page, route)
    samples[route.path].cold.push(total)
    if (rsc != null) samples[route.path].rscCold.push(rsc)
  }
  // Warm pass: revisit every route, fresh random order.
  for (const route of shuffle(ROUTES)) {
    if (page.url().endsWith(route.path)) continue // can't click to self
    const { total, rsc } = await measureClick(page, route)
    samples[route.path].warm.push(total)
    if (rsc != null) samples[route.path].rscWarm.push(rsc)
  }
  await context.close()
  process.stderr.write(`iter ${iter + 1}/${ITERATIONS} done\n`)
}
await browser.close()

function stats(arr) {
  if (!arr.length) return null
  const s = [...arr].sort((a, b) => a - b)
  const q = (p) => s[Math.min(s.length - 1, Math.floor(p * s.length))]
  return { n: s.length, median: q(0.5), p95: q(0.95), min: s[0], max: s[s.length - 1] }
}

const report = { label, baseURL, iterations: ITERATIONS, routes: {} }
for (const r of ROUTES) {
  report.routes[r.path] = {
    cold: stats(samples[r.path].cold),
    warm: stats(samples[r.path].warm),
    rscCold: stats(samples[r.path].rscCold),
    rscWarm: stats(samples[r.path].rscWarm),
  }
}
writeFileSync(`/tmp/bench-${label}.json`, JSON.stringify(report, null, 2))

console.log(`\n=== ${label} (${baseURL}, ${ITERATIONS} iters) ===`)
console.log(
  'route                    cold med/p95/min/max        warm med/p95/min/max       rsc(med c/w)'
)
for (const r of ROUTES) {
  const c = report.routes[r.path].cold,
    w = report.routes[r.path].warm
  const rc = report.routes[r.path].rscCold,
    rw = report.routes[r.path].rscWarm
  const f = (x) => (x ? `${x.median}/${x.p95}/${x.min}/${x.max}` : '—')
  console.log(
    `${r.path.padEnd(24)} ${f(c).padEnd(27)} ${f(w).padEnd(26)} ${rc ? Math.round(rc.median) : '—'}/${rw ? Math.round(rw.median) : '—'}`
  )
}
