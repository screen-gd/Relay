# Spacing and density

## Purpose

Support focused, high-volume work without making controls hard to use.

## Anatomy

Use a 4px base and 8px rhythm with semantic aliases: page gutter, control, row, inline, section, and panel. Start with 36px standard/32px compact controls and 44px standard/36px compact rows.

## Behavior

Density changes space, not feature access, labels, or target usability. Keep flat bordered surfaces and reserve shadows for overlays.

## States

Selected and focused rows retain enough inset and contrast in both density modes. Loading preserves row height.

## Responsive rules

Use 24px page gutters on desktop and 16px on small screens. Let content define row height when labels wrap or touch input needs more room.

## Accessibility

Keep pointer targets at least 24x24 CSS pixels, with visible focus of 2px or more. Test touch and keyboard at each density.

## Preserved features

Keep the user density setting, current 4/8 rhythm, compact production tables, and existing scroll ownership.

## Acceptance checks

- Compact mode does not hide columns, actions, or focus rings.
- Target-size and zoom checks pass.
- Spacing uses tokens rather than route-local values.
