# Adopt the Relay workspace design system

By October 2026 the workspace had gone through five visual passes on one branch (Ember neumorphism, lime tonal, rail and hover sidebar, persistent panel, flat content) and drifted. The docs described a teal palette on `#0C0F12` and a Space Grotesk display face; the code used lime on a `#111112` page with Geist only. It had 16 radii, 18 type sizes, three tab styles, two focus styles stacked on each other, and light-gray text across about 470 places in dark mode. Screen, the owner, settled one system in a single review. `docs/design/DESIGN_SYSTEM.md` and `docs/design/system/` now record it as the source of truth.

The key choices:

- **Inset shell with a black page.** The content panel is `#000` and the sidebar frame is one step lighter (`#131315`). This keeps the framed look and puts true black where people read.
- **Fixed density.** 36px controls, 40px rows, 13px text. The unused density setting is dropped.
- **Two text colors.** White for content and anything clickable; `#9a9aa2` for metadata only. Error messages and destructive menu items are the only colored text.
- **Surfaces by role.** Things you type into or press get a fill and a border, things you only read get a fill, overlays get a fill, a border and the only shadow. There are two card types: the metric card and the inspector card. Hairlines are allowed only inside data tables.
- **One accent with one job.** Lime by default, replaceable by any user-picked color. It marks the page's one primary action and the key data point. Active and selected states use tone. Text on the accent and lines in the accent color adjust automatically to stay legible.
- **Geist only.** Space Grotesk had already been removed from the code in 4971d0a; the docs now match. Five type sizes, nothing below 12px.
- **Small, uniform radii.** 4px for tags and menu items, 6px for everything else, 8px for the shell panel. No pills.
- **One page bar.** Segmented tabs, filters, More and the primary action share one sticky row. There is no visible page title. The sidebar panel lists a hub's items, not its pages.
- **Quiet feedback.** Static skeletons, label-only pending states, no spinners. Keyboard-only 1px focus outlines. One-shot motion at 120 and 180ms; no glow, bloom, blur or loops.

## Consequences

The implementation that follows changes `globals.css` tokens and most primitives in `src/components/ui/` and `src/components/workspace-page/`. It removes the `studio-*` motion classes, `chart-glow`, `backdrop-blur`, `animate-spin` and `animate-pulse`, the `--workflow-stage-*` teal values, the gray accent presets and their teal-era names in `src/app/design-system.ts`, `SectionNav`, `PageToolbar`, and arbitrary `text-[Npx]` and `rounded-[Npx]` values.

The control border (`rgb(255 255 255 / 0.20)` on black, about 1.7:1) is below WCAG's 3:1 for non-text contrast where a border alone identifies a control. Controls also have a fill and a label; the implementation checks each one and raises the border where needed.

A user-picked accent can be any color, so contrast for the accent is computed at runtime, not fixed in the token file.
