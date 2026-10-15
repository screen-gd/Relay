# Navigation

## Purpose

Let users move among work areas, current context, saved views, and actions without losing place.

## Anatomy

Desktop sidebar: Dashboard, Projects, Clients, Reviews, Payments, Team, Settings. It has two columns, as in ChatGPT and Codex: a 56px icon rail with one icon per hub and a tooltip, and a 248px panel that is open by default and closes to the rail with the toggle in its header (remembered on the device). The panel shows the current hub's name, a New project action, the hub's pages (Overview first, then Calendar, Timeline, Files, Media for Projects; Team chat for Team; Integrations, Templates, Resources for Settings), recent Projects, and the support links. The context tabs above the page list the same pages, so every page stays reachable with the panel closed. Top bar: workspace switcher, command search, notifications, help, account. Context row: breadcrumb/project, view switcher, filters, saved views.

## Behavior

Use links for routes, disclosure for groups, tabs for same-context panels, and menu buttons for actions. Preserve deep links for calendar, timeline, media, feedback, resources, templates, integrations, chat, profile, portal, and support routes.

## States

Show active, hover, focus, collapsed, expanded, disabled, loading, and permission-limited destinations. Announce route changes and retain selected context after filters or sheets close.

## Responsive rules

Use a sheet on small screens with a labeled trigger. Keep title, search, and primary action available; place secondary navigation in the sheet.

## Accessibility

Use ordinary links and Radix focus management. Do not use a generic ARIA menu for navigation. Label multiple landmarks and support keyboard route access and a skip link.

## Preserved features

Keep existing hrefs, grouped navigation, `G` route chords, command dialog, account menu, notifications, and sample-mode marker.

## Acceptance checks

- Every current route remains reachable by link and command search.
- Active state survives refresh and direct deep links.
- Keyboard and screen-reader users can open, navigate, and close mobile navigation.
