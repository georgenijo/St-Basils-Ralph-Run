# St. Basil's Boston — Website

Next.js rebuild of [stbasilsboston.org](https://stbasilsboston.org) for St. Basil's Syriac Orthodox Church (Jacobite Malayalee parish), Newton, MA.

- **Address:** 73 Ellis Street, Newton, MA 02464
- **Sunday services:** Morning Prayer 8:30 AM · Holy Qurbono 9:15 AM (America/New_York)
- **Production:** Vercel · **Content:** Sanity CMS · **App data:** Supabase (Postgres + Auth)

## Stack

| Layer | Technology |
| --- | --- |
| App | Next.js 15 (App Router), React 19, TypeScript (strict), Tailwind CSS 4 |
| Structured data | Supabase — events, announcements, subscribers, contact, families, payments, profiles |
| Editorial content | Sanity — clergy, organizations, page copy, useful links |
| Email | Resend + React Email templates |
| Forms | Server Actions, Zod, Cloudflare Turnstile |
| Calendar | FullCalendar + RRULE, ICS export at `/api/events/feed.ics` |
| Hosting | Vercel (preview deploys on PRs) |

All event timestamps are stored in UTC and displayed in `America/New_York`.

## Features

### Public site

Home, about, spiritual leaders, clergy, office bearers, organizations, acolytes & choir, useful links, first-time visiting, giving, contact, events (calendar + detail), announcements, privacy/terms, and event RSVP pages. Legacy `.html` URLs redirect to the new routes (see `next.config.ts`).

### Admin (`/admin`)

Dashboard, events (CRUD, recurrence, per-occurrence edit/cancel, charges), announcements (Tiptap + optional email broadcast), newsletter subscribers, user invite/list/roles, payments, shares, and settings. Access requires Supabase Auth with `profiles.role = 'admin'`; RLS enforces permissions at the database.

### Member portal (`/member`)

Overview, membership, family, payments, shares, directory, and settings for authenticated members.

### Sanity Studio

Embedded at `/studio` for content editors.

## Getting started

**Requirements:** Node 20 (see `.nvmrc`), npm, and project credentials for Supabase, Sanity, Turnstile, and (for real email) Resend.

```bash
npm install
cp .env.local.example .env.local
# Fill in .env.local (see below)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Studio: [http://localhost:3000/studio](http://localhost:3000/studio).

### Environment variables

Copy `.env.local.example` and set at minimum:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + SSR Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only admin operations |
| `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET` | Sanity content |
| `SANITY_WEBHOOK_SECRET` | ISR revalidation webhook |
| `NEXT_PUBLIC_SITE_URL` | Canonical URLs in emails and metadata |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | Public form CAPTCHA |
| `RESEND_API_KEY`, `RESEND_AUDIENCE_ID` | Transactional + newsletter email |

For local development without Resend, use the mock email sink:

```bash
EMAIL_TRANSPORT=mock
EMAIL_SINK_DIR=.e2e/mailbox
```

E2E and test API routes also use `E2E_MODE`, `TEST_SUPPORT_ENABLED`, and related vars documented in `.env.local.example`.

**Production email:** Resend must be configured with a verified `stbasilsboston.org` sending domain and `RESEND_API_KEY` on Vercel. Until then, email features degrade gracefully but do not deliver (see [issue #242](https://github.com/georgenijo/St-Basils-Rebuild/issues/242)).

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run ci:validate` | Format check, lint, typecheck, build (CI gate) |
| `npm test` | Vitest unit tests |
| `npm run test:smoke` | Playwright smoke tests (`@smoke`) |
| `npm run test:e2e:ci` | Full E2E (smoke + CI integration) |

## Project layout

```
src/
├── app/
│   ├── (public)/          # Marketing pages + Navbar/Footer
│   ├── (auth)/            # Login, set-password
│   ├── (admin)/admin/     # Admin dashboard
│   ├── (member)/member/   # Member portal
│   ├── studio/            # Sanity Studio
│   └── api/               # Webhooks, ICS, newsletter, OG, test helpers
├── actions/               # Server Actions
├── components/            # UI, layout, feature components
├── emails/                # React Email templates
├── lib/                   # Supabase, Sanity, validators, event-time, email
└── sanity/                # Schemas and GROQ

supabase/migrations/       # Postgres schema + RLS (applied on push to main)
e2e/                       # Playwright smoke + CI specs
archive/                   # Legacy static site, design PSDs, mockups (see archive/README.md)
```

Generated Playwright output (gitignored): `archive/test-results/`, `archive/playwright-report/`.

**Data split:** Editorial copy and bios → Sanity. Operational records (events, users, payments, forms) → Supabase.

## Testing & CI

GitHub Actions (`.github/workflows/ci.yml`):

- **Validate** — `npm run ci:validate` on every PR and push to `main`
- **Unit tests** — Vitest
- **Smoke tests** — Playwright against the Vercel preview URL on PRs

Pushes to `main` that change `supabase/migrations/**` run `.github/workflows/migrate.yml` (`supabase db push`).

## Deployment

- **App:** Connect the repo to Vercel; set environment variables for Production and Preview.
- **Database:** Migrations apply via CI when merged to `main` (requires `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_ID`, `SUPABASE_DB_PASSWORD` in GitHub secrets).
- **Content:** Configure a Sanity webhook to `POST /api/revalidate` with `SANITY_WEBHOOK_SECRET`.

## Legacy static site

The pre-rebuild Bootstrap site lives under [`archive/legacy-static-site/`](./archive/legacy-static-site/). Vercel serves only the Next.js app; permanent redirects in `next.config.ts` map old `.html` URLs to App Router paths. Further cleanup tasks: [`docs/CLEANUP.md`](./docs/CLEANUP.md).

## Documentation

| Doc | Contents |
| --- | --- |
| [CLAUDE.md](./CLAUDE.md) | Legacy static site reference and known issues |
| [.claude/docs/conventions.md](./.claude/docs/conventions.md) | Code style, naming, directory patterns |
| [.claude/docs/design-system.md](./.claude/docs/design-system.md) | Colors, typography, components |
| [.claude/docs/ticket-map.md](./.claude/docs/ticket-map.md) | Original phased ticket map |
| [prompts/PROMPT_CHAT.md](./prompts/PROMPT_CHAT.md) | Architecture context for AI-assisted work |

## License

Private — St. Basil's Syriac Orthodox Church.
