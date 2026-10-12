# 08 — MEDIUM — The accent colour control stores a value that no surface applies

**Impact:** the user picks a new accent colour, the setting saves, and nothing in the product changes.
This also removes the only remedy a user has for contrast problems like tickets 02, 03 and 05 — someone
who needs a different action colour cannot get one.

## Contract clauses

- `docs/design/system/color-themes.md` (Behavior) — "Runtime theme code sets the light or dark class and
  **may override only `--app-accent`** and its contrast-safe foreground."
- `docs/design/features/integrations-settings.md` — "Preserve integration configuration, workspace
  settings, account/auth settings, theme boot, **accent**, density, date, currency, and project options."
  Acceptance: "Load/save/reset, validation, integration states, theme-before-hydration, mobile forms,
  keyboard, and error announcements pass."

## Verified anchors

- `src/features/settings/settings-page.tsx:993` — `value={settings.accentColor}`, the control that reads
  and writes the setting (a Radix `OwnedToggleGroup type="single" aria-label="Accent Color"` built from
  `relay.color.teal | cyan | sky | indigo | pink | deepTeal`).
- `src/features/routes/shared/route-theme.ts:12-19` — `applyRootThemeVariables(settings)`, the one
  function that translates settings into root theme state. It sets `colorScheme`, `data-theme` and the
  `dark` class, and **never writes `--app-accent`**.
- `grep -rn "setProperty" src` → no matches. Nothing in the codebase overrides `--app-accent` at runtime.
- Dark-mode tokens in `src/app/globals.css:139-141` are what actually render, whatever the setting says:
  `--app-accent: #ffffff; --app-accent-foreground: #000000; --app-highlight: #ffffff;`

## Repro

1. Open `/settings`.
2. Switch to the **Appearance** section (the section nav at the top of the settings page).
3. Note the current accent, then click a different swatch.
4. In the console:

```js
getComputedStyle(document.documentElement).getPropertyValue("--app-accent"); // "#fff" — unchanged
JSON.parse(localStorage.getItem("video-editing-work-tracker:settings:v1"))
  .accentColor; // the new value
```

Measured in one session: before `--app-accent: #fff`, stored `accentColor: null`; after clicking a
swatch, `--app-accent: #fff` (unchanged) while `settings.accentColor` became `#27272A`.

Evidence: `renders/RELA-14/settings-appearance-accent.png`.

## Fix direction

1. In `applyRootThemeVariables` — or a sibling effect that already runs on `settings` change, since
   `workspace-runtime.tsx` calls it in a `useEffect` keyed on `[settings]` — write the chosen accent onto
   the root element:

   ```ts
   root.style.setProperty("--app-accent", settings.accentColor);
   root.style.setProperty(
     "--app-accent-foreground",
     contrastSafeForeground(settings.accentColor)
   );
   ```

   The contract says runtime code "may override only `--app-accent` and its contrast-safe foreground", so
   this is the sanctioned mechanism — do not add more variables.

2. Compute the foreground rather than hardcoding it. A dark accent (like `#27272A`) needs a light
   foreground and vice versa; a luminance threshold is enough. This is also the durable fix for tickets
   02, 03 and 05: once `--app-accent-foreground` is known-correct, `text-white` next to an accent fill
   stops being tempting.
3. Reset must restore the theme defaults, not leave an inline style behind — check the "Reset
   preferences" path in `settings-page.tsx` (around `:451`).
4. Honour the existing boot behaviour: the theme must apply before hydration with no flash
   (`color-themes.md` Responsive rules), so read the stored value during the same boot pass.

## Acceptance criteria

- Selecting each of the six accents visibly changes accent-coloured UI (primary buttons, active nav,
  progress fills, focus rings), and `getComputedStyle(document.documentElement).getPropertyValue('--app-accent')`
  returns the chosen colour.
- Every accent-filled control's label stays ≥4.5:1 against its fill at each of the six accents, in both
  themes.
- Reset preferences returns the accent to the default and clears any inline override.
- The accent survives a reload with no flash of the wrong colour before hydration.
- A test asserts the token changes when the setting changes — the current bug is exactly a missing
  assertion.

## Out of scope

Do not add new accent colours, a colour picker, or per-feature accents. Do not change the theme
(Light/Dark/System) mechanism — that already works.
