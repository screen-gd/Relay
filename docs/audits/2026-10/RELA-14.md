# RELA-14 — Relay UI audit: every route, driven at 1440x900, 390x844 and 200% zoom

Repository `screen-gd/relay`, `/workspace/relay`, HEAD `302d444`, branch `main`, working tree clean.
Audit only: no commits, no branches, no PRs, no source edits. `git status --short` is empty at the end
of this run. All findings below were produced in this thread on `deepseek/deepseek-v4.1-flash` (high).

**Model provenance.** Two GPT-model subagents were started at 12:04 before the crew's model rule reached
me (the thread was briefly on `openai/gpt-5.6-sol`). The person asked me to stop them at 12:09; they are
durably stopped and nothing they produced is used or cited here. Their 63 captures are parked, clearly
labelled, in `renders/RELA-14/unused-gpt-subagent-captures/`. Every screenshot this report references
came from my own Playwright runs.

---

## Outcome

32 route specs x 3 modes (1440x900, 390x844, 200% text zoom) = **96 route renders, 131 screenshots
total**, plus 21 interaction-flow renders, 4 board renders, 5 targeted contrast renders and 2 blocker
renders. Zero page errors on any route render. Every route returned 200 except the deliberately missing
`/route-that-does-not-exist`, which returns 404.

Relay's UI shell is in better shape than the count of findings suggests: the skip link works and is
focus-revealed, all 12 sampled keyboard stops show a visible 2px focus ring, the destructive delete
confirmation names exactly what is destroyed, empty states on Timeline/Clients/Files explain the next
action, and the calendar's day cells carry precise accessible labels ("October 8, 2026, 0 scheduled").
The defects cluster in three places: colour tokens that were never paired with their foreground, states
that are computed in one place and read in another, and small text that misses the 4.5:1 floor the
contract sets.

**Two things blocked and two things limited this run, stated up front:**

1. **The documented local setup produces a dead app.** With `.env.production` copied to `.env.local` as
   the brief instructs, every route renders the full workspace _underneath_ a full-viewport opaque
   overlay reading "Loading Relay…", because the committed Clerk publishable key is a live production
   key bound to `relay-app.cc.cd`, so `clerkLoaded` never becomes true. I re-measured this deliberately
   for the record (see issue 1). To audit anything I removed `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` from
   `.env.local` (gitignored; `.env.production`, `wrangler.jsonc` and every tracked file untouched).
   This is the same blocker RELA-16 reported as its gap 6, from the same cause; issue 1 below adds the
   UI measurement (overlay geometry, hover state, the fact the app renders behind it, and the exact
   console error) and is not a new claim.
2. **Cloud-only surfaces could not be exercised.** I have no account or credentials, and as RELA-16
   documented there is no obtainable plan. So the brief's _resolve and reopen a comment_, _publish a
   client portal link and open it_, and _build a salary plan to a batch_ were only reachable to the
   depth Local Mode and the read-only Sample Workspace allow. Concretely: comment threads live in
   `convex/mediaVersionComments.ts` (cloud), the Client Portal panel in Local Mode renders "Requires a
   cloud account", and the portal publish/open pair therefore has no Local Mode path. What I _could_
   drive in Local Mode — project outputs, a Media Version with a YouTube URL, the Client Review tab,
   the delivery confirmation, and the salary-batch preview — I did; results below.
3. **Sample-data limits.** Every project row, thumbnail and card on the workspace routes is my own
   seeded fixture (50 projects, one long client name, one long project title), because the empty
   workspace has no data and the sample workspace is read-only. Fixture shapes follow the repo's own
   `e2e/` fixtures.

---

## Findings, ranked by user impact

Severity uses the user consequence, not the code smell. Contract quotes are exact, with source file.

### 1. HIGH — Every screen is unusable behind a permanent full-viewport "Loading Relay…" overlay when Clerk does not resolve

**Route.** Any workspace route; reproduced on `/projects` at 1440x900 and 390x844.
**Repro.** `cp .env.production .env.local && pnpm dev:next`, open `http://localhost:3100/projects`,
wait 20s, click anywhere.
**Evidence.** `renders/RELA-14/blocked-clerk-overlay-desktop.png`, `blocked-clerk-overlay-mobile.png`.
Measured at 20s: `overlayPresent: true`, `overlayText: "Loading Relay…"`, overlay rect
`{x:0,y:0,width:1440,height:900}` (and `{0,0,390,844}` on mobile), `clerkLoaded: false`, and
`backgroundContentRendered: true` — the whole dashboard is painted underneath and covered. Console:

```
Clerk: Production Keys are only allowed for domain "relay-app.cc.cd".
API Error: The Request HTTP Origin header must be equal to or a subdomain of the requesting URL.
```

**Why it is wrong.** `src/features/workspace/workspace-runtime.tsx:140` renders
`{!isAuthLoaded ? <AppLoadingStatus /> : null}`, and `isAuthLoaded` is
`clerkLoaded && ready && …` (`src/lib/data-context.tsx:2569`). There is no timeout, no error state and
no retry, so a Clerk failure of any kind — outage, blocked CDN, corporate proxy, or the committed
production key on a local origin — leaves the product as a black rectangle with one line of text.
`docs/design/system/states-feedback.md` requires "**error**, success, and read-only states" for every
page and that "Recoverable errors retain user input and offer retry"; `overview.md` requires an `error`
state. The app has neither for the one failure that removes the entire UI.
I ruled out "no network" as the cause: Clerk's JS itself loads (HTTP 200 for
`clerk.relay-app.cc.cd/npm/@clerk/clerk-js@6.39.0/dist/clerk.browser.js`), and serving the app over
`https://relay-app.cc.cd` through a local TLS front removed the origin error from the console while the
overlay was still present after 12 s (`getByText("Loading Relay…").count() === 1`, only HMR websocket
errors logged) — so the gate is the domain/scheme binding of a production key, not reachability.
(Diagnostic only: the temporary `/etc/hosts` line and the port-443 proxy have both been removed.)
**Severity.** HIGH. New-user and developer impact is total: the app looks blank and nothing responds.

### 2. HIGH — The dashboard's only action, "Create first project", is white text on a white button (1:1)

**Route.** `/` with an empty workspace.
**Repro.** Local Mode, no projects, open `/`. The button at y=292 renders as a plain white bar.
**Evidence.** `renders/RELA-14/flow-empty-workspace-dashboard.png`,
`contrast-dashboard-first-run-cta.png`, `flow-empty-workspace-cta-hover.png`. Measured:
`color: rgb(255, 255, 255)`, `background-color: rgb(255, 255, 255)`, contrast ratio **1.0:1** where
4.5:1 is required for 16px text. On hover it stays **1.0:1** (`--app-highlight` is also `#ffffff` in
dark mode).
**Why it is wrong.** `src/components/first-run-checklist.tsx:63` hardcodes `text-white` next to
`bg-[var(--app-accent)]`, while dark mode defines `--app-accent: #ffffff` with a paired
`--app-accent-foreground: #000000` (`src/app/globals.css:139-140`) that this button ignores. The
sibling button in `src/components/precision-dashboard.tsx:1313` does it correctly with
`text-[var(--app-accent-foreground)]`, so the codebase already knows the right pattern.
`docs/design/system/color-themes.md` (Accessibility) requires "4.5:1 text contrast". This is the first
control a brand-new user is asked to press, and its label is invisible.
**Severity.** HIGH.

### 3. HIGH — The recovery button on the 404 and error pages is white on white (1:1)

**Route.** `/route-that-does-not-exist`; same treatment in `src/app/error.tsx`.
**Repro.** Open a missing route; the card's only action is a blank white rectangle.
**Evidence.** `renders/RELA-14/route-not-found-desktop.png`, `contrast-not-found-back-cta.png`.
Measured on the anchor: `color: rgb(255,255,255)`, background `rgb(255,255,255)`, ratio **1.0:1**, 14px.
**Why it is wrong.** `src/app/not-found.tsx:38` uses
`bg-[var(--app-highlight)] text-white hover:bg-[var(--app-accent)]`; in dark mode both variables are
`#ffffff`, so the label is invisible in the default and hover states. `docs/design/features/access-support.md`
lists "recovery links" as preserved behaviour and requires a "focus on recovery message" — the
recovery control exists, is focusable, and has no readable label. Same 4.5:1 clause as issue 2.
**Severity.** HIGH.

### 4. HIGH — Project thumbnails show fabricated clip runtimes on projects that have no media, and describe them to screen readers as a "video thumbnail"

**Routes.** `/projects` (table and board), `/media` package cards, project inspector
(`/projects/[projectId]`), dashboard project table.
**Repro.** Seed any project with no outputs and no media version, open `/projects?view=table`. Each row
shows a badge such as `08:34`, `03:52`, `07:34`.
**Evidence.** `renders/RELA-14/route-projects-desktop.png`, `route-media-desktop.png`,
`flow-projects-table-50.png`. Values are stable per project title and change when the title changes —
proving they are derived, not stored.
**Why it is wrong.** `src/components/precision-projects.tsx:238` computes
`projectDuration()` as `1 + hash % 11` minutes and `hash % 60` seconds from the title hash, and
`:283` renders it as a runtime badge inside a `role="img"` whose accessible name is
`"${project.title} video thumbnail"`. The project has no video and no version. An editor scanning the
"50 records" table reads invented durations as production facts, and a screen-reader user is told a
video thumbnail exists. `docs/design/features/media-reviews.md` (Accessibility) requires thumbnails to
"expose version and review status as text" and to "Give thumbnails alt text or a **useful** title";
`states-feedback.md` requires status that "is understandable without color" — not status that is
invented. The same decorative-avatar pattern would be fine without the number and the "video" claim.
**Severity.** HIGH — it is fabricated data presented as measurement, on the primary index of the product.

### 5. HIGH — On /profile/edit the _selected_ week-start day is the least visible option (1.12:1)

**Route.** `/profile/edit`, "Week Start Day".
**Repro.** Open `/profile/edit`, look at the day row near the bottom: `Mon` is the active chip.
**Evidence.** `renders/RELA-14/profile-edit-availability.png`, `contrast-profile-edit-day-chip.png`.
Measured on the selected chip: `color: rgb(0,0,0)`, effective background `rgb(17,17,17)`,
ratio **1.12:1**; the chip has no border (`border-top-color: rgba(255,255,255,0.08)`) while every
unselected chip has a visible border and light text.
**Why it is wrong.** `docs/design/system/overview.md` requires every control to define a `selected`
state, and `spacing-density.md` requires that "**Selected** and focused rows retain enough inset and
contrast in both density modes". Here the selected state inverts: the control a user is trying to read
is the only one they cannot. In the screenshot the row reads as six chips plus a stray word.
**Severity.** HIGH for the control; it is a settings-level surface, hence not rank 1.

### 6. HIGH — Delivery says "Payment plan progress: 1/5" and every money surface then reads 0

**Route.** `/projects?view=board` → stage menu → Delivered → confirm; then `/` and `/reports`.
**Repro.** Local Mode with one project whose `workType` is `Job / Salary` (fixture from `e2e/`):
board view → "Change stage for …" → Delivered → confirm.
**Evidence.** `renders/RELA-14/flow-salary-after-delivery.png`, `flow-reports-after-delivery.png`.
Captured in one session:

```
CONFIRM  Mark Flow project as Delivered? Relay will record the delivery time.
         This moves the current Payment batch to 1/5 Projects toward $10,000.
TOAST    Flow project delivered. Payment plan progress: 1/5.
STORED   project.status="Delivered", completedAt="2026-10-12T12:29:28.730Z", earnings=500,
         salary-batches:v1 = null
DASHBOARD  ... Paid $0 $0 unpaid  Salary batch 0 / 5 edits  Mark paid  0%
REPORTS    Earned $0   Paid $0   Unpaid $0   Delivered edits 0   0 salary edits
           Payment batches 0 batches
```

**Why it is wrong.** The confirmation and the toast are computed from `preview.progress` in
`src/features/projects/project-controller.ts:88-95`, and they tell the user the batch moved to 1/5. The
write records `status`, `completedAt` and `earnings` but creates no salary-batch record
(`salary-batches:v1` stays `null`), and the surfaces that report money — the dashboard salary module
(`src/components/precision-dashboard.tsx`, `salaryEdits`/`salaryBatchProgress`) and `/reports`
(`earned`, `delivered`, `Payment batches`) — still read zero. So the app asserts a progress change and
then contradicts itself, in the module whose whole purpose is tracking what a user is owed.
`docs/design/features/reports.md` requires that metrics, payout calculations and paid/outstanding
batches be preserved; `dashboard.md` requires salary progress. **Caveat, stated plainly:** this is
Local Mode with a seeded project, and a cloud workspace may compute the batch through the Convex path
instead — I could not test that without an account. The part that does not depend on cloud is the
self-contradiction: the same app derived 1/5 for the dialog and 0/5 for the dashboard from the same
record. Anyone can re-run the repro above and see both numbers.
**Severity.** HIGH. Money reporting that silently disagrees with its own confirmation is the kind of
defect that ends up in an invoice.

### 7. MEDIUM — Muted text misses the 4.5:1 floor in 26 places, including every table header

**Routes.** 31 of 32 audited routes.
**Repro.** Any workspace route; see the headers on `/projects`, the breadcrumb, the shortcut hint, the
timeline axis.
**Evidence.** `renders/RELA-14/route-projects-desktop.png`, `route-timeline-desktop.png`,
`flow-projects-table-50.png`; measured across all routes with the background composited properly:
`rgb(113,113,122)` on `rgb(10,10,10)` = **4.10:1** at 9–12px, and on `rgb(18,18,18)` = **3.88:1** at
10px. Affected text includes the breadcrumb "Relay", the "Ctrl K" hint, every project table header
(NAME/CLIENT/STAGE/DUE/PAYMENT/SALARY), inspector field labels (PACKAGE TYPE / PROJECT NOTE /
PROGRESS), media "Collections"/"Package type", and the timeline axis labels "Expected"/"Delivered".
**Why it is wrong.** `docs/design/system/color-themes.md` (Accessibility): "Meet 4.5:1 text contrast
and 3:1 non-text contrast". These are all below it, and the small ones are the labels a user needs to
interpret dense data. (I excluded every `lab()`/`oklab()` colour from this count because my colour
resolver cannot normalise them; the true count is likely higher, not lower.)
**Severity.** MEDIUM — pervasive and checkable, low drama per instance.

### 8. MEDIUM — The accent colour control stores a value that no surface applies

**Route.** `/settings` → Appearance → Accent Color.
**Repro.** Open `/settings`, switch to the Appearance section, select a different accent swatch, then
read `getComputedStyle(document.documentElement).getPropertyValue('--app-accent')`.
**Evidence.** `renders/RELA-14/settings-appearance-accent.png`. Runtime measurement in one session:
before `--app-accent: #fff`, stored `accentColor: null`; after clicking a swatch,
`--app-accent: #fff` (unchanged) while `settings.accentColor` became `#27272A`.
**Why it is wrong.** `docs/design/system/color-themes.md` (Behavior): "Runtime theme code sets the
light or dark class and **may override only `--app-accent`** and its contrast-safe foreground", and
`docs/design/features/integrations-settings.md` lists "theme/accent/density/date/currency" as
preserved behaviour with acceptance "Load/save/reset … theme-before-hydration". The setting is
persisted and never rendered: `grep -rn "setProperty" src` returns no matches, and `settings.accentColor`
is read nowhere outside the settings write and client-portal branding. The user picks a colour and
nothing changes. This also means a user cannot pick a contrast-safe accent for themselves.
**Severity.** MEDIUM.

### 9. MEDIUM — Directly against the contract, `/settings` scrolls the whole page sideways at 390px

**Route.** `/settings` at 390x844.
**Repro.** Open `/settings` at 390px width; the document is 434px wide.
**Evidence.** `renders/RELA-14/route-settings-mobile.png` (cards clipped at the right edge); measured
`documentElement.scrollWidth 434` vs `clientWidth 390` = **44px page-level overflow**, and the
offending element is an `input` with `width: 390px` starting at `x: 44` (`right: 434`). `/projects`,
`/clients`, `/feedback` and `/media` measured 0 overflow at the same width.
**Why it is wrong.** `docs/design/system/responsive.md` (Acceptance checks): "**No accidental
page-level horizontal scroll below 400px**". The same page also measurably overflows at 200% zoom on
the same element class, so the bug has one cause with two triggers.
**Severity.** MEDIUM — a phone user gets a page that drifts sideways while filling a form.

### 10. MEDIUM — The sidebar exposes 13 destinations and omits Team

**Route.** All workspace routes.
**Repro.** Open any workspace route and read the rail's links.
**Evidence.** `renders/RELA-14/flow-sidebar-populated.png`; extracted `aside a` hrefs: `/`, `/calendar`,
`/timeline`, `/projects`, `/clients`, `/feedback`, `/files`, `/media`, `/templates`, `/resources`,
`/integrations`, `/reports`, `/settings` (plus a separate "Support and legal" group).
**Why it is wrong.** `docs/design/DESIGN_SYSTEM.md` (Navigation): "The desktop sidebar contains only
primary product hubs: Dashboard, Projects, Clients, Library, Reports, Team, Settings. Related
destinations remain addressable routes but appear as contextual navigation inside their parent hub.
This keeps deep links intact while **reducing sidebar clutter**." `docs/design/system/navigation.md`
repeats the list. The shipped rail inlines eight secondary destinations (Calendar, Timeline, Reviews,
Files, Media, Templates, Resources, Integrations) and never shows Team. Each link has an `aria-label`,
so the accessible-name clause in `components.md` is met — the contract breach is the structure.
**Severity.** MEDIUM.

### 11. MEDIUM — `/` and `/sample-studio` have no h1 at all

**Routes.** `/`, `/sample-studio`.
**Repro.** Open either route and count headings.
**Evidence.** `renders/RELA-14/route-dashboard-desktop.png`, `route-sample-studio-desktop.png`; for both,
the visible-h1 list is empty and the first headings are `h2`: "Needs attention", "Projects",
"Activity". Every other route has exactly one h1 (Projects, Reports, Media, Calendar, Timeline,
Clients, Feedback, Files, Resources, Templates, Integrations, Team, Settings, Account, Organization,
Plans and billing, Edit Profile, Privacy, Terms, Contact, Accessibility, Sample Studio project).
**Why it is wrong.** `docs/design/system/layout.md`: "Keep one useful `h1` per route" and (Acceptance)
"Each page uses an approved layout pattern and unique title/h1"; `typography.md`: "route titles must
match the page"; `accessibility.md`: "Announce route title then h1". A screen-reader user landing on the
dashboard hears no page title.
**Severity.** MEDIUM.

### 12. MEDIUM — The calendar has no grid semantics and no arrow-key movement; reaching a day costs 35 tab stops

**Route.** `/calendar`.
**Repro.** Focus the month grid and press the arrow keys; Tab through the month instead.
**Evidence.** `renders/RELA-14/route-calendar-desktop.png`. Measured on the month view: 35 day buttons,
`role` counts on the page = `{heading:3, none:2, presentation:1, tablist:1, tab:3, tabpanel:1}` — no
`grid`, `row` or `gridcell`; `document.querySelectorAll('table').length === 0`; **0** day buttons carry
`tabindex="0"` and none carry `aria-selected`. The structure is
`div.grid-cols-7 > button`. The good news is real: each day button has a precise label
(`aria-label="October 8, 2026, 0 scheduled"`), and the selected day does carry `aria-current`.
**Why it is wrong.** `docs/design/features/calendar-timeline.md` (Accessibility): "Use calendar **grid
semantics** with labeled dates, **keyboard movement**, selected-day announcement". Labels and
announcement are met; grid semantics and movement are not. A keyboard user must Tab 35 times per month
and gets no positional context. Also relevant: the same clause says "Do not rely on color for delivery
status" — in the grid an entry's status is a coloured dot plus the title, with the status word only
appearing in the side panel.
**Severity.** MEDIUM.

### 13. LOW — The same destination is called "Reviews", "Feedback" and "Client review"

**Route.** `/feedback`, linked from the sidebar as "Reviews".
**Repro.** Click "Reviews" in the rail; the page h1 is "Feedback" and the breadcrumb is "Client review".
**Evidence.** `renders/RELA-14/route-feedback-desktop.png`, `flow-sidebar-populated.png`.
**Why it is wrong.** `docs/design/system/typography.md`: "route titles must match the page";
`navigation.md` requires the active state to survive direct deep links, which assumes one name per
destination. Three names for one route makes a deep link ambiguous in speech, search and support.
**Severity.** LOW.

### 14. LOW — Breadcrumbs appear on some routes and not others

**Routes.** Present: `/profile/edit` ("Workspace / Profile"), `/resources`, `/templates`,
`/integrations`, `/team`, `/account`, `/organization`, `/subscription`. Absent: `/clients`, `/files`,
`/feedback`, `/calendar`, `/media`, `/projects`.
**Evidence.** `renders/RELA-14/route-resources-desktop.png` versus `route-clients-desktop.png`; the
page text of each route captured in the same run.
**Why it is wrong.** `docs/design/system/navigation.md` (Anatomy) makes the "Context row:
breadcrumb/project, view switcher, filters, saved views" part of the shell, and `layout.md` requires a
page header on every page. Half the routes omit it, so a user's sense of "where am I" depends on which
route they landed on. Judgement call — the contract does not say "every route shows a breadcrumb".
**Severity.** LOW. _Usability judgement._

### 15. LOW — The board needs horizontal scrolling to show all four stages at 1440px

**Route.** `/projects?view=board` at 1440x900.
**Repro.** Open the board with four stages; the fourth column ("Delivered") starts off-screen.
**Evidence.** `renders/RELA-14/board-desktop-initial.png`, `board-desktop-scrolled.png`. Measured
scroller `clientWidth 1013` vs `scrollWidth 1180` with four 280px columns on a 1440px viewport.
**Why it is wrong.** `docs/design/system/responsive.md` permits "bounded horizontal scroll for data
that cannot reflow", so this is allowed rather than forbidden — but four columns is not data that
cannot reflow, and the column a user moves cards _into_ is the one they cannot see. _Usability
judgement_, no clause forbids it.
**Severity.** LOW.

### 16. LOW — Team Chat leaves a large framed empty region with no explanation

**Route.** `/team-chat`.
**Repro.** Open `/team-chat` in Local Mode.
**Evidence.** `renders/RELA-14/route-team-chat-desktop.png`: a bordered panel runs from about y=330 to
y=870, roughly 60% of the viewport, with no content and no message. The sign-in card above it does
explain itself.
**Why it is wrong.** `docs/design/system/states-feedback.md` (Behavior): "Empty states explain why and
give one next action". The sign-in card satisfies that; the empty pane below it does not, and it reads
as a rendering failure. _Usability judgement_ on the pane, contract clause on the principle.
**Severity.** LOW.

---

## Things that pass, so the sweep is legible

- **Skip link**: present, revealed on focus, targets `#main-content`, and `#main-content` exists on every
  route including 404 (`main#main-content` measured on `/route-that-does-not-exist`).
- **Focus visibility**: 12 of 12 sampled Tab stops showed `outline: solid 2px rgb(255,255,255)`, meeting
  `spacing-density.md`'s "visible focus of 2px or more". Screenshot: `flow-keyboard-focus.png`.
- **Destructive confirmation**: row menu → "Permanently delete (Owner only)" → alert dialog
  "Permanently deleting Audit project 1 removes its files, versions, client portal, and Activity
  history. This cannot be undone." with Cancel/Delete. `flow-row-actions-menu.png`, `flow-delete-confirm.png`.
- **Command palette**: opens by click and Ctrl+K, 20 options, first is "Create new project", options show
  the "G D" chords. `flow-command-palette.png`.
- **Empty states with a next action**: `/timeline` ("No timeline milestones yet. Projects with due dates
  will appear here."), `/files` ("Files will appear here after they are added to a Project."), `/clients`
  ("Add your first client"), `/projects` (`flow-projects-empty.png`).
- **Portal and profile failure states**: `/client-portal/expired-audit-token` renders "Portal link
  unavailable — This link is invalid or no longer available. Ask your editor for a new link.";
  `/u/audit-editor` renders "Profile not found". Both have one h1 and an explanatory sentence.
  `route-client-portal-token-desktop.png`, `route-public-profile-desktop.png`.
- **Media version add in Local Mode**: adding a YouTube version to "Main film" produced
  "Current: Client cut", "Version 1 · YouTube", "Review history 0 comments". `flow-media-version-added.png`.
- **Table density**: 50 rows rendered in one bounded scroll region with a sticky header, no page-level
  overflow, sort/filter controls present. `flow-projects-table-50.png`.
- **No route produced a page error** across 96 renders, and only `/settings` produced page-level
  overflow.

---

## Coverage

| Dimension                                            | Count                                                                                                    |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Route specs audited                                  | 32 (the brief's full route list, plus a deliberate 404)                                                  |
| Modes per route                                      | 3 — 1440x900, 390x844, 200% text zoom                                                                    |
| Route renders                                        | 96 (`renders/RELA-14/route-*.png`)                                                                       |
| Interaction-flow renders                             | 21 (`flow-*.png`)                                                                                        |
| Targeted contrast renders                            | 5 (`contrast-*.png`)                                                                                     |
| Board renders (mobile + desktop, initial + scrolled) | 4 (`board-*.png`)                                                                                        |
| Blocker renders                                      | 2 (`blocked-clerk-overlay-*.png`)                                                                        |
| Other targeted renders                               | 3 (`profile-edit-availability.png`, `settings-appearance-accent.png`, `probe-dashboard-one-project.png`) |
| **Total in `renders/RELA-14/`**                      | **131**                                                                                                  |
| Parked, unused subagent captures                     | 63, in `renders/RELA-14/unused-gpt-subagent-captures/`                                                   |

**Interactions exercised, not just page loads:** local workspace (empty, 1 project, 5, 12, 20 and 50
projects), add client, project create dialog including inline "Create new Client", board view and stage
menu, Delivered confirmation and toast, row action menu and permanent-delete confirmation, project
inspector, project tabs (Overview / Outputs and Versions / Client Review), Media Version add, command
palette, mobile navigation sheet (13 links), mobile board, keyboard tab order at 12 stops, 200% text
zoom on three dense routes, calendar month view and view tabs, settings sections including Appearance,
accent selection, `/reports` CSV control presence, and the sample-studio read-only marker.

**Stress cases exercised:** 50 projects in one table; an 80-character client name and a 121-character
project title in table, board, inspector and dashboard; a project with no outputs; an empty workspace; a
workspace with no clients; a table with one row; an invalid/expired portal token; an unpublished public
slug; a missing route.

**Routes covered by the sweep:** `/`, `/projects`, `/projects/[projectId]`, `/calendar`, `/timeline`,
`/clients`, `/feedback`, `/files`, `/media`, `/resources`, `/templates`, `/integrations`, `/team`,
`/team-chat`, `/reports`, `/settings`, `/account`, `/organization`, `/profile`, `/profile/edit`,
`/subscription`, `/client-portal`, `/client-portal/[token]`, `/client-hub`, `/u/[slug]`,
`/sample-studio`, `/sample-studio/projects/[projectId]`, `/privacy`, `/terms`, `/contact`,
`/accessibility`, plus a deliberate 404.

---

## Improvements I would argue for

1. **Give the loading gate a failure state.** Issue 1 is a two-line change with a large payoff: an
   8-second timeout in `workspace-runtime.tsx` that swaps `AppLoadingStatus` for an error panel with
   "Retry" and a link to `/access`, plus surfacing the Clerk error text. That converts a dead product
   into a diagnosable one for every offline, proxied and self-hosted user.
2. **Retire `text-white` on accent surfaces.** Issues 2 and 3 are the same mistake in three files
   (`first-run-checklist.tsx:63`, `not-found.tsx:38`, `error.tsx:50`). Using
   `text-[var(--app-accent-foreground)]`, as `precision-dashboard.tsx:1313` already does, fixes all
   three and makes the buttons follow a user's accent. Worth a lint rule or a `Button` variant so the
   pairing cannot be broken again — `components.md` already asks for semantic variants and forbids raw
   colour constants in feature code.
3. **Delete `projectDuration()` and make thumbnails honest.** Issue 4 has no fix that keeps the badge:
   either render real durations from media versions (and say "no media" when there are none), or drop
   the number and set the accessible name to the project title. `role="img"` should be reserved for
   thumbnails that actually depict a video.
4. **Make the selected state carry contrast, once.** Issue 5 is one class on one control, but the
   pattern will repeat anywhere a chip uses the accent foreground on a subtle surface. A review pass
   over `aria-pressed`/`selected` chips against the `selected` clause in `overview.md` would catch the
   family.
5. **Reconcile the money surfaces with their own preview.** Issue 6 wants one function that answers
   "what does delivering this project change?", used by the confirmation, the toast, the dashboard
   salary module and `/reports` alike. The current split — `preview.progress` in the controller versus
   `salaryEdits` in the dashboard — is how the two numbers drifted apart.
6. **Treat the muted token as a two-tier scale.** Issue 7 is not a one-off: 9–12px labels on near-black
   need a lighter token (about `#9a9aa3` clears 4.5:1 on `#0a0a0a`) or a minimum size. Doing this once
   in `globals.css` fixes 26 measured instances.
7. **Wire the accent setting or remove the control.** Issue 8: `applyRootThemeVariables` is the natural
   home; it already runs on every settings change and already writes `data-theme`. Setting
   `--app-accent` and its contrast-safe foreground there also gives users a remedy for issues 2 and 3.
8. **Add pagination or a virtualised window to the projects table.** 50 records render in one scroll
   region with no page-size control (`projects-pagination-controls: 0` measured). The contract does not
   demand pagination, but the dashboard's project module already truncates to 5 with "View all", so the
   product has a pattern to follow. _Judgement, not a contract breach._
9. **Make the calendar a grid with roving tabindex.** Issue 12: `role="grid"`/`gridcell`, one tab stop
   per grid, arrow keys to move the selection, and a status word inside each entry so delivery state
   stops being dot-only.
10. **Pick one name for the review route.** Issue 13: pick "Reviews" and rename the h1 and breadcrumb, or
    rename the nav label to "Feedback". Deep links, support replies and search all read better with one.

---

## Agent-ready fix tickets

The 12 fixable defects are written up as self-contained work items for an implementing agent in
`handoffs/RELA-14-ui-issues/` (index: `handoffs/RELA-14-ui-issues/README.md`). Each carries severity, the
exact contract clause, `file:line` anchors re-verified at `302d444`, a runnable repro, the evidence
screenshot, a fix direction and acceptance criteria. Four items that are usability opinions rather than
contract breaches are isolated in `13-judgement-calls.md` so nobody "fixes" them silently. They live under
`handoffs/` because they are meant for another thread; this file stays the audit report.

## PR

None. This is an audit thread; no repository state was changed. Verified at the end of the run:

```
$ cd /workspace/relay && git status --short
(empty)
```

The only file I touched outside the repository is `.env.local` (gitignored), and it currently holds
`.env.production` minus `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` so the app boots in Local Mode. Restore it
with `cp .env.production .env.local` to reproduce issue 1.

## Needs

- **A decision on issue 1.** Fixing the loading gate is a code change in a repository this thread must
  not modify. If you want it fixed, it needs a thread with a write brief.
- **Credentials to close the coverage gap.** An account on a workspace with a paid plan would let the
  next thread exercise the flows I could not: comment resolve/reopen, portal publish/open with PIN and
  expiry, Client Hub published projects, and cloud salary batches. That is also the only way to confirm
  whether issue 6 is a Local Mode artifact or a real accounting defect.
- **A re-run of the money repro by someone with cloud access** (`/projects` → stage menu → Delivered on a
  `Job / Salary` project) before issue 6 is treated as product behaviour.

## Cost

Two hours of wall clock on one machine, one dev server, 131 screenshots, four Playwright programs
(`route-audit`, `contrast2`, `flow-audit`, `final`/`verify`/`salary`), plus three subagents that ran for
about five minutes before I stopped them and whose output is unused. The Playwright programs
(`route-audit.cjs`, `contrast2.cjs`, `flow-audit.cjs`, `final.cjs`, `verify.cjs`, `salary.cjs`) lived in
`~/.capy/work/RELA-14/` on the cloud machine and did **not** survive the move to this device, which kept
only tracked files; the JSON evidence (`route-report.json`, `contrast2-scan.json`) went with them. The
repro steps inside each fix ticket are written to be re-runnable without those scripts, and this report
quotes every number they produced.

## Lesson

Same lesson as RELA-16, reached independently and worth recording in the crew's procedures: **the
repo's own `e2e/helpers.ts` `openApp()` waits for a string that no longer exists** — `getByText("Loading
workspace", { exact: true })` — and `grep -rn "Loading workspace" src` returns only
`src/components/precision-files.tsx:66` "Loading workspace files…", which the exact match does not
match. `expect(locator).toBeHidden()` against a locator that matches nothing passes immediately, so
`openApp()` returns while the page is still covered by the "Loading Relay…" overlay. **Scope of this
claim:** I read the helper, grepped the string, and confirmed Playwright's pass-on-zero-matches
behaviour by watching the overlay stay up in my own runs; I did **not** run the full `pnpm test:e2e`
suite in this environment (I cancelled that run when the audit brief changed), so I am not claiming the
suite green or red. What does follow from the evidence: the helper cannot detect issue 1, and
`scripts/verify-browser-smoke.mjs` only asserts HTTP 200 plus layout and keyboard entry, none of which
the overlay prevents. For a UI audit, the first check must be that the page is _readable_, not that it
returned 200: assert that no full-viewport `[role="status"]` overlay is present before believing any
other assertion.
