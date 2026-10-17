# Layout

## Shell

The shell is a frame with an inset panel, as in ChatGPT and Codex.

- The **frame** (`--surface-frame`) holds the sidebar rail, the sidebar panel and an 8px margin around the content panel.
- The **content panel** (`--surface-page`, 8px radius) holds the top bar and the page. It is the darkest layer in dark mode.
- The **top bar** is 54px: breadcrumb on the left, command search in the middle, notifications, help and account on the right. It has no bottom border. Top-bar icon buttons are Ghost icon buttons, not round outlines.

## Page anatomy

Every workspace page has the same three parts, top to bottom:

1. **Page bar.** One row. Segmented tabs on the left. On the right, in this order: search and filters, the More menu, the one Primary action. It sticks to the top of the content panel while the page scrolls, on a solid `--surface-page` background with no blur and no border. Pages without tabs keep the bar with only its right side. On narrow screens filters wrap to a second line. The page bar replaces the old tab strip, `PageHeader` actions row and `PageToolbar`.
2. **Sections.** Each section is a title, an optional one-line description and a body, laid flat on the page. Sections are separated by 40px of space. They are never framed, never nested, and never separated by a line.
3. **Optional side pane** (see Split panes).

The visible page title is gone: the breadcrumb and sidebar name the page. Each page renders a screen-reader `h1`.

## Where surfaces go

| Object                                                            | Treatment                                                 |
| ----------------------------------------------------------------- | --------------------------------------------------------- |
| Inputs, selects, textareas, Secondary buttons, segmented controls | `--surface-fill` + `--border-control`                     |
| Tags, metric cards, the inspector card, empty-state icon tile     | `--surface-fill`, no border                               |
| Active sidebar item, active segment, selected row                 | `--surface-active`                                        |
| Row under the pointer                                             | `--surface-fill`                                          |
| Menus, selects, popovers, dialogs, sheets, toasts, tooltips       | `--surface-overlay` + `--border-control` + overlay shadow |
| Everything else                                                   | Flat on the page                                          |

## Cards

There are exactly two card types:

- **Metric card**: a label, a value and an optional supporting line.
- **Inspector card**: the side pane that shows the selected item.

Cards have a fill, no border, a 6px radius and 16px padding. Nothing inside a card gets another card. `Card` is not used to frame sections, lists or forms.

## Lines

Lines appear only inside data tables. A data table is anything with column headings (Payments, Reports, Clients, the project table):

- One `--border-table` line under the column headings.
- One `--border-table` line between rows, none after the last row.
- No vertical lines, no outer frame, no line on top.

Lists without column headings (due this week, activity, recent projects, settings rows) have no lines. Rows separate by their height and a hover fill. The top bar, sidebar, page bar, sections, split panes and footers have no lines.

## Split panes

`SplitPane` and `MasterDetail` place side panes 24px apart.

- An **inspector** (selected project, media details) is an inspector card: 320px wide, `--surface-fill`, 6px radius, inset inside the page.
- A **supporting column** (the Dashboard's second column) is ordinary content on the page, separated only by the 24px gap.
- Media's three-pane view uses two 320px side panes; the right one is the inspector card.

Below `lg`, an inspector moves into a sheet.

## Scroll

The content panel owns vertical scroll. Bounded data tables scroll inside themselves; unbounded ones never become a vertical scroller. Page max width is 1920px.

## Accessibility

Use named `header`, `nav`, `main` and complementary landmarks and keep the skip link. Resizable panes need a keyboard alternative.

Related: [workspace-page architecture](../../architecture/workspace-page-system.md).
