# 10 — MEDIUM — The sidebar carries 13 destinations and never shows Team

**Impact:** the rail is a flat list of thirteen unlabelled icons. A user cannot tell Files from Media from
Templates from Resources from Integrations without hovering each one, and there is no Team entry at all —
so team management is only reachable by typing the URL or using the command palette.

## Contract clauses

- `docs/design/DESIGN_SYSTEM.md` (Navigation) — "The desktop sidebar contains only primary product hubs:
  Dashboard, Projects, Clients, Library, Reports, Team, Settings. Related destinations remain addressable
  routes but appear as contextual navigation inside their parent hub. This keeps deep links intact while
  reducing sidebar clutter."
- `docs/design/system/navigation.md` (Anatomy) — "Desktop sidebar: Dashboard, Projects, Clients, Library,
  Reports, Team, Settings."
- `docs/design/system/navigation.md` (Preserved features) — "Keep existing hrefs, grouped navigation, `G`
  route chords, command dialog, account menu, notifications, and sample-mode marker."

## Measured evidence

`aside a` on `/` with a populated workspace — 13 product destinations (plus Contact, Privacy, Terms and
Accessibility in a separate nav labelled "Support and legal"):

```
/            Dashboard        /templates     Templates
/calendar    Calendar         /resources     Resources
/timeline    Timeline         /integrations  Integrations
/projects    Projects         /reports       Reports
/clients     Clients          /settings      Settings
/feedback    Reviews
/files       Files
/media       Media
```

No `/team` link. Every link does carry an `aria-label`, so `docs/design/system/components.md`'s "Every
icon-only control has an accessible name" is satisfied — the breach is the structure, not the labels.

Evidence: `renders/RELA-14/flow-sidebar-populated.png`; link inventory read from the DOM in the same run.
Compare `renders/RELA-14/route-dashboard-desktop.png` and `route-settings-mobile.png`.

## Notes before you change anything

- The empty-workspace state deliberately shows a slimmer "starter" rail
  (`workspace-runtime.tsx:115` passes `starterNavigation={!sample && personalProjects.length === 0}`),
  which renders Dashboard / Calendar / Projects / Reviews / Settings. That is a legitimate variant — fix
  the populated rail, and keep the starter variant coherent with whatever structure you choose.
- A "Library" hub does not exist as a route today; Files, Media, Templates and Resources are separate
  routes. The contract names Library as a hub, so either (a) make Library a hub that groups those four as
  contextual navigation inside it, or (b) propose an amendment to the contract. Do not invent a route and
  pretend it satisfies the clause — if you take (b), say so on this ticket with the reason.
- The mobile navigation sheet already lists Timeline, Reviews, Files, Media, Templates, Resources,
  Integrations, Reports, Settings, Contact, Privacy, Terms and Accessibility — 13 links
  (`renders/RELA-14/flow-mobile-nav-sheet.png`), so the same question applies there.

## Fix direction

1. Reduce the desktop rail to the seven hubs. Keep every route addressable — remove the _links_, not the
   routes.
2. Put the demoted destinations where the contract says they belong: Calendar and Timeline under Projects
   or the calendar surface, Reviews under Projects, Files/Media/Templates/Resources under Library,
   Integrations under Settings. `docs/design/system/navigation.md` names "tabs for same-context panels"
   and "menu buttons for actions" as the mechanisms, so a hub landing page or a context row is the
   natural home.
3. Add Team to the rail. Today it appears only under `showTeamNavigation` in `workspace-runtime.tsx`,
   which requires more than one active member, a pending invite, or stored members — so a solo user can
   never reach it, while the contract lists it as a hub unconditionally.
4. Keep the `G` route chords and the command palette working for every demoted route; that is the escape
   hatch that keeps deep links usable.

## Acceptance criteria

- The desktop rail shows the seven named hubs, each with an accessible name, and no secondary destination.
- `/team` is reachable from the rail for a user with no team members.
- Every route that existed before is still reachable: from its hub, from the command palette, and by
  direct URL.
- Active state (`aria-current="page"`) still tracks the current route, including a demoted route reached
  inside its parent hub.
- The mobile sheet's structure matches whatever the desktop rail now implies.

## Out of scope

Do not change the routes, redirects or permissions. Do not restyle the rail's icons or the top bar. Do not
remove the "Support and legal" grouped navigation.
