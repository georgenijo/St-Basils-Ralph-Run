# Structured logging and alerting

The application has one logging boundary: `src/lib/logger.ts`. Production emits one JSON object per
line to Vercel stdout; development emits the same fields in a compact colorized form. Server actions
and route handlers automatically add request context and duration fields.

## Writing logs

Create one child logger per module and use stable event names:

```ts
import { logger } from '@/lib/logger'

const log = logger.child({ scope: 'payments' })

log.info('payment.confirmed', { paymentId })
log.error('payment.confirm_failed', { error, paymentId })
```

Use `debug` for diagnostic flow, `info` for meaningful successful operations, `warn` for degraded or
rejected operations, and `error` for failures needing investigation. `LOG_LEVEL` accepts `debug`,
`info`, `warn`, or `error`; the default is `debug` in development and `info` in production.

Do not include request bodies, form data, cookies, authorization headers, passwords, tokens, service
keys, email/message bodies, or email addresses. Log stable database IDs and counts instead. The
logger recursively redacts sensitive keys, JWT/key-looking values, cookie headers, email addresses,
and body fields as a final safety net, but redaction is not permission to pass sensitive data.

All server actions must be exported through `withLogging`, and route handlers through
`withRequestLogging`. These wrappers add:

- `requestId`, `route`, `method`, and a middleware-validated `userId` when a session exists
- `scope` plus `action` for server actions
- invocation/completion diagnostics and `durationMs`
- the original error name, message, code, and stack for thrown failures

Redirect/not-found exceptions remain normal Next.js control flow and are not reported as failures.

## Finding an incident in Vercel

1. Open the Vercel project, then **Logs**.
2. Filter by `level:error`, a stable `message` such as `payment.submit_failed`, or the affected
   `route`.
3. Copy `requestId` from any matching record and filter on it to reconstruct that request across
   middleware, its route/action wrapper, and deeper modules.
4. Use `userId` only to correlate an already authenticated request. Email addresses are redacted.

The `x-request-id` response header is also returned from middleware and every route handler, so an
incident report can include it without exposing authentication material.

## Optional durable Axiom sink

Stdout requires no configuration and is always retained by the hosting platform according to the
Vercel plan. For longer, searchable retention, the optional Axiom transport sends the same redacted
record after the response completes using Next.js `after()`; it adds no awaited network work to the
request hot path.

Set these server-only variables in Vercel Production and Preview:

```bash
LOG_DRAIN=axiom
AXIOM_DATASET=st-basils-logs
AXIOM_TOKEN=<ingest-only token>
AXIOM_QUERY_TOKEN=<query-read-only token>
```

Create a dataset, a basic ingest token, and an advanced token whose only permission is Query → Read
for that dataset. `AXIOM_TOKEN` is used only by the log transport; `AXIOM_QUERY_TOKEN` is used only by
the admin viewer. If the ingest variables are missing, the app silently continues with structured
stdout. Never prefix either token with `NEXT_PUBLIC_`.

## Admin log viewer

Administrators can open **Admin → Logs** at `/admin/logs`. The page queries Axiom only from the
server and supports severity, time-range, text/request-ID filters, and stable timestamp pagination.
It projects an explicit allowlist of operational fields, re-runs redaction on returned values, and
never exposes either Axiom token to the browser.

When the Axiom variables are not configured, the page shows setup instructions rather than an empty
or misleading log table. After adding or rotating the variables in Vercel, redeploy the application
and verify that a new event appears in the viewer.

Axiom was selected over a second application database and a full APM SDK because it accepts the
existing JSON records over HTTP, supports email notifiers/monitors, needs no Node stream/worker
transport, and has ample parish-scale headroom. As checked on 2026-08-24, its $0 Personal allowance
lists 500 GB/month loading, 25 GB storage, and 30-day retention; confirm current limits on the
[Axiom pricing page](https://axiom.co/pricing) before enabling it.

### Required error alert

After the first production record arrives:

1. In Axiom, create a monitor for the `st-basils-logs` dataset whose query matches `level == "error"`.
2. Use a short aggregation window and trigger when the count is greater than zero.
3. Attach an email notifier for the site administrator.
4. Send a controlled `/api/log` test event and verify the email arrives, then resolve the test alert.

Axiom documents monitors and email notifiers in its
[alerting guide](https://axiom.co/docs/monitor-data/monitors). The alert is an external control and
must be verified whenever the Axiom token, dataset, or administrator email changes.

## Client crashes

`src/app/error.tsx` and `src/app/global-error.tsx` report crashes to `POST /api/log`. The endpoint is
authentication-optional, accepts only a strict allowlist (`name`, `message`, `stack`, `digest`,
`componentStack`, `path`), removes URL query strings, caps body/field sizes, and rate-limits each
source to 10 attempts per minute per running instance. It never accepts arbitrary context, headers,
or request bodies.

The in-memory limiter is intentionally a low-latency first line of defense. Vercel edge/firewall rate
limiting should be added if public abuse is ever observed across many serverless instances.
