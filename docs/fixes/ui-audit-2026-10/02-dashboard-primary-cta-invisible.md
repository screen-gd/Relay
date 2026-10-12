# 02 — HIGH — The dashboard's only action is white text on a white button (1.0:1)

**Impact:** a brand-new user with an empty workspace sees a blank white bar where their primary call to
action should be. The label "Create first project" is invisible; the button still works, so it reads as a
rendering bug rather than a missing feature.

## Contract clause

- `docs/design/system/color-themes.md` (Accessibility) — "Meet 4.5:1 text contrast and 3:1 non-text
  contrast, including borders, charts, focus, and disabled-adjacent content."

## Verified anchor

`src/components/first-run-checklist.tsx:63`

```tsx
className =
  "mt-6 min-h-12 bg-[var(--app-accent)] px-5 text-white hover:bg-[var(--app-highlight)]";
```

Dark mode defines (`src/app/globals.css:139-141`):

```css
--app-accent: #ffffff;
--app-accent-foreground: #000000;
--app-highlight: #ffffff;
```

So the button paints a white fill (`--app-accent`), hardcodes `text-white`, and hovers to
`--app-highlight`, which is also white. Contrast is 1.0:1 in both states.

## Repro

1. Local Mode, no projects (fresh profile, or clear the workspace).
2. Open `/`.
3. The control at approximately `x=292, y=292, width=910, height=36` renders as a plain white rectangle.

Measured: `color: rgb(255, 255, 255)`, `background-color: rgb(255, 255, 255)`, ratio **1.0:1**, font
size 16px. Hover measured identically.

Evidence: `renders/RELA-14/flow-empty-workspace-dashboard.png`,
`renders/RELA-14/contrast-dashboard-first-run-cta.png`,
`renders/RELA-14/flow-empty-workspace-cta-hover.png`.

## Fix direction

Use the token that exists for exactly this pairing, the same way the sibling button in
`src/components/precision-dashboard.tsx:1313` already does:

```tsx
className =
  "h-9 rounded-lg bg-[var(--app-accent)] text-[var(--app-accent-foreground)] …";
```

So here: replace `text-white` with `text-[var(--app-accent-foreground)]` and replace
`hover:bg-[var(--app-highlight)]` with a hover that keeps the pairing (for example
`hover:bg-[var(--app-accent)]/90`, which `precision-dashboard.tsx` uses).

While you are in this file, check the other accent-filled element on the same screen for the same
mistake, and grep the repository for `bg-[var(--app-accent)]` and `bg-[var(--app-highlight)]` next to
`text-white` — ticket 03 is the same bug in two more files, and a `Button` variant or lint rule would
stop the family recurring.

## Acceptance criteria

- The "Create first project" label renders at ≥4.5:1 against its own background in dark mode, and
  ≥4.5:1 in hover, focus and active states.
- Passing the mouse over the button does not make the label disappear.
- Light mode is unaffected (light `--app-accent` is `#18181b` with `#ffffff` foreground,
  `globals.css:94-95`).
- No remaining `text-white` adjacent to `bg-[var(--app-accent)]` or `bg-[var(--app-highlight)]` in
  `src/`.

## Out of scope

Do not restyle the first-run card or change its copy. The empty-state illustration and the three numbered
steps are fine.
