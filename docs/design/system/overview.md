# Design system overview

## Purpose

Give every Relay surface one visual and interaction contract. Relay should feel calm, dense and direct: a black page, white text, one accent that points at the thing to do next.

## How the system is built

1. **Tokens** in `src/app/globals.css`: color, type, radius, spacing and motion. Light and dark themes override the same names.
2. **Primitives** in `src/components/ui/`: buttons, inputs, menus, dialogs, tables, tabs. They consume tokens only.
3. **Page layouts** in `src/components/workspace-page/`: the page bar, sections, split panes, metric strips, empty states.
4. **Features** compose primitives and layouts. They own data and handlers, never visual rules.

Feature code never sets raw colors, arbitrary sizes (`text-[13px]`, `rounded-[10px]`, `h-[37px]`) or its own outer padding. If a feature needs something the system lacks, add it to the system first.

Never import Convex or Clerk into visual primitives.

## Principles

- **Flat by default.** Content sits on the page. A surface means "this is an object": something you type into, press, or read as a unit.
- **One signal per job.** The accent means "do this" or "this number matters". Status colors mean status. Tone means "active" or "selected". Do not reuse a signal for another job.
- **White text.** Anything you read or click is primary text. Metadata is the only quieter step.
- **Less text.** No eyebrow labels above titles, no visible page titles in the workspace, no vague words such as "people", "connect" or "better".
- **Nothing loops.** Motion answers an action and stops.

## Banned

- Decorative card frames, cards inside cards.
- Pill shapes (fully rounded buttons, tabs or tags).
- Light-gray body text in dark mode.
- Glow, halo or blur on anything, including focus and hover.
- Continuous animation: spinners, pulse, shimmer, looping orbs.
- Hairlines outside data tables.
- `backdrop-filter` blur.

## Modes

Relay supports local, sample and cloud modes, every current route, the theme setting (Light, Dark, System) and the accent setting. Density is fixed; there is no density setting.
