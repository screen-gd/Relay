# Design-system rebuild fallout (#72 / #73) — Projects board, calendar, e2e selectors

Repo `screen-gd/relay` at `/workspace/relay`, branch `main`, HEAD `302d444`, working tree untouched. Read-only audit; no repository state changed, nothing created under `/workspace/relay`.
Cluster scope: `2742b2c` → `1470b64` (merged `2ec8f86`, PR #72), `02ce326` (merged `6eb560e`, PR #73).

Scope facts established first:

```
$ for c in 2742b2c 02ce326 1470b64; do d=$(git show --name-status --format='' $c | grep -c '^D'); a=$(git show --name-status --format='' $c | grep -c '^A'); m=$(git show --name-status --format='' $c | grep -c '^M'); echo "$c A=$a M=$m D=$d"; done
2742b2c A=11 M=44 D=0
02ce326 A=1 M=8 D=0
1470b64 A=0 M=4 D=0
```

The cluster deletes **no** file (only `A`/`M`; 55 changed files in `2742b2c`, 9 in `02ce326`, 4 in `1470b64`). So there is no "deleted module with a live importer" in this cluster. Every deletion in `git log --diff-filter=D --name-only -45` belongs to an earlier commit (`492b7bd` test-script cleanup, `ff9a925`, `a7894da`, `a6cd74a`, `c5aefac`, `9447009`, …), not to the shadcn rebuild.

---

## 1. FINDINGS

### F1 — Every Projects-library row and Dashboard-ledger row is exposed to assistive tech as a _button_, so the tables have no data rows at all — MEDIUM

**Evidence (code).** The row element is a real `<tr>` inside the real `<table>`, but its role is overridden:

```
src/components/precision-projects.tsx:1271   <motion.tr
src/components/precision-projects.tsx:1273     role="button"
src/components/precision-projects.tsx:1275     data-testid="project-row"
src/components/precision-projects.tsx:1277     aria-selected={
src/components/precision-projects.tsx:1223   aria-label={`${scope === "team" ? "Team" : "Personal"} project library`}   (on <Table>)

src/components/precision-dashboard.tsx:1209  <motion.tr
src/components/precision-dashboard.tsx:1211    role="button"
src/components/precision-dashboard.tsx:1216    aria-selected={
src/components/precision-dashboard.tsx:1140  aria-label="Projects"   (on <Table>)
```

**Evidence (browser behaviour, proven, not inferred).** A synthetic DOM with the same markup (real `<table>`/`<th>`, body rows carrying `role="button" aria-selected`), rendered in headless Chromium through the repo's own Playwright at `/workspace/relay/node_modules/playwright-core`:

```
$ node /tmp/rowrole.mjs
getByRole(columnheader) count: 2
getByRole(row) count: 1
getByRole(button) count: 2
aria snapshot of the table:
- table "Personal project library":
  - rowgroup:
    - row "Name Client":
      - columnheader "Name"
      - columnheader "Client"
  - rowgroup:
    - button "Select Alpha. Planned.":
      - cell "Alpha"
      - cell "Acme"
    - button "Select Beta. Planned.":
      - cell "Beta"
      - cell "Acme"
```

Two body rows become two `button`s that own orphan `cell`s; the AX tree contains exactly one `row` (the header). `aria-selected` is absent from the snapshot for both rows, which is the spec behaviour: ARIA 1.2 supports `aria-selected` on `gridcell`, `option`, `row`, `tab`, `columnheader`, `rowheader`, `treeitem` — not on `button`.

**Contract violated (the repo's own words).**

- `docs/design/features/projects.md:25` — "Use table semantics or a fully defined grid, named row actions, sort state, focus return from sheets, and non-color status labels."
- `docs/design/system/components.md:48` — "Use a native table unless the interaction truly needs an ARIA grid."

**User-visible consequence.** A screen-reader user on `/projects` or the Dashboard is told the library contains buttons, not rows: no row count, no row/column position, no header association, and no exposure of which project is selected (colour is the only cue the app still gives, which `projects.md:25` also forbids). The Dashboard keeps `aria-sort` on its headers (`precision-dashboard.tsx:1155`) while the rows are not rows, so sort state no longer has a table to attach to; the Projects table never emits `aria-sort` at all (`grep -n 'aria-sort' src/components/precision-projects.tsx` → no hits).

**How a reviewer proves it.** `pnpm dev:next` then, at `/projects`, run an accessibility snapshot (`page.locator("table").ariaSnapshot()`) or axe-core: expect `role="row"` for data rows and no `aria-allowed-attr`/table-semantics violations. Or replicate the AX probe above.

**Confidence.** High on the mechanism and the contract breach (both executed). The visual product is unchanged — this is assistive-tech-only.

**Provenance (important).** `role="button"` on these rows predates the cluster (`git show 9a87264:src/components/precision-projects.tsx | grep -n 'role="button"'` → line 1196). But the cluster rewrote these exact rows twice: `2742b2c` rebuilt the board/table, and `1470b64` — the cluster's own review-response commit — deliberately kept the role:

```
1470b64 commit body: "Drop the Button asChild wrapper from clickable table rows; the rows
already carry their own role, focus and hover styles."
```

So it is not new fallout, but the rebuild re-affirmed it while the same commit was fixing row markup, and the design-system contract it was implementing says the opposite.

### F2 — Two shipped components reference the CSS variable `--app-text`, which is defined nowhere in the repository — LOW

**Evidence.**

```
$ grep -rn -- '--app-text' src/
src/components/precision-schedule.tsx:812:  "h-8 gap-0 rounded-md px-3 text-xs text-[var(--app-muted)] hover:bg-[var(--app-hover)] hover:text-[var(--app-text)] dark:hover:bg-[var(--app-hover)] focus-visible:ring-2 focus-visible:ring-[var(--app-highlight)] active:translate-y-0 active:scale-100",
src/components/precision-workspaces.tsx:433:  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[var(--app-muted)] hover:text-[var(--app-text)]"

$ grep -rn --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.git 'app-text' . | grep -v test-results
(only the two lines above)

$ grep -rn -- '--app-text:' src/ website/
(no output — no definition in src/app/globals.css, src/app/design-system.ts, src/app/legal-page.module.css or anywhere else)

$ comm -23 <tokens used via var(--*  in src/> <tokens defined in globals.css + design-system.ts>
--app-text          <-- the only app token in this state
--font-geist-mono   <-- defined per-request by next/font in src/app/layout.tsx:128 (fine)
--font-geist-sans   <-- same
--radix-*           <-- set at runtime by Radix (fine)
```

It also ships: the built stylesheet in this run's own Playwright trace contains `.hover\:text-\[var\(--app-text\)\]:hover { color: var(--app-text) }` (`test-results/.playwright-artifacts-2/traces/resources/7be1ae894499d5f6e789dc954d1c33182bf029e4.css:4366`).

**User-visible consequence.** `color: var(--app-text)` is invalid at computed-value time, so the declaration is dropped and the hover colour becomes the inherited colour instead of an ink token. The intent ("brighten on hover") is unimplemented; it currently looks approximately right only because both call sites inherit the workspace ink colour from the shell (`workspace-shell.tsx:410`, `text-[var(--app-ink)]`). Inside any muted ancestor the hover would silently stay muted. No crash, no layout effect.

**How a reviewer proves it.** `grep -rn -- '--app-text:' src/` → empty, versus the two usages above; or hover the calendar toolbar button and the search-clear icon in devtools and see the declaration struck through (`color: var(--app-text)` → invalid).

**Confidence.** High that the token is undefined; medium-low on how visible the regression is today, for the reason stated.

### F3 — Answer to the headline question: no selector in the four specs is dead; the suite's blind spot is what let F1 through — LOW (result, not defect)

I extracted every literal passed to `getByRole/getByLabel/getByText/getByTestId/hasText/toHaveURL/aria-controls/id` from `e2e/workspace-layout.spec.ts`, `e2e/local-project.spec.ts`, `e2e/helpers.ts`, `e2e/cloud-workflow.spec.ts` (checks `name`, `aria-label`, `locator('[data-testid=…]')`, placeholders, headings, routes) and resolved each one against the current `src` tree. Then a second, sharper pass: every string the cluster **removed** from `src/` and that is still asserted in `e2e/`:

```
$ git diff 9a87264 6eb560e -- src/ | grep '^-' | grep -o '"[^"]\{6,60\}"' | sort -u > /tmp/removed_strings.txt
$ wc -l < /tmp/removed_strings.txt
439
$ node /tmp/y.mjs        # for each: still in e2e/ ? if yes, does it still exist in src/ ?
(no output)
```

Nothing in the specs points at markup the rebuild removed. The interpolated-looking misses all resolve to live templates:

| Spec assertion                                                                | Source that produces it                                                                                       |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `local-project.spec.ts:28,30` "Previous week"/"Next week"                     | `precision-schedule.tsx:339,347` `` `Previous ${viewMode === "week" ? "week" : "month"}` ``                   |
| `local-project.spec.ts:197` status "Imported 1 projects"                      | `settings-page.tsx:337` + `role="status"` in `app-feedback.tsx:56`                                            |
| `local-project.spec.ts:483,588` "Editing projects" / "Client Review projects" | `precision-projects.tsx:430` `` `${stage.label} projects` `` on `<section>` (→ role `region`)                 |
| `local-project.spec.ts:570` "Change stage for Workflow Project"               | `precision-projects.tsx:389`                                                                                  |
| `local-project.spec.ts:632` "Mark Workflow Project as Delivered?"             | `project-controller.ts:97`; button "Mark delivered" at `project-actions-provider.tsx:342`                     |
| `local-project.spec.ts:741,749` "Current: …"                                  | `project-outputs-panel.tsx:350`                                                                               |
| `local-project.spec.ts:751` "Version history (2)"                             | `project-outputs-panel.tsx:384` (`CollapsibleTrigger` → real `button` with `aria-expanded`)                   |
| `local-project.spec.ts:477` "Personal project library"                        | `precision-projects.tsx:1223`                                                                                 |
| `cloud-workflow.spec.ts:150` "1 output selected"                              | `project-portal-panel.tsx:589-591`                                                                            |
| `workspace-layout.spec.ts:160-167` `sr-only` h1 + breadcrumb nav              | `project-workspace.tsx:195`, `useWorkspaceBreadcrumb(project.title)` at `:156`, `workspace-shell.tsx:424,437` |

`helpers.ts:66-71` and `workspace-layout.spec.ts:163-167` use `{ name: \`Current location: Projects / ${title}\`, exact: true }`; `workspace-shell.tsx:424` builds exactly `` `Current location: ${breadcrumb ? `${title} / ${breadcrumb}` : title}` `` with `title="Projects"`from`workspacePageForPath` (`workspace-shell.tsx:220-222`, label resolved at `:395-400`).

The cluster updated the specs in the same commits rather than leaving them pinned: `02ce326` switched the calendar assertion from "Previous month/Next month" to "Previous week/Next week" (`git show 02ce326 -- e2e/local-project.spec.ts`); `2742b2c` replaced `locator('[data-slot="page-header"]')` with `getByRole("complementary", { name: "Project details" })`, moved the delete flow to `alertdialog`, and `1470b64` rewrote the portal/comment selectors.

Why that still matters: the suite asserts row selection through the DOM attribute (`local-project.spec.ts:501` `expect(rows.last()).toHaveAttribute("aria-selected", "true")`) and finds rows through `data-testid` (`helpers.ts:53`), so nothing in it can observe F1 — `getByRole("row")` is never used. And per `docs/testing.md`: "Playwright is a separate command and is not run by `check:full` or the current CI workflow", so this class of drift is not gated. `docs/testing.md` also records the earlier decision to delete the string/class-name verification scripts (`verify.mjs`, `check-workspace-layout.mjs`, `verify-ui-interactions.mjs`) — deliberate, and it is why nothing mechanical checks selectors now.

**Confidence.** High for static resolution (two independent passes, both empty), not for runtime pass/fail — see section 3.

### Checked clean (verified negatives, evidence in one line each)

- **No dead UI module, no unreferenced leftover.** Every file in `src/components/ui/` has an importer (`for f in …; grep -rl "components/ui/$f\"" src/` → 0 files with no importer); no `calendar.tsx`/`react-day-picker` remnant exists at all; `DatePicker` has 4 feature importers plus two `ProjectDatePicker` wrappers; `grep -rn 'type="date"' src/` returns only the doc comment at `ui/date-picker.tsx:70`. `node /tmp/localdead2.mjs` (declarations with a single occurrence in each of the 10 rebuilt files) → no output.
- **No raw colour constants** in `src/components`/`src/features` (`grep -rnE '#[0-9a-fA-F]{3,8}\b'` → no output), which is `components.md:70` ("No feature component uses raw color constants").
- **Every `data-*` read by JS is rendered**: `data-board-card` (`precision-projects.tsx:352`), `data-board-wheel` (`:433`, `:1124`), `data-board-column-body` (`:446`), `data-testid="project-row"` (`precision-projects.tsx:1275`, `precision-dashboard.tsx:1213`) all exist.
- **Radix usage matches the umbrella package**: `grep -rn "@radix-ui/" src/` → no hits; all 22 primitives import from `radix-ui` (`package.json:61`, `radix-ui ^1.5.0`), and `scripts/check-mui-allowlist.mjs:9-10` only forbids `@mui`/`@emotion`.
- **Docs checked against shipped board/calendar behaviour, no contradiction found**: the Calendar still offers month/week/agenda (`precision-schedule.tsx:373-382`, `docs/APP-OVERVIEW.md:157`) and still exports `.ics` (`precision-schedule.tsx:300`, promised at `docs/APP-OVERVIEW.md:164`); the Projects board keeps the inspector, both scopes, and the create flow (`docs/design/features/projects.md:9,13,29`).
- **`node scripts/verify-brand-assets.mjs` → exit 0**, "Relay brand asset contract verified in app and marketing public directories." The social-preview files that `78dfffc` deleted exist only in the app's `public/` by design ("The social preview ships with the main app only.", `scripts/verify-brand-assets.mjs:75`), and `website/app/layout.tsx`'s public references resolve.
- **`scripts/verify-team-live.mjs`'s static checks still match**: `convex/auth.config.ts:7,9,10` contain `providers`, `clerkIssuerDomain`, `applicationID: "convex"`.

## 2. LOOKS WRONG BUT IS DELIBERATE

- **No `<input type="date">` anywhere; every date field goes through `DatePicker`.** Deliberate and documented in the component: `src/components/ui/date-picker.tsx:70-74` — "Use this instead of `<input type="date">` so every date field shares one popover calendar instead of the browser/OS picker." `02ce326` is titled "Refresh calendar views and adopt the shared date picker".
- **Calendar tabs render lowercase text (`{mode}`) yet e2e asks for `tab "Month"`.** Not a bug: `precision-schedule.tsx:381` (`{mode}`, list built at `:373`) styles it with Tailwind `capitalize`, and Playwright's `name` matching is case-insensitive. Proven on the repo's own Playwright: with `<button role="tab" class="capitalize">month</button>`, `getByRole("tab", { name: "Month" }).count()` → 1 and `{ name: "month" }` → 1 as well. (`local-project.spec.ts:16,26` does not use `exact: true`.)
- **The Playwright journeys are not part of CI.** `docs/testing.md`: "Playwright is a separate command and is not run by `check:full` or the current CI workflow", and `docs/testing.md` records the deliberate deletion of the string/class-name verification scripts. A stale selector would not fail a gate — by decision, not by oversight.
- **`role="button"` on the rows themselves** is at least intentional on the part of the cluster's own review commit — `1470b64` message: "the rows already carry their own role, focus and hover styles" — which is why F1 is reported as a contract breach rather than an accident (and why it survived the review).
- **`.brand-logo-light` / `.brand-logo-dark` are non-Tailwind classes** used by `scripts/verify-light-logo.mjs:29`. Deliberate: defined in `src/app/globals.css:242-251` and applied in `src/app/relay-brand.tsx:63,71`.

## 3. NOT VERIFIED

- **No assertion was executed in a browser.** I did not run Playwright or any dev server (instructed not to; the parent owns those runs). Everything in F3 is static resolution of selector strings against `src`, plus `git` provenance. A spec can still fail at runtime for a reason no grep can see — the two I would watch first, both layout/behaviour rather than markup: `local-project.spec.ts:190-195` (search box and `Filters` button must share a row within 5px; today both sit in `PageToolbar`'s `primary`/`secondary` at `page-toolbar.tsx:23,29,34`, so it should hold) and `local-project.spec.ts:589-611` (dnd-kit pointer drag between columns, `precision-projects.tsx:469-471` sensors plus `:422` `useDroppable`).
- **The AX-tree evidence for F1 is from a synthetic DOM that mirrors the app's markup, not the running app.** The mechanism (role override → no `row`, `aria-selected` dropped) is browser behaviour and is certain; the exact screen-reader sentence a user hears on `/projects` is not measured.
- **`cloud-workflow.spec.ts` could not be exercised at all.** Its whole `describe` is skipped without Clerk/Convex credentials (`e2e/cloud-workflow.spec.ts:52-55`); I verified its selectors resolve in `src` only, and I hold no Clerk secret.
- **`scripts/verify-light-highlights.mjs` and `scripts/verify-light-logo.mjs` were not run** — both need a server at `RELAY_UI_URL` (default `http://localhost:3100`). Statically their dependencies exist: `--app-highlight`/`--app-panel` in `src/app/globals.css`, `data-theme` set to lowercase in `src/app/layout.tsx:98` and `src/features/routes/shared/route-theme.ts:17`, `.brand-logo-*` classes, and `a[aria-label="Go to Relay dashboard"]` at `src/app/relay-brand.tsx:39`.
- **`scripts/verify-team-live.mjs`'s manual checklist was not performed** (needs two live Clerk accounts); only its static prerequisite checks were reviewed.
- **No visual/contrast verification of the rebuilt board or calendar.** Section 5 of the brief asks about docs describing the old Projects board or calendar flow; the ones I found (`docs/APP-OVERVIEW.md:150-166`, `docs/architecture/workspace-page-system.md`, `docs/architecture/design-system-application-convex-seams.md`) are consistent with the shipped code at the level I could check by reading, with one exception I could not settle without a render: `DESIGN_SYSTEM.md:52` ("Standard controls and panels use an 8px radius") versus the token scale in `src/app/globals.css:76,219-223` (`--radius: 0.375rem`, so Tailwind `rounded-lg` = 6px and `rounded-xl` = 9px, both used across the rebuilt board and calendar). That mismatch is global and older than this cluster, so I have not scored it.
- **`DESIGN_SYSTEM.md:66`** ("Empty states use the shared workflow-line illustration and concise guidance") has no counterpart in code — `grep -rn 'workflow-line' src/` is empty and the rebuilt empty states take a Lucide `icon` prop (`workspace-page/page-empty-state.tsx:35-42`, `precision-projects.tsx:1365` `FolderKanban`). I could not find the illustration in the repository's history either, so I cannot tell whether the rebuild removed it or the clause was always aspirational; reported here rather than as a finding.
