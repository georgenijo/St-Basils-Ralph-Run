// Production public-navigation benchmark.
//
// Uses real Playwright clicks on the visible desktop navbar and measures:
//   click event -> pathname change
//   click event -> destination main content mutation
//   click event -> above-the-fold finite animations complete
//   full document reload -> browser load event
//
// A fresh browser context is used for every iteration. The first iteration also
// records a Playwright trace and video so the measurements can be inspected.
//
// Usage:
//   node scripts/bench/bench-public-nav.mjs [baseURL] [iterations]
//   npm run bench:public-nav -- https://stbasilsboston.org 3

// Generated evidence is written below archive/bench-results/public-nav-benchmark/.
// This intentionally lives outside Playwright's outputDir because
// `playwright test` clears that directory before a test run.
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { chromium } from '@playwright/test'

const baseURL = (process.argv[2] || 'https://stbasilsboston.org').replace(/\/$/, '')
const iterations = Number(process.argv[3] || 3)
const timeoutMs = 30_000

if (!Number.isInteger(iterations) || iterations < 1) {
  console.error('iterations must be a positive integer')
  process.exit(1)
}

const routes = [
  { path: '/', label: 'Home' },
  { path: '/about', label: 'Our History', menu: 'About' },
  { path: '/spiritual-leaders', label: 'Our Spiritual Fathers', menu: 'About' },
  { path: '/our-clergy', label: 'Our Clergy', menu: 'About' },
  { path: '/office-bearers', label: 'Our Office Bearers', menu: 'About' },
  { path: '/acolytes-choir', label: 'Our Acolytes & Choir', menu: 'About' },
  { path: '/our-organizations', label: 'Our Organizations', menu: 'About' },
  { path: '/events', label: 'Events Calendar', menu: 'Resources' },
  { path: '/useful-links', label: 'Useful Links', menu: 'Resources' },
  { path: '/first-time', label: 'First Time Visiting?', menu: 'Resources' },
  { path: '/giving', label: 'Giving' },
  { path: '/contact', label: 'Contact Us' },
]

const runId = new Date().toISOString().replace(/[:.]/g, '-')
const outputDir = resolve(process.cwd(), 'archive/bench-results/public-nav-benchmark', runId)
mkdirSync(outputDir, { recursive: true })

function percentile(values, percentileValue) {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.max(0, Math.ceil(percentileValue * sorted.length) - 1)
  return sorted[index]
}

function stats(values) {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  return {
    n: sorted.length,
    median: percentile(sorted, 0.5),
    p95: percentile(sorted, 0.95),
    min: sorted[0],
    max: sorted.at(-1),
  }
}

async function openDesktopMenu(page, menu) {
  if (!menu) return
  const button = page
    .locator('nav[aria-label="Main navigation"] button:visible')
    .filter({ hasText: menu })
    .first()
  await button.click()
  await page
    .locator(`nav[aria-label="Main navigation"] a[href]:visible`)
    .first()
    .waitFor({ state: 'visible' })
}

async function installNavigationClock(page, route) {
  await page.evaluate(
    ({ targetPath, targetHeading, deadlineMs }) => {
      const main = document.querySelector('main')
      if (!main) throw new Error('Cannot benchmark without <main>')

      const oldMainText = main.innerText
      const observationStartedAt = performance.now()
      let clickAt = null
      let pathChangedAt = null
      let firstMainMutationAt = null
      let contentChangedAt = null
      let visualSettledAt = null

      const destinationLinkWasClicked = (event) => {
        const link = event.target instanceof Element ? event.target.closest('a[href]') : null
        if (!link) return
        if (new URL(link.href).pathname !== targetPath) return
        clickAt = performance.now()
      }

      document.addEventListener('click', destinationLinkWasClicked, true)

      const mutationObserver = new MutationObserver(() => {
        if (clickAt !== null && firstMainMutationAt === null) {
          firstMainMutationAt = performance.now()
        }
      })
      mutationObserver.observe(main, { subtree: true, childList: true, characterData: true })

      window.__publicNavBenchmarkPromise = new Promise((resolvePromise, rejectPromise) => {
        const finish = () => {
          document.removeEventListener('click', destinationLinkWasClicked, true)
          mutationObserver.disconnect()

          const matchingRscEntries = performance.getEntriesByType('resource').filter((entry) => {
            try {
              const url = new URL(entry.name)
              return url.pathname === targetPath && url.searchParams.has('_rsc')
            } catch {
              return false
            }
          })
          const rsc = matchingRscEntries.at(-1)

          resolvePromise({
            path: targetPath,
            heading: document.querySelector('main h1')?.textContent?.trim() ?? null,
            pathChangeMs: Math.round(pathChangedAt - clickAt),
            firstMainMutationMs:
              firstMainMutationAt === null ? null : Math.round(firstMainMutationAt - clickAt),
            contentChangeMs: Math.round(contentChangedAt - clickAt),
            visualSettledMs: Math.round(visualSettledAt - clickAt),
            rsc: rsc
              ? {
                  startedRelativeToClickMs: Math.round(rsc.startTime - clickAt),
                  ttfbMs: Math.round(rsc.responseStart - rsc.startTime),
                  durationMs: Math.round(rsc.duration),
                  completedRelativeToClickMs: Math.round(rsc.responseEnd - clickAt),
                  encodedBytes: rsc.encodedBodySize,
                  transferBytes: rsc.transferSize,
                }
              : null,
          })
        }

        const tick = () => {
          const now = performance.now()
          if (clickAt !== null && location.pathname === targetPath && pathChangedAt === null) {
            pathChangedAt = now
          }

          const currentMain = document.querySelector('main')
          const headingMatches =
            document.querySelector('main h1')?.textContent?.trim() === targetHeading
          if (
            clickAt !== null &&
            pathChangedAt !== null &&
            currentMain?.innerText !== oldMainText &&
            headingMatches &&
            contentChangedAt === null
          ) {
            contentChangedAt = now
          }

          if (contentChangedAt !== null && currentMain) {
            const activeAboveFoldAnimations = currentMain
              .getAnimations({ subtree: true })
              .filter((animation) => {
                if (animation.playState === 'finished' || animation.playState === 'idle')
                  return false
                const timing = animation.effect?.getComputedTiming()
                if (!timing || !Number.isFinite(timing.endTime) || timing.endTime === 0)
                  return false
                const target = animation.effect?.target
                if (!(target instanceof Element)) return false
                const rect = target.getBoundingClientRect()
                return rect.bottom > 0 && rect.top < innerHeight
              })

            if (activeAboveFoldAnimations.length === 0) {
              visualSettledAt = now
              finish()
              return
            }
          }

          if (clickAt !== null && now - clickAt > deadlineMs) {
            document.removeEventListener('click', destinationLinkWasClicked, true)
            mutationObserver.disconnect()
            rejectPromise(
              new Error(
                `Navigation clock timed out for ${targetPath}; current path is ${location.pathname}`
              )
            )
            return
          }

          if (clickAt === null && now - observationStartedAt > 5_000) {
            document.removeEventListener('click', destinationLinkWasClicked, true)
            mutationObserver.disconnect()
            rejectPromise(new Error(`No click was observed for ${targetPath}`))
            return
          }

          setTimeout(tick, 4)
        }

        tick()
      })
    },
    { targetPath: route.path, targetHeading: route.heading, deadlineMs: timeoutMs }
  )
}

async function measureNavbarClick(page, route) {
  await openDesktopMenu(page, route.menu)
  const link = page
    .locator(`nav[aria-label="Main navigation"] a[href="${route.path}"]:visible`)
    .filter({ hasText: route.label })
    .first()
  await link.waitFor({ state: 'visible', timeout: timeoutMs })

  await installNavigationClock(page, route)
  await link.click({ noWaitAfter: true })
  const timing = await page.evaluate(() => window.__publicNavBenchmarkPromise)
  await page.waitForURL((url) => url.pathname === route.path, { timeout: timeoutMs })
  return timing
}

async function measureReload(page) {
  await page.reload({ waitUntil: 'load', timeout: timeoutMs })
  return page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0]
    return {
      ttfbMs: Math.round(navigation.responseStart - navigation.requestStart),
      responseEndMs: Math.round(navigation.responseEnd),
      domContentLoadedMs: Math.round(navigation.domContentLoadedEventEnd),
      loadMs: Math.round(navigation.loadEventEnd),
      documentEncodedBytes: navigation.encodedBodySize,
      documentTransferBytes: navigation.transferSize,
    }
  })
}

// Heading text is used to prove that the destination content, rather than just
// history.pushState(), has committed.
const headings = {
  '/': 'Come As You Are',
  '/about': 'Our Church History',
  '/spiritual-leaders': 'Our Spiritual Fathers',
  '/our-clergy': 'Our Clergy',
  '/office-bearers': 'Our Office Bearers',
  '/acolytes-choir': 'Our Acolytes & Choir',
  '/our-organizations': 'Our Organizations',
  '/events': 'Events Calendar',
  '/useful-links': 'Useful Links',
  '/first-time': 'A Guide to Our Sacred Worship',
  '/giving': 'Giving',
  '/contact': 'Contact Us',
}
for (const route of routes) route.heading = headings[route.path]

const browser = await chromium.launch({ headless: process.env.HEADED !== '1' })
const samples = Object.fromEntries(routes.map((route) => [route.path, { clicks: [], reloads: [] }]))
const errors = []
const ignoredThirdPartyErrors = []
let tracePath = null
let videoPath = null

try {
  for (let iteration = 1; iteration <= iterations; iteration++) {
    const proofIteration = iteration === 1
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      reducedMotion: 'no-preference',
      recordVideo: proofIteration
        ? { dir: outputDir, size: { width: 1440, height: 900 } }
        : undefined,
    })
    const page = await context.newPage()
    const video = page.video()

    page.on('console', (message) => {
      if (message.type() === 'error') {
        const location = message.location()
        const messageText = message.text()
        const error = {
          iteration,
          type: 'console',
          url: page.url(),
          message: messageText,
          location,
        }
        if (
          location.url.includes('challenges.cloudflare.com') ||
          messageText.includes('Cloudflare Turnstile')
        ) {
          ignoredThirdPartyErrors.push(error)
        } else {
          errors.push(error)
        }
      }
    })
    page.on('pageerror', (error) => {
      errors.push({ iteration, type: 'pageerror', url: page.url(), message: error.message })
    })

    if (proofIteration) {
      await context.tracing.start({ screenshots: true, snapshots: true, sources: true })
    }

    // Starting outside the first target ensures every result is produced by a
    // real destination click rather than page.goto().
    await page.goto(`${baseURL}/contact`, { waitUntil: 'load', timeout: timeoutMs })

    for (const route of routes) {
      const click = await measureNavbarClick(page, route)
      const reload = await measureReload(page)
      samples[route.path].clicks.push(click)
      samples[route.path].reloads.push(reload)
      process.stderr.write(
        `iteration ${iteration}/${iterations} ${route.path}: path=${click.pathChangeMs}ms content=${click.contentChangeMs}ms visual=${click.visualSettledMs}ms reload=${reload.loadMs}ms\n`
      )
    }

    if (proofIteration) {
      tracePath = resolve(outputDir, 'trace.zip')
      await context.tracing.stop({ path: tracePath })
    }
    await context.close()

    if (proofIteration && video) {
      videoPath = resolve(outputDir, 'navigation.webm')
      await video.saveAs(videoPath)
    }
  }
} finally {
  await browser.close()
}

const report = {
  runId,
  generatedAt: new Date().toISOString(),
  baseURL,
  iterations,
  browser: 'Playwright Chromium',
  viewport: { width: 1440, height: 900 },
  tracePath,
  videoPath,
  routes: {},
  errors,
  ignoredThirdPartyErrors,
}

for (const route of routes) {
  const routeSamples = samples[route.path]
  report.routes[route.path] = {
    label: route.label,
    pathChange: stats(routeSamples.clicks.map((sample) => sample.pathChangeMs)),
    contentChange: stats(routeSamples.clicks.map((sample) => sample.contentChangeMs)),
    visualSettled: stats(routeSamples.clicks.map((sample) => sample.visualSettledMs)),
    rscDuration: stats(
      routeSamples.clicks.map((sample) => sample.rsc?.durationMs).filter(Number.isFinite)
    ),
    reloadLoad: stats(routeSamples.reloads.map((sample) => sample.loadMs)),
    clickSamples: routeSamples.clicks,
    reloadSamples: routeSamples.reloads,
  }
}

const jsonPath = resolve(outputDir, 'report.json')
writeFileSync(jsonPath, JSON.stringify(report, null, 2))

const rows = routes.map((route) => {
  const result = report.routes[route.path]
  return `| ${route.path} | ${result.pathChange.median} | ${result.contentChange.median} | ${result.visualSettled.median} | ${result.rscDuration?.median ?? 'prefetched'} | ${result.reloadLoad.median} | ${result.pathChange.max} | ${result.reloadLoad.max} |`
})
const markdown = `# Production public-navigation benchmark

- Generated: ${report.generatedAt}
- Target: ${baseURL}
- Browser: ${report.browser}, ${report.viewport.width}x${report.viewport.height}
- Iterations: ${iterations} fresh browser contexts
- Timing origin: the actual captured click event on the destination navbar link

| Route | Path median (ms) | Content median (ms) | Visual median (ms) | RSC median (ms) | Reload median (ms) | Worst path (ms) | Worst reload (ms) |
|---|---:|---:|---:|---:|---:|---:|---:|
${rows.join('\n')}

The trace contains DOM snapshots, screenshots, actions, and the network waterfall for the first complete iteration. The video records the same iteration.
`
const markdownPath = resolve(outputDir, 'REPORT.md')
writeFileSync(markdownPath, markdown)

console.log(markdown)
console.log(`JSON: ${jsonPath}`)
console.log(`Trace: ${tracePath}`)
console.log(`Video: ${videoPath}`)
if (errors.length) console.log(`Browser errors captured: ${errors.length} (see report.json)`)
if (ignoredThirdPartyErrors.length) {
  console.log(
    `Ignored Cloudflare Turnstile console noise: ${ignoredThirdPartyErrors.length} (retained in report.json)`
  )
}
