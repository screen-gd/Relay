# Layout

## The frame

- The shell is `h-dvh`: sidebar on `bg-canvas`, then the viewport, inset 8px on the top, right and bottom from 1024px up, `bg-page`, `rounded-frame`, framed by `--line-frame`.
- The top bar is 48px (`--topbar`) and is the first row of the viewport. It holds the location, the view switcher when the page is one of several views, and the page actions.
- `main#main-content` scrolls; nothing else on the page should scroll the whole viewport.

## Page widths (`WorkspacePage family`)

| Family                                                  | Width                     | Use                                       |
| ------------------------------------------------------- | ------------------------- | ----------------------------------------- |
| `data-index`, `master-detail`, `canvas`, `conversation` | full                      | lists, boards, calendars, chat            |
| `library`                                               | full                      | templates, resources, files, integrations |
| `administration`                                        | left-aligned, `max-w-5xl` | settings, account, profiles               |

`mode="fill"` pins the page to the viewport so lists scroll inside themselves; `document` lets the page scroll.

## Patterns

- **List page**: `PageHeader` (sr-only title, actions into the top bar), `PageToolbar` (scope, search, Filter, Display, count), then the list in one frame.
- **List and detail**: the list, with the selection in an inspector column at 1280px and up, or in a side `Sheet` below that.
- **Record page** (a project): `SectionNav` tabs over the main column, a 300px Properties column on the right that stays on every tab.
- **Long pages split into views.** When a page holds more than three panels, give it `SectionNav` views (Payments, Team, Integrations) or URL sections (Settings) instead of stacking.

## Panels

`ContentSection` is the Quartz panel: a grey field (`bg-well`, `rounded-frame`, 4px padding) with its title on the grey and its body on the page color inside. Panels stack with a 16px gap and never nest.
