# 05 — HIGH — On /profile/edit the _selected_ week-start day is the only unreadable option

**Impact:** the day row reads as six normal chips plus a stray word. The user cannot see which day is
active without hovering or clicking, and the control inverts the usual affordance: the selected option
is the least visible.

## Contract clauses

- `docs/design/system/overview.md` — "Every control and page defines default, hover, pressed,
  focus-visible, **selected**, disabled, loading, empty, no-results, error, success, and read-only states."
- `docs/design/system/spacing-density.md` — "**Selected** and focused rows retain enough inset and
  contrast in both density modes."
- `docs/design/system/color-themes.md` (Accessibility) — "Meet 4.5:1 text contrast…"

## Verified anchor

`src/features/profile/profile-page.tsx:819-825` — the "Week Start Day" `OwnedToggleGroupItem` (the
`fieldset`/`legend` is at `:804-807`, the group's `aria-label="Week Start Day"` at `:811`), whose item
class is at `:822`:

```tsx
className="h-9 w-full min-w-0 border border-input bg-background px-2 text-xs text-foreground
           shadow-xs hover:bg-accent hover:text-accent-foreground
           data-[state=on]:border-transparent data-[state=on]:bg-primary
           data-[state=on]:text-primary-foreground data-[state=on]:hover:bg-primary/90
           dark:bg-input/30 dark:hover:bg-input/50"
```

## Repro

1. Open `/profile/edit` (Local Mode is fine).
2. Scroll to "Week Start Day" (near the bottom, above the save controls).
3. `Mon` — the value of `settings.weekStart` — renders as bare dark text with no border and no fill;
   `Tue`–`Sun` render as bordered chips.

Measured on the selected chip:

```
color:            rgb(0, 0, 0)                      <- --primary-foreground in dark mode
background-color: oklab(0.999994 … / 0.0364706)     <- the dark input fill, NOT --primary
border-top-color: rgba(255, 255, 255, 0.08)         <- border-input, so border-transparent did not win
contrast ratio:   1.12:1                            (needs 4.5:1 at 16px)
```

Evidence: `renders/RELA-14/profile-edit-availability.png`,
`renders/RELA-14/contrast-profile-edit-day-chip.png`.

## What is actually wrong

The selected state is applied in halves. `data-[state=on]:text-primary-foreground` resolves and turns the
label black (dark mode's `--primary-foreground` is `#000000`, `src/app/globals.css:140`), while
`data-[state=on]:bg-primary` and `data-[state=on]:border-transparent` lose to the later
`dark:bg-input/30` / `border-input` utilities, so the chip keeps the near-black input surface. The result
is black text on a near-black fill.

**Verify this before changing it** — the ordering hypothesis is a hypothesis. In the browser, select
`Mon` and read `getComputedStyle(chip).backgroundColor` plus which rule wins in DevTools "Computed" before
you pick a fix. What is not a hypothesis is the measurement above: black label, input fill, 1.12:1.

## Fix direction

Make the on-state unambiguous instead of relying on utility ordering. Preferred: drive the chip from an
explicit token pair that cannot conflict, e.g.

```tsx
className="… data-[state=on]:border-transparent data-[state=on]:bg-[var(--app-accent)]
           data-[state=on]:text-[var(--app-accent-foreground)] …"
```

and remove the `dark:bg-input/30 dark:hover:bg-input/50` utilities from the item (or scope them with
`data-[state=off]:` so they cannot override the on-state). Then confirm the same pairing in light mode,
where `--app-accent` is `#18181b` and its foreground `#ffffff` (`globals.css:94-95`).

If the same `data-[state=on]` + `dark:` collision appears on any other `OwnedToggleGroup` /
`OwnedToggleGroupItem` (the accent swatches on `/settings` Appearance use the same components), fix them
in the same pass and note it on this ticket.

## Acceptance criteria

- The selected day chip is visually obvious and its label measures ≥4.5:1 against its own fill.
- Unselected chips keep a visible border and readable label, unchanged.
- The same holds in light mode, in both density modes, and at 200% text zoom.
- Keyboard focus on the selected chip is still visible.

## Out of scope

Do not add new options to the day list or change `settings.weekStart` semantics. Do not restyle the whole
profile page.
