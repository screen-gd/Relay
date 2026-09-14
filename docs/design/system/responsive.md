# Responsive behavior

## Purpose

Keep work usable from a 320px phone through a wide desktop without losing key data.

## Anatomy

Use fluid content rails, CSS grid/flex, container-aware components, mobile sheets, horizontal-scroll data regions, prioritized cards, and filter summaries.

## Behavior

Collapse the sidebar; keep title, search, and primary action; move secondary actions to overflow; use deliberate table scroll or a complete prioritized list; keep selected detail in a sheet.

## States

Handle loading, empty, error, and dialogs within the viewport. Focused controls must remain visible when sticky headers or footers exist.

## Responsive rules

Test 320, 390, 768, 1024, and 1440px, landscape, touch, keyboard, 200% zoom, and reduced motion. Complex tables may scroll in two dimensions when necessary; other content must reflow.

## Accessibility

Do not hide essential fields or actions only to fit width. Label scroll regions and keep focus order aligned with the task order.

## Preserved features

Keep mobile project inspector sheets, responsive media/project layouts, calendar/timeline behavior, and shell mobile navigation.

## Acceptance checks

- No accidental page-level horizontal scroll below 400px.
- Every feature has a tested small-screen action path.
- Data tables announce their scroll or prioritized alternative.
