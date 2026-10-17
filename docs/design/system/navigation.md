# Navigation

## Desktop sidebar

The sidebar has two columns on `--surface-frame`, as in ChatGPT and Codex.

**Rail (56px).** One icon per hub, each with a tooltip: Dashboard, Projects, Clients, Reviews, Payments, Team, Settings. The active hub's icon sits on a `--surface-active` square. The rail is always visible.

**Panel (248px).** Open by default; the toggle in its header closes it to the rail, and the choice is remembered on the device. The panel lists the **items** in the current hub, not its pages:

| Hub       | Panel contents                                     |
| --------- | -------------------------------------------------- |
| Projects  | New project, projects in progress, recent projects |
| Clients   | Clients                                            |
| Reviews   | Open reviews                                       |
| Payments  | Unpaid invoices                                    |
| Team      | Members, team chat                                 |
| Settings  | Its sections (Settings has no items)               |
| Dashboard | Recent projects                                    |

- Panel items are 13px `--text-primary`, 6px radius. The active item gets `--surface-active`; hover gets `--surface-fill`. No accent marker.
- Group labels ("In progress", "Recent") use `text-meta`. They are not eyebrows: no caps, no tracking.
- "New project" is a Ghost item, not an accent button. The accent belongs to the page's own Primary button.
- Support links (help, feedback, trust, legal) live in the account menu. The panel has no footer and no lines.

## Pages

A hub's pages (for Projects: Overview, Calendar, Timeline, Files, Media) appear only as segmented tabs in the page bar. A project's views use the same segmented tabs. See [Layout](layout.md).

## Top bar

Breadcrumb (hub, then the current item), command search (`Ctrl K`), notifications, help, account. Every breadcrumb segment uses `--text-primary`, including earlier segments that are links.

## Phones

- A bottom tab bar with the five main hubs on a solid `--surface-frame` background. No blur.
- The active tab gets `--surface-active` behind its icon and label. No accent bar.
- The page's Primary action is the floating accent "New" button.
- The sidebar panel's contents open in a sheet.

## Behavior

Use links for routes, segmented tabs for a hub's pages, and menu buttons for actions. Do not use an ARIA menu for navigation. Keep every current href and alias, `G` route chords, the command dialog, the account menu, notifications and the sample-mode marker. Active state survives refresh and deep links.
