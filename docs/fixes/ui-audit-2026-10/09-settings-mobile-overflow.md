# 09 — MEDIUM — `/settings` scrolls the whole page sideways at 390px

**Impact:** on a phone the settings page drifts left and right while the user fills in a form. One
offender, one cause, two triggers (390px viewport and 200% text zoom).

## Contract clause

- `docs/design/system/responsive.md` (Acceptance checks) — "**No accidental page-level horizontal scroll
  below 400px**."
- `docs/design/system/responsive.md` (Responsive rules) — "Test 320, 390, 768, 1024, and 1440px,
  landscape, touch, keyboard, 200% zoom, and reduced motion."

## Measured evidence

At 390x844 on `/settings`:

```
documentElement.clientWidth  390
documentElement.scrollWidth  434        -> 44px page-level overflow
```

The offender, found by walking every element whose right edge exceeds the viewport:

```
<input class="h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 …"
       x=44  width=390  right=434   overflow-x: clip>
```

At the same width, `/projects`, `/clients`, `/feedback` and `/media` measure **0** overflow, so this is
specific to the settings form.

Evidence: `renders/RELA-14/route-settings-mobile.png` (the cards are visibly clipped at the right edge),
`renders/RELA-14/route-settings-zoom200.png`.

## Verified anchor

`src/features/settings/settings-page.tsx:473` — the "Workspace name" `FieldLayout`, inside a two-column
block:

```tsx
<div className="grid gap-3 sm:grid-cols-2">
  <FieldLayout label="Workspace name">
    <OwnedInput … />
```

The input is `w-full` with `min-w-0`, so its width comes from a parent that is already wider than the
viewport — trace the ancestor chain for the first box whose content width exceeds the container (the page
gutter is 16px at this width and the overflow is exactly 44px, so look for a 390px-wide child inside a
padded container). Do not assume it is this input: the input is the symptom the audit could measure, and
the same overflow at 200% zoom points at the same parent.

## Repro

1. `pnpm dev:next`, open `http://localhost:3100/settings` in a 390x844 viewport (or DevTools device mode).
2. `document.documentElement.scrollWidth` is 434 while `clientWidth` is 390.
3. Swipe/scroll right: the page moves.

## Fix direction

Constrain the offending container so its children cannot exceed the content rail: `min-w-0` on the grid
item, `max-w-full` on the field wrapper, or `w-full` + `min-w-0` on the ancestor that is currently sized
to its widest child. Then confirm the same at 320px, which the contract tests but the audit did not.

While you are here, re-run the overflow probe on every workspace route at 320 and 390 to catch siblings of
this bug; the audit only found this one at 390, but 320 was untested.

## Acceptance criteria

- `document.documentElement.scrollWidth <= clientWidth + 1` on `/settings` at 320, 390 and 768px, and at
  200% text zoom at 1440px.
- Every field on the page is fully visible and reachable without horizontal scrolling.
- The same check passes on `/account`, `/organization`, `/subscription` and `/profile/edit`, which share
  the settings form components.

## Out of scope

Do not restructure the settings sections or change the section navigation. Do not fix the deliberate
horizontal scroll on the projects board or the data tables — `responsive.md` allows bounded scroll for
data that cannot reflow, and that scroll is contained, not page-level.
