# Color and themes

## Purpose

Use one semantic palette across light, dark, accent, status, and selection states.

## Anatomy

Define canvas, surface, foreground, muted, border, input, primary, secondary, accent, destructive, success, warning, info, focus, and selection tokens.

The Relay lime palette is dark-first. Three tone steps of one neutral make the layout: the sidebar frame (`#0a0a0b`), the content panel that holds the top bar and page (`#111112`), and cards, metric items, and fields (`#18181a`). Primary text is white. The brand accent is lime `#C6FF00` with near-black text on it; light mode uses deep lime `#4D7C0F`, because lime fails contrast on light surfaces. Success is mint (`#34D399`) so it never reads as a brand highlight; amber is warning and red is error.

Content lies flat on the page. Sections are a heading and a body, separated from the next by a hairline; side-by-side columns share one vertical hairline; lists and tables use row dividers. Only objects get a surface: inputs, segmented controls, tags, the sidebar's active item, metric cards, and floating layers (menus, dialogs, sheets), which alone cast a shadow. Lime marks the primary action, the active navigation item, and the key data point in a chart; hover changes text color only.

Progress uses `SegmentedMeter` (`src/components/ui/segmented-meter.tsx`) where there is room: cells shade from danger through warning to success by position. Charts use the vendored dither kit (`src/components/dither-kit`) with the `lime` seed for the main series; chart containers take the `chart-glow` class and charts set `bloom="high"` with `bloomOnHover`, so they glow only while the pointer is over them.

Motion is one-shot: the sidebar's active marker slides between items, dropdowns open with a short height and fade, and Radix menus, selects, and dialogs fade and scale. Nothing loops.

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
