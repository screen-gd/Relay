# States and feedback

## Purpose

Make page status and recovery clear in every feature family.

## Anatomy

Use skeleton, progress, empty state, no-results state, inline error, alert, toast, permission banner, read-only marker, and offline/stale marker.

## Behavior

Keep layout stable while loading. Empty states explain why and give one next action. No-results states show query/filter context and reset. Errors sit beside the failed action and keep entered data.

## States

Define default, hover, pressed, focus, selected, expanded, checked, disabled, loading, empty, no results, error, success, offline, stale, and sample/read-only states for each component.

## Responsive rules

Messages wrap without hiding actions. Sheets and panels show status near the affected content, not only in a top toast.

## Accessibility

Use `aria-live` only for important save or failure results. Provide text alternatives for charts, progress rings, and color-coded badges.

## Preserved features

Keep current empty illustrations, Sonner toasts, local/cloud fallback, sample mode, permission checks, and delete confirmations.

## Acceptance checks

- Every route has loading, empty, error, and permission fixtures.
- Status is understandable without color.
- Recoverable errors retain user input and offer retry.
