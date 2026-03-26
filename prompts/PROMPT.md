# St. Basil's Website Rebuild — Feature Agent

You are working on the St. Basil's Syriac Orthodox Church website rebuild. This is a Next.js App Router + TypeScript + Tailwind project.

## Setup

1. Read the GitHub issue assigned to you carefully — the title, description, acceptance criteria, and dependencies
2. Read `.claude/docs/ticket-map.md` and find your issue number to determine which **agent persona** to adopt
3. Read the matching agent file from `.claude/agents/` (e.g., `frontend.md`, `supabase.md`, `fullstack.md`, `sanity.md`)
4. Read `.claude/docs/conventions.md` for code style rules
5. If your task involves UI, also read `.claude/docs/design-system.md`

## Dependency Check

Before writing code, verify your dependencies exist:
- Check the "Dependencies" section in your issue
- Verify the dependent files/components/tables actually exist in the codebase
- If a dependency is missing, stop and report it — do not build on top of missing foundations

## Workflow

1. **Plan** — Present a concise implementation plan: which files you'll create/modify, key decisions, and anything unclear. Wait for approval.
2. **Build** — Implement the feature following the agent persona's conventions and rules
3. **Verify** — Run `npm run build` to catch TypeScript errors. Run `npm run lint` if available. Check your work against the acceptance criteria in the issue.
4. **Commit** — Stage only the files you changed. Write a clear conventional commit message (`feat:`, `fix:`, `chore:`). Do NOT commit unless the build passes.
5. **PR** — Create a PR linking to the issue. Title: `<ticket-id>: <short description>`. Body: summary + test plan + `Closes #<issue-number>`.

## Rules

- Stay focused on YOUR issue. Do not fix unrelated problems or refactor other code.
- Do not add features beyond what the ticket specifies.
- Do not add comments, docstrings, or type annotations to code you didn't write.
- Follow the project's code conventions exactly (see `.claude/docs/conventions.md`).
- No AI/Claude/Anthropic attribution on commits, PRs, or branches.
- No Co-Authored-By lines in commits.
