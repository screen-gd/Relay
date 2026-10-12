# 12 — MEDIUM — The calendar has no grid semantics and no arrow-key movement; a month costs 35 tab stops

**Impact:** a keyboard user cannot navigate the month. There is no roving focus and no arrow-key
movement, so reaching 31 days means pressing Tab up to 35 times, with no positional context ("row 3,
column 2") for a screen reader.

This ticket is about structure and keyboard, not appearance. The accessible _labels_ on the day cells are
already good and must not regress.

## Contract clause

- `docs/design/features/calendar-timeline.md` (Accessibility) — "Use calendar **grid semantics** with
  labeled dates, **keyboard movement**, selected-day announcement, and a text timeline alternative. Do
  not rely on color for delivery status."

## Measured evidence

On `/calendar`, month view, read from the DOM:

```
role counts on the page: { heading: 3, none: 2, presentation: 1, tablist: 1, tab: 3, tabpanel: 1 }
document.querySelectorAll('table').length                                            0
document.querySelectorAll('[role="grid"], [role="gridcell"], [role="row"]').length   0
day buttons (aria-label matching /2026,/)                                            35
of those, tabindex="0"                                                               0
of those, aria-selected attribute                                                    0
of those, aria-current attribute                                                     1   <- selected day, good
```

Day-cell accessible names are correct, e.g. `aria-label="October 8, 2026, 0 scheduled"`. The container
chain is `div.grid-cols-7.gap-px > button` — `src/components/precision-schedule.tsx:416` for the month
grid, `:405` for the weekday header row, `:434` for the labelled day buttons; the week/agenda views have
their own cells around `:491` and `:511`.

Evidence: `renders/RELA-14/route-calendar-desktop.png`, `renders/RELA-14/route-calendar-mobile.png`,
`renders/RELA-14/route-calendar-zoom200.png`.

## Fix direction

1. Add grid semantics: `role="grid"` on the month container, `role="row"` per week, `role="gridcell"` per
   day — or use a real `<table>`, which `docs/design/system/components.md` prefers ("Use a native table
   unless the interaction truly needs an ARIA grid") and which suits a month calendar. Keep the existing
   accessible names.
2. Add roving tabindex: exactly one day in the month is `tabindex="0"` (the selected or focused day), the
   rest `tabindex="-1"`.
3. Add arrow-key movement per the APG grid pattern: Left/Right one day, Up/Down one week, Home/End to the
   week bounds, PageUp/PageDown one month, with focus following the movement. Crossing a month boundary
   should change the displayed month.
4. Keep the selected-day announcement that already works (`aria-current` on the selected day). If you move
   to a grid, also set `aria-selected` on the selected cell so assistive tech reports it consistently.
5. Apply the same treatment to the week and agenda views, or state explicitly on this ticket why they are
   out of pattern scope.
6. The clause's last sentence — "Do not rely on color for delivery status" — applies inside the grid too:
   today a day's entries convey delivery state with a coloured dot plus the title, and the status _word_
   only appears in the side panel. Add a text cue per entry, or an accessible status in the cell's name.

## Acceptance criteria

- The month grid exposes `grid`/`row`/`gridcell` (or a real `<table>`) with each day inside a row.
- Tab enters the grid once, not 35 times; arrow keys move focus between days; Home/End/PageUp/PageDown
  behave as described.
- The focused day is visible, and `document.activeElement` is always a day cell while navigating.
- The selected day is announced (`aria-current`, and `aria-selected` if it is a grid).
- Each entry conveys its delivery status without colour alone.
- Every existing accessible day label is unchanged in meaning.
- Keyboard-only month navigation works at 390px too, where the calendar is compact.

## Out of scope

Do not change the calendar's visual design, the month/week/agenda tabs (they already have correct tab
semantics), the week-start preference, or the timeline view. Do not add drag-and-drop.
