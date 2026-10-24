# Layout

## The frame

- The shell is `h-dvh`: sidebar on `bg-canvas`, then the viewport, inset 8px on the top, right and bottom from 1024px up, `bg-page`, `rounded-frame`, framed by `--line-frame`.
- The top bar is 48px (`--topbar`) and is the first row of the viewport. It holds the location, the view switcher when the page is one of several views, and the page actions.
- `main#main-content` scrolls; nothing else on the page should scroll the whole viewport.

## Page widths (`WorkspacePage family`)

| Family                                                  | Width | Use                                       |
| ------------------------------------------------------- | ----- | ----------------------------------------- |
| `data-index`, `master-detail`, `canvas`, `conversation` | full  | lists, boards, calendars, chat            |
| `library`                                               | full  | templates, resources, files, integrations |
| `administration`                                        | full  | settings, account, profiles               |

Administration sections fill the available page width. Keep prose and field groups readable inside their sections and arrange related settings in responsive columns. The standalone public profile keeps its own readable document width; it does not use the workspace shell.

Settings, Account, and Profile forms may use a readable width while staying aligned to the shared left gutter. The Plans comparison uses the available viewport width for its three plan columns.

`mode="fill"` pins the page to the viewport so lists scroll inside themselves; `document` lets the page scroll.

## Shared alignment

`WorkspacePage` owns the page gutters: 16px on phones, 24px from 640px up. Content starts 16px below the top bar on phones and 20px on larger screens. Both scrolling modes use a 16px section gap, as does `PageContent`. Pages use these defaults without adding their own outer padding or spacing.

`PageHeader` keeps its accessible heading out of the content flow, including when its actions render into the top bar. Actions must not leave an empty row above the page. `PageToolbar` reserves at least the default control height and wraps on smaller screens.

`MasterDetail` and `SplitPane` use a 16px column gap and 320px navigation or inspector columns. Dashboard supporting content uses that same column width and stacks below the main content before 1280px. Inspectors that use a mobile sheet remain hidden below their desktop breakpoint.

Media's three-pane `MasterDetail` uses 200px collection navigation and a 280px preview inspector, with the library filling the space between them. Collections become a horizontal scrolling row below 1024px. The preview stays in a `Sheet` below 1536px so the library keeps usable space; a visible Details action opens the selection. Media rows and cards respond to the library container's width.

`SplitPane` defaults to `mode="document"` and sizes to its content. Only bounded project and calendar views use `mode="fill"`. Document pages and metric strips do not shrink to fit the viewport; the page scrolls so KPI labels and supporting values remain visible.

The `record` family is the edge-to-edge exception for project workspaces. Its tabs and 300px Properties rail touch the frame; the scrolling tab body uses the normal page gutters. Use the family rather than overriding `WorkspacePage` padding.

## Patterns

- **List page**: `PageHeader` (sr-only title, actions into the top bar), `PageToolbar` (scope, search, Filter, Display, count), then the list in one frame.
- **List and detail**: the list, with the selection in an inspector column at 1280px and up, or in a side `Sheet` below that.
- **Record page** (a project): `SectionNav` tabs over the main column, a 300px Properties column on the right that stays on every tab.
- **Long pages split into views.** When a page holds more than three panels, give it `SectionNav` views (Payments, Team, Integrations) or URL sections (Settings) instead of stacking.

## Panels

`ContentSection` is the Quartz panel: a grey field (`bg-well`, `rounded-frame`, 4px padding) with its title on the grey and its body on the page color inside. Panels stack with a 16px gap and never nest.
