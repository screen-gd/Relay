# Accessibility

Target WCAG 2.2 AA.

## Focus

- Focus is shown only for keyboard use (`:focus-visible`), never on mouse click.
- Buttons, links, tabs, sidebar items, rows and menu triggers: a **1px solid outline in `--text-primary`**, offset 2px. No halo, no glow, no accent color, no `ring-*` utilities.
- Inputs, selects and textareas: the border changes to `--text-primary`. No outline, no ring.
- Menu and select items show focus with the same `--surface-fill` as hover.
- Focus is never clipped by overflow and never hidden by the sticky page bar.

## Contrast

| Pair                                 | Ratio                                                          |
| ------------------------------------ | -------------------------------------------------------------- |
| `--text-primary` on `--surface-page` | 21:1 dark, 19:1 light                                          |
| `--text-meta` on `--surface-page`    | 7.6:1 dark, 6.4:1 light                                        |
| `--accent-foreground` on `--accent`  | Higher contrast of near-black or white; see accepted gap below |
| `--accent-mark` on `--surface-page`  | At least 3:1 by construction                                   |

**Known gap.** `--border-control` is about 1.7:1 against black, below the 3:1 that WCAG 1.4.11 asks for when a border is the only way to identify a control. Relay's controls also carry a fill and a visible label, but the implementation must check every input with the contrast test in `src/app/theme-contrast.test.ts`. If a control relies on its border alone, raise the border for that control rather than the whole system.

**Accepted accent gap.** Near-black (`#0b0c0e`) and white cannot guarantee 4.5:1 for every custom accent. On `#777777`, white is the stronger option at about 4.48:1. Screen chose to keep these foreground colors and accept this gap. Accent marks still reach 3:1 against the page.

## Structure

- Semantic HTML first; Radix for focus and ARIA in dialogs, menus, popovers, tabs and tooltips.
- One screen-reader `h1` per page, then a real heading outline.
- Named `header`, `nav`, `main` and complementary landmarks, and the skip link.
- Navigation uses links, not ARIA menus.
- Every icon-only control has an accessible name.
- Status never relies on color alone: every dot has text.
- Charts, progress and segmented meters have text alternatives.

## Motion and zoom

Honor `prefers-reduced-motion`. Support 320px reflow and 200% text zoom. Pointer targets are at least 24×24px, 48px on touch screens. Dragging has a non-drag alternative.

## Checks

- Keyboard-only pass over navigation, search, CRUD, filters, tables, sheets, dialogs and settings.
- Screen-reader pass over names, headings, landmarks, status, errors and chart alternatives.
- Automated contrast checks in both themes and with a dark and a light custom accent.
