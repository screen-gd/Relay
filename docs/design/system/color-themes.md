# Color and themes

Quartz builds every surface and text color from four oklch channels per theme: ink, paper, grey and canvas. Light uses Quartz's values. Dark is Relay's near-black chassis in `src/styles/relay-theme.css`:

| Channel | Dark value        | Renders about | Used for                                       |
| ------- | ----------------- | ------------- | ---------------------------------------------- |
| canvas  | `13.5% 0.003 265` | `#080809`     | sidebar, behind the viewport                   |
| paper   | `17% 0.004 265`   | `#0f0f11`     | the viewport, inputs, panel bodies             |
| grey    | `21.5% 0.005 265` | `#18191c`     | panels (fields), wells, tiles                  |
| ink     | `97.5% 0.002 265` | near white    | primary text, primary button, checked controls |

## Roles

- Surfaces: `bg-canvas`, `bg-page`, `bg-well`, `bg-raised`, `bg-hover`, `bg-selected`, `bg-tile`, `bg-overlay`.
- Text: `text-text-1`, `text-text-2`, `text-text-3`, `text-text-disabled`, `text-text-inverse`.
- Lines: `--line-row` (row rules), `--line-frame` (panel and overlay frames), `--line-control` (field edges).
- Trouble only: `text-warn-text`, `bg-warn-wash`, `text-fail-text`, `bg-fail-wash`, `--fail-line`.
- `primary` is ink unless the person picks an accent in Appearance; the picked color is written to `--app-accent` on `<html>`.

## Legacy names

The pre-Quartz `--app-*`, `--surface-panel` and `--status-*` names are aliases to Quartz roles so nothing renders unstyled. New code uses the Quartz names; `pnpm check:design` keeps the count of legacy references at zero.

## Themes

Light, Dark and System, chosen in the workspace menu or Appearance. The boot script applies the choice before first paint by toggling `.dark` and `data-theme` on `<html>`; the `.quartz` scope on `<body>` follows it.
