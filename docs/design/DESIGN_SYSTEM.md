# Relay design system

Relay runs on [Quartz](https://design.how/systems/quartz) inside a Linear-style shell: a sidebar on a near-black canvas, a framed viewport for the page, and a top bar that names the page and holds its actions. Quartz supplies the tokens, type roles and component rules; Relay keeps its Radix component layer and gives it the Quartz look. The decision is [ADR 0005](../adr/0005-adopt-quartz-in-a-linear-shell.md).

## Where things live

| Part                                                          | Path                                                                           |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Quartz tokens and base styles, unchanged from the package     | `src/styles/quartz/`                                                           |
| Relay's layer: Geist, the dark chassis, legacy aliases        | `src/styles/relay-theme.css`                                                   |
| Tailwind map, Quartz utilities, motion keyframes              | `src/app/globals.css`                                                          |
| Controls, menus, overlays                                     | `src/components/ui/`                                                           |
| Page building blocks (panels, strips, toolbars, empty states) | `src/components/workspace-page/`                                               |
| Shell and navigation registry                                 | `src/components/workspace-shell.tsx`, `src/components/workspace-navigation.ts` |
| Shared Filter menu                                            | `src/components/filter-menu.tsx`                                               |
| Design ratchet and codemods                                   | `scripts/design/`                                                              |

## System pages

- [Overview](system/overview.md)
- [Layout](system/layout.md)
- [Navigation](system/navigation.md)
- [Components](system/components.md)
- [Typography](system/typography.md)
- [Spacing and density](system/spacing-density.md)
- [Color and themes](system/color-themes.md)
- [Interactions and motion](system/interactions-motion.md)
- [States and feedback](system/states-feedback.md)
- [Responsive behavior](system/responsive.md)
- [Accessibility](system/accessibility.md)

Feature notes under [`features/`](features/) describe what each area does. Where they describe layout, the system pages above win.

## Checks

- `pnpm check:design` fails when banned patterns grow: raw colors, palette classes, legacy `--app-*` variables, pixel font sizes, capitals, glass, looping motion and side rails. Lower the baseline with `node scripts/design/check-design.mjs --update` after paying drift down.
- `pnpm check:design:self-test` proves every rule fires on a bad sample and stays quiet on clean Quartz classes.
- `src/app/theme-contrast.test.ts` measures every text role on every surface in both themes.
