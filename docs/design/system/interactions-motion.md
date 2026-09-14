# Interactions and motion

## Purpose

Make frequent actions fast, clear, and recoverable.

## Anatomy

Primary action, visible secondary action, overflow menu, confirmation dialog, inline status, toast, undo where safe, and activity history for background work.

## Behavior

Use optimistic updates only when rollback is clear. Preserve input on failure. Separate destructive actions and confirm irreversible changes. Dragging needs button or keyboard alternatives.

## States

Show pending, saving, saved, retry, failure, and cancelled states. Keep focus after filtering, mutation, sheet close, and route changes.

## Responsive rules

Use touch-safe targets, sheets for complex controls, and stable toolbar order. Avoid hover-only actions.

## Accessibility

Use Radix for dialogs, menus, popovers, tabs, and tooltips. Tooltips supplement visible labels. Honor `prefers-reduced-motion`; do not let motion hide content.

## Preserved features

Keep Motion transitions, reduced-motion hooks, command shortcuts, toast notifications, CRUD dialogs, and existing drag/reorder behavior.

## Acceptance checks

- Every mutation reports pending and result.
- Destructive actions offer cancel and recoverable errors.
- Keyboard, touch, reduced-motion, and screen-reader paths pass.
