# Agent Startup — Issue Mode

You are working on the St. Basil's Boston website rebuild (Next.js 15, Supabase, Sanity, Vercel). Follow these steps in order.

## 1. Load Context

Read these files silently before planning:

- `README.md` — stack, scripts, env vars, project layout
- `.claude/docs/conventions.md` — naming, directory structure, git workflow
- `.claude/docs/design-system.md` — if the issue touches UI or styling
- `prompts/PROMPT_CHAT.md` — architecture map, data flows, RLS rules, known debt (read when you need stack depth beyond README)
- Any path under `src/` or `supabase/migrations/` directly relevant to the issue

`CLAUDE.md` describes the **legacy** static site only; use it for redirect/parity questions, not as the primary app guide.

## 2. Health Check (silent)

Run `git status`. Surface results only if there are unexpected uncommitted changes or you are not on the expected `issue/<number>-*` branch. Otherwise say nothing.

## 3. Your Assignment

The GitHub issue is injected at the end of this prompt (title, number, body). Do not re-fetch it.

Work on **that issue only**. The branch `issue/<number>-<slug>` already exists in this worktree — do not create a new branch.

## 4. Plan Mode

Enter plan mode first. While planning:

- Trace the change through the stack (route → component → server action → DB / external service)
- Read the files you will touch; use sub-agents for broad exploration if helpful
- Write a plan: issue number + title, files to change, approach, risks, and acceptance criteria mapped to the issue
- Wait for user approval before writing code

## 5. Implement

After approval, implement exactly what was planned. No scope creep — no unrelated refactors, drive-by comments, or extra features.

**Principles (non-negotiable):**

- **RLS is the authorization layer** — middleware/layout checks are not enough
- **UTC in, local out** — store UTC; display in `America/New_York` via `src/lib/event-time.ts`
- **Sanity for editorial content, Supabase for operational data**
- **Server Components by default** — `'use client'` only when interactivity requires it

**UI changes:** If `npm run dev` is running, verify at `http://localhost:3000` (Playwright or browser). Check admin routes under `/admin` when relevant.

**Email / auth issues:** Confirm `NEXT_PUBLIC_SITE_URL` and Supabase redirect URLs for the target environment (preview vs production). See README and issue #242 for Resend setup status.

## 6. Verify

Run before committing (fix failures before proceeding):

```bash
npm run lint
npx tsc --noEmit
```

Add tests when the issue implies behavior worth locking in:

- **Unit:** `npm test` (Vitest — timezone, RRULE, validators)
- **Smoke:** `npm run test:smoke` when you changed public pages, forms, or auth guards
- **Full E2E:** `npm run test:e2e:ci` only when the issue explicitly requires integration coverage

For CI parity: `npm run ci:validate` (format + lint + typecheck + build).

Local email without Resend: `EMAIL_TRANSPORT=mock` and `EMAIL_SINK_DIR=.e2e/mailbox` (see `.env.local.example`).

## 7. Commit and PR

1. Commit with a conventional message (`feat:`, `fix:`, `chore:`, etc.)
2. Push: `git push -u origin <branch-name>`
3. Open a PR:
   ```bash
   gh pr create --title "<concise title>" --body "Closes #<issue-number>" --repo georgenijo/St-Basils-Rebuild
   ```
4. Report the PR URL.

Do not add AI/Claude attribution on commits, PRs, or branches.
