# Layout

## Purpose

Make the app shell and page geometry stable across dense work surfaces.

## Anatomy

Use a global bar, collapsible sidebar, content rail, page header, local toolbar, section frame, and one primary surface. Compose `workspace-page` patterns: index, split pane, master-detail, and fill-viewport. Use `MasterDetail` with an inspector for three-pane work such as Media; both side rails stay 320px wide.

## Behavior

Pages own content and handlers. The layout owns gutters, max width, sticky toolbar rules, panel boundaries, and scroll ownership. Use borders and surfaces before shadows. Keep one useful `h1` per route.

## States

Layout variants cover loading skeletons, empty sections, permission/read-only banners, errors, and offline/local mode. Preserve panel geometry while content loads.

## Responsive rules

Use 24px desktop and 16px small-screen gutters. Collapse navigation to a sheet, move secondary actions to overflow, and keep bounded horizontal scroll for data that cannot reflow.

## Accessibility

Use named `header`, `nav`, `main`, and complementary landmarks. Provide a skip link. Resizable panes need a keyboard alternative and a visible separator.

## Preserved features

Keep `WorkspaceShell`, command search, account and notification actions, route links, mobile project detail sheets, and current scroll behavior.

## Acceptance checks

- Desktop, tablet, and 320px layouts have no accidental scroll traps.
- Sticky controls never cover focused content.
- Each page uses an approved layout pattern and unique title/h1.

Related: [workspace-page architecture](../../architecture/workspace-page-system.md).
