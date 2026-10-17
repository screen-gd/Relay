# Navigation

Every destination is defined once in `src/components/workspace-navigation.ts`. The sidebar, the rail, the mobile sheet, the top bar views and the command menu all read it.

## Sidebar

From top to bottom:

1. Workspace menu (avatar, workspace name): settings and account pages, theme, sign in or out. Then Notifications, Search (Ctrl K) and New project (C).
2. Daily pages: Dashboard, Projects, Reviews.
3. Foldable groups: **Workspace** (Clients, Files, Media, Templates, Resources, Payments) and **Team** (Members, Team chat). Folding is remembered per device.
4. **AI tools**: the three featured actions and All AI tools, which opens search.
5. **Recent**: the last five projects.
6. Footer: Help and feedback (support and legal links), Plans, and the sidebar toggle.

The toggle, or `[`, folds the sidebar to a 52px icon rail. Rail items name themselves in a tooltip. Below 1024px the sidebar opens as a sheet from the menu button in the top bar.

## Settings mode

On settings, integrations, account, plans and profile pages the sidebar swaps to settings navigation with Back to workspace. Workspace sections are URLs: `/settings?section=workflow`, `ai`, `permissions`, `notifications`, `appearance`, `regional`, `data`.

## Top bar

- Location: the page name, or `Parent › Record` with the parent as a link.
- Views: Projects, Calendar and Timeline are three views of one list and share a segmented control here.
- Actions: whatever the page's `PageHeader` or `TopBarActions` renders.

## Keys

Ctrl/Cmd K search, `[` fold the sidebar, `C` new project, `G` then `D`, `P`, `C`, `R` or `S` to jump.
