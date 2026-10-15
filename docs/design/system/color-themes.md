# Color and themes

## Purpose

Use one semantic palette across light, dark, accent, status, and selection states.

## Anatomy

Define canvas, surface, foreground, muted, border, input, primary, secondary, accent, destructive, success, warning, info, focus, and selection tokens.

The Relay Ember palette is dark-first: a near-black base (`#0c0c0f` canvas, `#101014` panels) with white primary text, and one warm accent, Ember (`#ec8a5e` dark, `#a8471f` light). Light mode uses one cool neutral base (`#e7e8ec`). Status keeps green success, amber warning, and red error.

Surfaces are neumorphic. Panels, cards, and metric items lift with paired shadows (`--neu-raised`) instead of borders. Fields, tab tracks, and the active navigation item press in (`--neu-inset`, `--neu-pressed`). Light comes from the top left in both themes. Buttons, links, and fields never get a highlight fill on hover; hover changes text color only, and press uses `--neu-pressed`.

Charts use the vendored dither kit (`src/components/dither-kit`) with the `ember` seed for the main series. Chart containers take the `chart-glow` class and charts set `bloom="high"` with `bloomOnHover`, so they glow only while the pointer is over them.

## Behavior

Feature code consumes CSS variables. Dark mode overrides the same names. Use color to reinforce status, with text, icon, label, or shape as a second cue.

`globals.css` is the source of truth for theme values. Runtime theme code sets the light or dark class and may override only `--app-accent` and its contrast-safe foreground. Provider brand colors (`--brand-*`), workflow stage colors (`--workflow-stage-*`), and decorative media palettes (`--decorative-thumb-*`, `--media-package-*`) are named tokens because they carry brand or grouping meaning rather than interface state.

## States

Check default, hover, active, selected, disabled, error, success, warning, focus, chart, placeholder, and read-only tokens in both themes.

## Responsive rules

Theme changes do not alter layout. Theme and accent boot before hydration to avoid a flash.

## Accessibility

Meet 4.5:1 text contrast and 3:1 non-text contrast, including borders, charts, focus, and disabled-adjacent content. Never rely on color alone.

## Preserved features

Keep theme, accent, and stored preference boot behavior and existing brand assets.

## Acceptance checks

- Token audit finds no raw feature colors.
- Light, dark, and accent captures pass contrast checks.
- Status remains clear in grayscale and with assistive text.
