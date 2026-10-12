# 11 — MEDIUM — `/` and `/sample-studio` have no `h1`

**Impact:** the two entry screens of the product — the workspace dashboard and the demo studio — have no
page title in the document outline. A screen-reader user landing on either hears section headings
("Needs attention", "Projects", "Activity") with no indication of what page they are on.

## Contract clauses

- `docs/design/system/layout.md` — "Keep one useful `h1` per route." Acceptance checks: "Each page uses an
  approved layout pattern and **unique title/h1**."
- `docs/design/system/typography.md` (Accessibility) — "Headings must form a useful outline and route
  titles must match the page."
- `docs/design/system/accessibility.md` (Behavior) — "**Announce route title then h1.**"

## Measured evidence

For `/` and `/sample-studio` the list of **visible** `h1` elements is empty, and the first headings in the
outline are `h2`:

```
/              h1: []   h2: ["Needs attention", "Projects", "Activity"]
/sample-studio h1: []   h2: ["Needs attention", "Projects", "Activity"]
/projects      h1: ["Projects"]        <- correct, for comparison
/reports       h1: ["Reports"]
/media         h1: ["Media"]
```

Every other audited route has exactly one `h1` (Projects, Reports, Media, Calendar, Timeline, Clients,
Feedback, Files, Resources, Templates, Integrations, Team, Team Chat, Settings, Account, Organization,
Plans and billing, Edit Profile, Privacy, Terms, Contact, Accessibility, the sample project detail, and
even the 404 "Page not found").

Evidence: `renders/RELA-14/route-dashboard-desktop.png`,
`renders/RELA-14/route-sample-studio-desktop.png`.

## Fix direction

1. Give both routes one `h1` that names the page. The dashboard's populated state and its empty state
   (`src/components/first-run-checklist.tsx:52-57`, which already renders
   `<h1 id="first-run-title">Turn one active edit into a clear production plan</h1>`) must not both render
   an `h1` at once — check the empty-versus-populated branch so exactly one exists in each state.
2. Decide what the dashboard's title is. "Dashboard" is what the sidebar, the breadcrumb
   ("Current location: Dashboard") and the route parameter already call it, so a visually-hidden
   `<h1>Dashboard</h1>` matching the breadcrumb is the low-risk choice; a visible page heading is a design
   decision for the owner.
3. Do the same for `/sample-studio` — its breadcrumb reads "Sample studio", so keep the words consistent
   with the breadcrumb and the sample-mode bar.
4. `document.title` already differs per route (`Relay | Video Production Workspace for Editors`,
   `Sample Studio | Relay`), so no change is needed there; the gap is the `h1` only.

## Acceptance criteria

- `/` has exactly one `h1` in both the empty and the populated state
  (`document.querySelectorAll('h1').length === 1`, visible or intentionally `sr-only`).
- `/sample-studio` has exactly one `h1`.
- The `h1` text matches the route's breadcrumb/nav name.
- An automated heading-outline check over all routes reports no missing and no duplicate `h1`.
- No route's visual layout shifts as a result (if the `h1` is `sr-only`, that is fine).

## Out of scope

Do not renumber the dashboard's section `h2`s. Do not add `h1`s to the public legal pages — they already
have them.
