# 03 — HIGH — The recovery button on the 404 and error pages is white on white (1.0:1)

**Impact:** a user who hits a dead end gets a card whose only action is an unreadable white rectangle.
The button works, so they can still leave — but the one control that fixes their situation has no label.

## Contract clause

- `docs/design/system/color-themes.md` (Accessibility) — "Meet 4.5:1 text contrast and 3:1 non-text
  contrast, including borders, charts, focus, and disabled-adjacent content."
- `docs/design/features/access-support.md` — lists "recovery links" as preserved behaviour and requires
  a "focus on recovery message"; the recovery control exists and is unlabelled.

## Verified anchors

`src/app/not-found.tsx:38`

```tsx
className =
  "min-h-11 w-fit bg-[var(--app-highlight)] text-white hover:bg-[var(--app-accent)]";
```

`src/app/error.tsx:50`

```tsx
className =
  "min-h-11 bg-[var(--app-highlight)] text-white hover:bg-[var(--app-accent)]";
```

In dark mode `--app-highlight` and `--app-accent` are both `#ffffff` (`src/app/globals.css:139-141`), so
the fill is white, the label is hardcoded white, and the hover state is white too. 1.0:1 in every state.

## Repro

1. Open `/route-that-does-not-exist`.
2. The card's only action ("Back to Dashboard") is a blank white pill at approximately
   `x=473, y=519, width=157, height=40`.

Measured on the anchor: `color: rgb(255,255,255)`, effective background `rgb(255,255,255)`,
ratio **1.0:1**, font size 14px.

Evidence: `renders/RELA-14/route-not-found-desktop.png`,
`renders/RELA-14/contrast-not-found-back-cta.png`.

## Fix direction

Same fix as ticket 02: use the paired foreground token instead of `text-white`, e.g.
`bg-[var(--app-highlight)] text-[var(--app-accent-foreground)] hover:bg-[var(--app-accent)]` — but note
that in dark mode `--app-accent-foreground` is `#000000` while the light mode `--app-highlight` is
`#18181b` (`globals.css:94-96`), so verify the pairing in **both** themes before committing. If the
highlight/accent pair cannot produce a readable combination in both themes in every state, use the plain
`Button` default variant, which already resolves `bg-primary` with `text-primary-foreground`
(`src/components/ui/button.tsx:12`).

## Acceptance criteria

- "Back to Dashboard" is readable at ≥4.5:1 in light **and** dark mode, in default, hover, active and
  focus-visible states, on both `/route-that-does-not-exist` and the route error boundary.
- The error page's secondary action (if any) is equally readable.
- No `text-white` remains adjacent to `bg-[var(--app-highlight)]` or `bg-[var(--app-accent)]` in `src/`.

## Out of scope

Do not change the 404 copy ("This Relay route does not exist. Return to the dashboard to keep tracking
work.") — it is good. Do not add new error-handling behaviour; that is ticket 01.
