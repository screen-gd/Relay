# Navigation

## Purpose

Let users move among work areas, current context, saved views, and actions without losing place.

## Anatomy

Desktop sidebar: Dashboard, Projects, Clients, Reviews, Payments, Team, Settings. It is a 56px icon rail. Hovering or focusing a hub opens a panel beside the rail with the hub's name, a one-line summary, and its pages (Overview first, then Calendar, Timeline, Files, Media for Projects; Team chat for Team; Integrations, Templates, Resources for Settings). The pin in the panel keeps it open for the current hub and widens the layout; the choice is remembered on the device. The context tabs above the page list the same pages, so every page stays reachable without hovering. Top bar: workspace switcher, command search, notifications, help, account. Context row: breadcrumb/project, view switcher, filters, saved views.

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
