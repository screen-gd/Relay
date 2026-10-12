# 07 — MEDIUM — `--app-muted` misses 4.5:1 in 26 measured places, including every table header

**Impact:** the labels that make dense data legible — table headers, inspector field names, timeline axis
labels, the breadcrumb, the shortcut hint — are the dimmest text on the screen. Not unreadable, but under
the floor the design system set, and worst at exactly the small sizes production tables use.

## Contract clause

- `docs/design/system/color-themes.md` (Accessibility) — "Meet 4.5:1 text contrast and 3:1 non-text
  contrast, including borders, charts, focus, and disabled-adjacent content."

## Measured values

Muted text resolves to `rgb(113, 113, 122)` in dark mode. Against the surfaces it sits on:

| Surface                                | Ratio      | Size   | Examples                                                                                                                 |
| -------------------------------------- | ---------- | ------ | ------------------------------------------------------------------------------------------------------------------------ |
| `rgb(10, 10, 10)` (control/panel fill) | **4.10:1** | 9–12px | breadcrumb "Relay", the "Ctrl K" hint, media "Collections", "Package type", "Project note", "Progress", clients "Unpaid" |
| `rgb(18, 18, 18)` (panel)              | **3.88:1** | 10px   | timeline axis labels "Expected", "Delivered"                                                                             |
| `rgb(7, 7, 7)` (canvas)                | **4.16:1** | 12px   | dashboard/sample-studio table headers "Project", "Due date", "Status", "Progress", "Value"                               |
| `/projects` table headers              | **4.10:1** | 10px   | NAME, CLIENT, STAGE, DUE, PAYMENT, SALARY                                                                                |

26 distinct text/style combinations across 31 audited routes. Evidence:
`renders/RELA-14/route-projects-desktop.png`, `renders/RELA-14/route-timeline-desktop.png`,
`renders/RELA-14/flow-projects-table-50.png`.

**Method and its limit.** Computed `color` against the composited ancestor background, WCAG 2.x relative
luminance. I excluded every colour that resolved to a `lab()`/`oklab()` value because my resolver cannot
normalise those, so the true count is likely higher than 26, not lower. Re-run the check with a real audit
tool (axe, Lighthouse, or `@axe-core/playwright`) before and after the fix — that also gives the ticket a
machine-checkable pass/fail.

## Where the token lives

`src/app/globals.css` — the dark mode block starts at `:138`; the text tokens are `--app-ink`,
`--app-muted`, `--app-subtle` along with the `--text-*` surface aliases the components use. Consumers
reference `text-[var(--app-muted)]` and the `text-muted-foreground` utility, so changing the token fixes
all of them at once.

## Fix direction

1. Lighten the muted token in the dark theme so it clears 4.5:1 on the **darkest** surface it appears on
   (`rgb(7,7,7)`), not just on the panel. `rgb(113,113,122)` gives 4.16 there; something in the region of
   `#9a9aa3` clears it with margin. Verify against all four surfaces in the table above.
2. Check the light theme at the same time — the light `--text-muted` value must clear 4.5:1 against the
   light canvas and panel too.
3. If any of these strings is deliberately quieter (a hint, a placeholder), it still has to meet 4.5:1
   under the contract; if a value genuinely cannot, raise that on the ticket rather than leaving it.
4. While you are there: chart gridlines use `--app-chart-grid: var(--app-border)` (`globals.css:124`),
   which resolves to `rgb(255 255 255 / 0.08)` = **1.17:1** against the canvas. The same clause requires
   3:1 non-text contrast "including borders, charts, focus". Give the chart grid its own lighter value,
   and read item 13c in `13-judgement-calls.md` before changing general borders.

## Acceptance criteria

- `--app-muted` (and its `--text-muted` alias) measures ≥4.5:1 against every surface it is used on, in
  both themes.
- An automated a11y run over `/`, `/projects`, `/clients`, `/media`, `/reports`, `/timeline` and
  `/settings` reports no colour-contrast violations for text.
- Table headers, inspector labels and timeline axis labels are visibly more legible at 100% zoom, and
  still visually subordinate to body text.
- Chart gridlines reach ≥3:1 against their plot background.

## Out of scope

Do not brighten body text (`--app-ink`) or change the palette's hue. Do not touch status colours
(success/warning/danger) — those were measured separately and are not part of this failure.
