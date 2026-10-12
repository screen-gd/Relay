# 13 — LOW — Four items that are judgement calls, not contract breaches

These four came out of the audit but **no approved clause forbids them**. They are recorded so nobody
mistakes them for defects and "fixes" them silently. Each needs an owner decision first; if the decision
is to change them, turn that one into a ticket shaped like its siblings.

---

## 13a — The same destination is called "Reviews", "Feedback" and "Client review"

**Route:** `/feedback`, linked from the sidebar as "Reviews".

**Observed:** the rail link says "Reviews"; the page `h1` says "Feedback"; the breadcrumb reads
"Client review"; the route path is `/feedback`. Evidence: `renders/RELA-14/route-feedback-desktop.png`,
`renders/RELA-14/flow-sidebar-populated.png`.

**Why it is arguably wrong:** `docs/design/system/typography.md` says "route titles must match the page"
and `navigation.md` requires active state to survive direct deep links, which assumes one name per
destination. Three names for one route makes the destination ambiguous in speech, in support replies and
in search.

**Decision needed:** pick one word and apply it to the nav label, the `h1`, the breadcrumb and the
document title. "Reviews" fits the file name `docs/design/features/media-reviews.md`; "Feedback" fits the
path. Whichever wins, the other two must change — including the `G` chord label in the command palette.

**Effort:** small. **Risk:** low, but it changes user-visible copy, so the owner should choose the word.

---

## 13b — Breadcrumbs appear on some routes and not others

**Present:** `/profile/edit` ("Workspace / Profile"), `/resources`, `/templates`, `/integrations`,
`/team`, `/account`, `/organization`, `/subscription`.
**Absent:** `/clients`, `/files`, `/feedback`, `/calendar`, `/media`, `/projects`.

**Why it is arguably wrong:** `docs/design/system/navigation.md` puts a "Context row: breadcrumb/project,
view switcher, filters, saved views" in the shell anatomy, and `docs/design/system/layout.md` requires a
page header on every page. Half the routes omit it, so a user's sense of place depends on which route they
landed on. Evidence: `renders/RELA-14/route-resources-desktop.png` versus
`renders/RELA-14/route-clients-desktop.png`.

**Decision needed:** is the breadcrumb part of the page header everywhere, or is it deliberately on
"settings-like" pages only? If everywhere, add it to the six missing routes and check that a deep link
into a project (`/projects/[projectId]`, which builds its own breadcrumb) still reads correctly.

**Effort:** small per route. **Risk:** low, but it changes six page headers — look at 390px and 200% zoom
afterwards.

---

## 13c — The board needs horizontal scrolling to show all four columns at 1440px

**Route:** `/projects?view=board` at 1440x900, four stages.

**Observed:** scroller `clientWidth 1013` versus `scrollWidth 1180` with four 280px columns. The fourth
column — the one a card gets dragged _into_ — starts off-screen. Evidence:
`renders/RELA-14/board-desktop-initial.png`, `renders/RELA-14/board-desktop-scrolled.png`.

**Why it is arguably wrong:** `docs/design/system/responsive.md` explicitly permits "bounded horizontal
scroll for data that cannot reflow", so this is allowed. But four columns is not data that cannot reflow,
and the destination of the primary drag gesture is the hidden one.

**Decision needed:** accept the scroll (then close this), or make the board fit its container at ≥1280px
(flexible column widths, or a min-width per column that steps down). Do **not** simply shrink the columns
— `docs/design/system/spacing-density.md` sets a 24×24 CSS-pixel minimum pointer target, and compact mode
must not hide columns or actions.

**Effort:** medium if you make it fit. **Risk:** medium — the board has pointer _and_ keyboard drag
(`Space` to pick up, arrows to move, `Space` to drop, per the repo's own e2e test), so any width change
must be re-tested with the keyboard path.

---

## 13d — Team Chat leaves a large framed empty region with no explanation

**Route:** `/team-chat` in Local Mode.

**Observed:** a bordered panel runs from about `y=330` to `y=870` — roughly 60% of the viewport — with no
content, no message and no action. The sign-in card above it explains itself correctly. Evidence:
`renders/RELA-14/route-team-chat-desktop.png`.

**Why it is arguably wrong:** `docs/design/system/states-feedback.md` requires that "Empty states explain
why and give one next action". The sign-in card satisfies that; the empty pane below it does not, and it
reads as a rendering failure rather than a deliberate state.

**Decision needed:** is that pane the conversation list/stream that is intentionally blank before sign-in,
or a layout that should collapse when there is nothing to show? If intentional, it needs one sentence of
explanation. The cloud path could not be checked in this audit (no account, and the page states "Chat is
tied to your authenticated team workspace and is not available in local mode"), so confirm cloud behaviour
before changing it.

**Effort:** small. **Risk:** low.

---

## Not included, and why

- **Pagination for a 50-row projects table.** The audit measured 50 rows rendered with zero pagination
  controls, but no clause requires pagination, and the table's bounded scroll region keeps the page
  stable. Recorded in `reports/RELA-14.md` under improvements, not as a defect.
- **General dark-theme borders at `rgb(255 255 255 / 0.08)` (1.17:1).** `color-themes.md` does say "3:1
  non-text contrast, including borders", which would make every panel edge a defect — but panels also
  separate by fill (`--surface-panel` `#121212` against a `#000000` canvas), so the border is decoration
  rather than the identifying cue, and changing it globally would restyle the whole product. The one place
  the audit treats this as a real defect is the chart gridline (last step of ticket 07), where the line
  _is_ the information. If the owner wants the clause read strictly, that is a product-wide decision, not
  a ticket.
- **Muted text at 4.10–4.16:1.** Not a judgement call — that is ticket 07, because the clause is explicit
  about 4.5:1 text contrast.
