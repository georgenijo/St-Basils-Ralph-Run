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

## Admin log viewer

Administrators can open **Admin → Logs** at `/admin/logs`. The page reads the runtime logs Vercel
already captures; it does not copy them to another database or logging vendor. The server queries
production requests and application output, then the UI supports severity, time-range,
text/request-ID filters, and time-boundary pagination.

Set these server-only variables in Vercel Production and Preview:

```bash
VERCEL_ACCESS_TOKEN=<team-scoped access token>
VERCEL_TEAM_ID=<team ID>
```

`VERCEL_PROJECT_ID` is a Vercel system variable in hosted deployments. Set it manually only for
local viewer testing. The page projects an explicit allowlist of operational fields, strips URL query
strings, re-runs redaction on returned values, and never exposes the access token to the browser.

When the token or identifiers are not configured, the page shows setup instructions rather than an
empty or misleading table. After adding or rotating either value, redeploy and verify the page with
a controlled `/api/log` event. Log availability and retention follow the project's Vercel plan.

## Client crashes

`src/app/error.tsx` and `src/app/global-error.tsx` report crashes to `POST /api/log`. The endpoint is
authentication-optional, accepts only a strict allowlist (`name`, `message`, `stack`, `digest`,
`componentStack`, `path`), removes URL query strings, caps body/field sizes, and rate-limits each
source to 10 attempts per minute per running instance. It never accepts arbitrary context, headers,
or request bodies.

The in-memory limiter is intentionally a low-latency first line of defense. Vercel edge/firewall rate
limiting should be added if public abuse is ever observed across many serverless instances.
