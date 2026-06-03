# Repository cleanup plan

Living checklist for shrinking the active codebase and keeping history/reference material under `archive/`.

## Done

- [x] **Playwright output** → `archive/test-results/` (`outputDir` in `playwright.config.ts`)
- [x] **Legacy static site** → `archive/legacy-static-site/` (24 HTML pages, `assets/`, `forms/`, `documentation/`)
- [x] **Design source** → `archive/design/home.psd`
- [x] **UX mockups** → `archive/mockups/` (`mockup-*.html`)
- [x] **IDE cruft** → `archive/ide/` (`.idea/`, `.user.ini`)
- [x] Tooling ignores updated (ESLint, Prettier, `.gitignore`)

Redirects in `next.config.ts` and `e2e/smoke/redirects.spec.ts` are unchanged; they do not depend on files at the repo root.

## Phase 2 — Sync and docs (next)

- [ ] **Fast-forward `main`** — local branch was behind `origin/main`; pull before large feature work
- [ ] **Rewrite `CLAUDE.md`** — still describes the static HTML site as the product; point to `README.md` + `archive/legacy-static-site/`
- [ ] **Close [#240](https://github.com/georgenijo/St-Basils-Rebuild/issues/240)** after merge (legacy root cleanup)
- [ ] **`.playwright-cli/`** — add to `.gitignore` (local CLI snapshots only)

## Phase 3 — Repo size (optional, higher impact)

- [x] Move legacy `assets/` (~127 MB) into archive (keeps git history; clone still large)
- [ ] **Git LFS or external storage** for `archive/design/*.psd` and large media if you want smaller clones
- [ ] **`git filter-repo`** to purge old blobs from history (only if clone size matters; destructive, coordinate with team)
- [ ] Audit **`public/`** vs Sanity CDN for duplicate images/video

## Phase 4 — Application code hygiene

- [ ] Run `npm run ci:validate` on latest `main`
- [ ] Remove dead code paths (grep for unused exports, orphaned components)
- [ ] Consolidate duplicate validators/actions after member/finance merge
- [ ] Ensure `src/` has no imports pointing at `archive/`
- [ ] Review `REVIEW_HANDOFF_*.md` pattern (already gitignored) — delete stale handoffs

## Phase 5 — Operations (not repo layout)

- [ ] [#242](https://github.com/georgenijo/St-Basils-Rebuild/issues/242) Resend + DNS for production email
- [ ] Verify Supabase migrations applied on production
- [ ] Production smoke: `BASE_URL=https://stbasilsboston.org npm run test:smoke:prod`

## Principles

1. **Active app lives at repo root:** `src/`, `public/`, `e2e/`, `supabase/`, config files.
2. **Archive = read-only reference** — no imports from `archive/` in production code.
3. **URLs are config, not files** — legacy paths handled by Next redirects.
4. **One PR per cleanup slice** — easier review and rollback.
