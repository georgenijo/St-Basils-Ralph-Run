# Archive

Reference and generated artifacts that are **not** part of the Next.js app build. Nothing here is served in production (legacy URLs redirect via `next.config.ts`).

| Path | Contents |
| --- | --- |
| `legacy-static-site/` | Pre-rebuild Bootstrap site: HTML, `assets/`, `forms/`, Squadfree `documentation/` |
| `design/` | Source design files (e.g. `home.psd` homepage comp) |
| `mockups/` | HTML wireframes for admin/member UX before implementation |
| `ide/` | Old JetBrains `.idea/` config and `.user.ini` |
| `test-results/` | Playwright output (gitignored) |
| `playwright-report/` | Playwright HTML report (gitignored, local runs) |

To browse the old homepage locally, open `legacy-static-site/index.html` in a browser (relative asset paths still work inside that folder).
