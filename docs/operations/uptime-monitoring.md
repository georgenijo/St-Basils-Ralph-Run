# Uptime Monitoring & Public Status Page

External reachability monitoring for **stbasilsboston.org** using [BetterStack](https://betterstack.com)
(Uptime, free tier) plus a public status page at `status.stbasilsboston.org`.

This document is the admin runbook: the one-time external setup, and how to operate it during an
incident. The code side (the `/api/health` endpoint and the footer link) ships in the app repo; the
account/monitor/status-page/DNS setup below is done in the BetterStack and DNS dashboards.

> **Status:** the in-repo pieces are live (`/api/health`, env-gated footer link). The BetterStack
> account, monitors, status page, DNS, and alert channel still need to be provisioned by an admin
> using the steps below.

---

## Overview

- **Why:** there is no external probe of the site. A 500, a DNS failure, or a Supabase/Sanity outage
  is currently noticed only when a member calls. This also gives the community a public
  "is it down, or is it just me?" signal.
- **Free-tier limits:** 10 monitors, 3-minute check interval, one public status page, Slack/email
  alerts. We use 6 monitors and keep 4 in reserve.
- **Pairs with:** Sentry (#217) — Sentry catches in-app errors; this catches the site being
  unreachable in the first place.

---

## 1. Create the BetterStack account

1. Sign up at <https://betterstack.com/uptime> on the **free** plan.
2. Create a team/workspace for **St. Basil's** and invite the other admins.

---

## 2. Configure the 6 monitors

Add each as an **HTTP monitor** (except SSL/DNS types) with a **3-minute** interval.

| #   | Monitor                   | URL                                     | Expected result                                         | Type            |
| --- | ------------------------- | --------------------------------------- | ------------------------------------------------------- | --------------- |
| 1   | Homepage                  | `https://stbasilsboston.org`            | HTTP `200`                                              | HTTP            |
| 2   | Health endpoint           | `https://stbasilsboston.org/api/health` | HTTP `200` **and** body contains `"ok":true`            | HTTP + keyword  |
| 3   | Events (dynamic / Sanity) | `https://stbasilsboston.org/events`     | HTTP `200`                                              | HTTP            |
| 4   | Admin auth guard          | `https://stbasilsboston.org/admin`      | **Any 3xx redirect whose `Location` contains `/login`** | HTTP (redirect) |
| 5   | SSL certificate           | `stbasilsboston.org`                    | Warn **14 days** before expiry                          | SSL/TLS         |
| 6   | DNS                       | `stbasilsboston.org`                    | Resolves (A/AAAA present)                               | DNS             |

Notes:

- **Monitor 2** is the most informative one. Enable the keyword/response-body check for `"ok":true`,
  not just the status code — a `503` from `/api/health` means a dependency (DB or CMS) is down even if
  the homepage still serves. Failure responses (`503`) are sent `Cache-Control: no-store`, and the
  3-minute probe interval is well past the 30s healthy-response cache, so BetterStack always sees the
  live state.
- **Monitor 4** must **not** be pinned to exactly `302`. The app redirects unauthenticated `/admin`
  requests to `/login` (see `middleware.ts`); treat **any 3xx with a `Location` containing `/login`**
  as healthy. Configure BetterStack to _not_ follow redirects and assert on the redirect + location,
  or use its "expected status code" set to the `3xx` range. A `200` rendering of `/admin` to an
  anonymous client would mean the auth guard regressed — that should alert.
- **Monitors 5 & 6** are dedicated SSL and DNS monitor types, not HTTP checks.

---

## 3. Public status page

1. In BetterStack, create a **Status Page**.
2. Add resources/sections mapped to the relevant monitors:
   - **Website** → Homepage (monitor 1)
   - **Member portal** → (group with homepage, or a `/member` monitor if a reserve slot is used)
   - **Admin** → Admin auth guard (monitor 4)
   - **Qurbono livestream** → add if/when the livestream is embedded on-site
3. Enable **90-day historical uptime** and **incident history** display.
4. **Custom domain / DNS:** point `status.stbasilsboston.org` at BetterStack:
   - In the DNS provider, add a **CNAME** record: `status` → the BetterStack-provided target
     (e.g. `statuspage.betteruptime.com` — use the exact value BetterStack shows).
   - Wait for DNS propagation, then verify the page loads over HTTPS at
     `https://status.stbasilsboston.org`.
5. **Surface the footer link:** once the status page is live, set the Vercel env var
   `NEXT_PUBLIC_STATUS_PAGE_URL=https://status.stbasilsboston.org` (Production + Preview) and redeploy.
   The footer "System Status" link only renders when this is set, so it is never a dead link before
   the page exists.

---

## 4. Alerts

- **Primary channel:** Slack `#st-basils-alerts` (create the channel, add BetterStack's Slack
  integration). If Slack is not ready, fall back to **email** to the admin distribution list.
- **Sunday-morning escalation:** during the service window (**8:30–11:00 ET Sundays**, `America/New_York`), an outage is
  high-impact. Configure **SMS/phone** escalation for at least one on-call admin for that window.
- **Always-on:** no quiet hours — alerts fire 24/7.

---

## 5. Reading the status page

- **Green / Operational** — all monitors passing.
- **Yellow / Degraded** — partial outage (e.g. `/events` down but homepage up, or `/api/health`
  returning `503` because one dependency is down).
- **Red / Outage** — homepage / DNS / SSL failing.

Members can subscribe to the status page for incident updates.

---

## 6. Incident response runbook

When an alert fires:

1. **Confirm scope.** Open `https://stbasilsboston.org/api/health` and read the JSON
   `{ ok, db, cms, latency_ms }` — or, if signed in as an admin, glance at the in-app
   card at `/admin/health` (renders the same endpoint with per-dependency status + latency).
2. **Triage by signal:**
   - `db: false` → Supabase is unreachable. On the free tier the project **auto-pauses after
     inactivity** — open the Supabase dashboard and resume it. Otherwise check Supabase status / the
     project's health.
   - `cms: false` → Sanity is unreachable. Check the Sanity project status; content pages may serve
     stale/fallback data meanwhile.
   - `ok: true` but the homepage/monitor is still failing → the app itself is fine; suspect **Vercel**
     (deployment/build), **DNS**, or **SSL**. Check the Vercel dashboard and the DNS/SSL monitors.
   - High `latency_ms` (approaching the 2s per-dependency budget) → a dependency is slow but
     reachable; watch for it tipping into a timeout.
3. **Communicate.** Post an incident on the BetterStack status page (sets the public banner) so
   members see a "known issue" rather than guessing.
4. **Resolve & close.** Once monitors recover, mark the incident resolved.
5. **Post-mortem.** For anything beyond a brief blip, add a short post-mortem to the incident:
   what happened, root cause, fix, and follow-up. Keep it blameless and brief.

---

## 7. Health endpoint reference

`GET https://stbasilsboston.org/api/health` — implemented in `src/app/api/health/route.ts`
(logic in `src/lib/health.ts`).

```json
{
  "ok": true,
  "db": true,
  "cms": true,
  "latency_ms": 142,
  "db_latency_ms": 126,
  "cms_latency_ms": 88
}
```

| Field            | Meaning                                                                          |
| ---------------- | -------------------------------------------------------------------------------- |
| `ok`             | `db && cms`. Drives the HTTP status.                                             |
| `db`             | Supabase Postgres reachable (a tiny `select … limit 1` within 2s).               |
| `cms`            | Sanity reachable (a GROQ literal `1` ping within 2s).                            |
| `latency_ms`     | Total time to probe both dependencies (BetterStack's signal).                    |
| `db_latency_ms`  | Per-dependency Supabase probe time; feeds the in-app admin `/admin/health` card. |
| `cms_latency_ms` | Per-dependency Sanity probe time; feeds the in-app admin `/admin/health` card.   |

- **HTTP status:** `200` when `ok`, **`503`** when any dependency is down.
- **Caching (asymmetric):** healthy `200` responses are `public, max-age=0, s-maxage=30` — cached at
  the CDN edge for 30s to shed load from repeated/public requests, with no `stale-while-revalidate` so
  a stale `200` can't outlive the 30s window. Failure `503` responses are `no-store` — never cached, so
  an outage surfaces immediately and recovery is never delayed by a stale `503`. The 3-minute monitor
  interval is far longer than the 30s TTL, so probes always see a fresh check.
- **No PII:** the endpoint never returns content rows, user data, or error stack traces — only the
  booleans above.
