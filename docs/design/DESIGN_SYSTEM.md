# Relay design system

This is the single source of truth for how the Relay workspace looks and behaves. The choices behind it are recorded in [ADR 0005](../adr/0005-adopt-the-relay-workspace-design-system.md). When the code disagrees with this document, the code is wrong.

The stack stays as it is: TanStack Start, Tailwind, shadcn/ui on Radix, Hugeicons through `src/components/icons.tsx`, Motion, TanStack Table, and the dither chart kit. Tokens live in `src/app/globals.css`; primitives in `src/components/ui/`; page layouts in `src/components/workspace-page/`.

## The rules in one page

- **Shell.** The sidebar frame wraps an inset content panel. Dark: page `#000`, frame `#131315`. Light: page `#fff`, frame `#ebebee`.
- **Density.** Fixed. Controls 36px, table and list rows 40px, menu items 32px. No density setting.
- **Text.** Content is white in dark mode and `#0b0c0e` in light mode. A second step (`#9a9aa2` dark, `#5f5f68` light) is for metadata only. Error messages and destructive menu items are the only colored text.
- **Surfaces.** Content lies flat on the page. Things you type into or press get a fill and a border. Things you only read get a fill. Overlays get a fill, a border and the only shadow.
- **Cards.** Two kinds only: the metric card and the inspector card. Fill only, never nested.
- **Accent.** Lime `#C6FF00` by default; each user may pick another color, and it replaces lime everywhere. The accent marks the page's one primary button, the key chart series and progress. Nothing else.
- **Status.** A neutral tag with a colored dot.
- **Type.** Geist and Geist Mono. Five sizes: 12, 13, 16, 20, 28.
- **Radii.** Tags and menu items 4px, everything else 6px, the shell panel 8px. Circles only for avatars and status dots.
- **Spacing.** 4px grid. Gutters 24px (16px on phones). 40px of space between sections.
- **Lines.** Only inside data tables. Nowhere else.
- **Motion.** One-shot, 120 or 180ms. Nothing loops, glows or blurs.

## Sections

- [Overview](system/overview.md)
- [Color and themes](system/color-themes.md)
- [Typography](system/typography.md)
- [Spacing and density](system/spacing-density.md)
- [Layout](system/layout.md)
- [Navigation](system/navigation.md)
- [Components](system/components.md)
- [States and feedback](system/states-feedback.md)
- [Interactions and motion](system/interactions-motion.md)
- [Responsive behavior](system/responsive.md)
- [Accessibility](system/accessibility.md)

## Feature contracts

Feature contracts describe what each area must keep. They follow this system for anything visual.

- [Dashboard](features/dashboard.md)
- [Projects](features/projects.md)
- [Clients](features/clients.md)
- [Calendar and timeline](features/calendar-timeline.md)
- [Media and reviews](features/media-reviews.md)
- [Templates and resources](features/templates-resources.md)
- [Reports](features/reports.md)
- [Team chat](features/team-chat.md)
- [Integrations and settings](features/integrations-settings.md)
- [Profiles and portals](features/profiles-portals.md)
- [Access and support](features/access-support.md)

## Brand

The approved assets in [`docs/brand`](../brand/ASSET-GUIDE.md) define the Relay mark. Use the mark for identity, not a generic video icon. `src/app/design-system.ts` holds only the brand values that code needs outside CSS: the default accent.
