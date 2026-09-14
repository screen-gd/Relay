# Calendar and timeline

## Purpose

Plan deliveries and see project progress in time order.

## Anatomy

Shared date toolbar, month calendar, week-start setting, delivery counts, selected-day agenda, and chronological timeline with milestones.

## Behavior

Preserve month navigation, week-start preference, selected-day detail, delivery ordering, counts, and open-project actions. Keep dates and status consistent across views.

## States

Loading cells/rows, empty day, no deliveries, error, read-only/sample, and unavailable project detail.

## Responsive rules

Use a compact calendar or list agenda at narrow widths; keep selected-day detail in a sheet. Timeline rows may scroll horizontally only when needed.

## Accessibility

Use calendar grid semantics with labeled dates, keyboard movement, selected-day announcement, and a text timeline alternative. Do not rely on color for delivery status.

## Preserved features

Calendar month/week-start/selected-day behavior, delivery counts, timeline ordering, and project links.

## Acceptance checks

Month navigation, week-start, selected day, timeline order, 320px layout, keyboard, screen-reader labels, and dark/light checks pass.

Related: [responsive rules](../system/responsive.md).
