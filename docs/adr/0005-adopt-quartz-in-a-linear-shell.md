# 5. Adopt Quartz in a Linear-style shell

Date: 2026-10-17

## Status

Accepted

## Context

The workspace had grown page by page: long stacked sections, page-level filter bars repeated on several pages, actions scattered through the content, and a one-off visual layer that later edits had pulled in different directions. The ask was a Linear-style app (sidebar with a rail toggle, a framed viewport, dropdown menus, short hover and transition motion) on the Quartz design system, with pages that put options where people expect them and need less scrolling.

## Decision

- Quartz tokens and base styles are copied unchanged into `src/styles/quartz/`. Relay's choices live in one file, `src/styles/relay-theme.css`: Geist instead of Quartz Sans, a near-black dark chassis, and aliases from the old `--app-*` names.
- The existing Radix component layer stays and takes Quartz's classes, so call sites keep their API. Quartz's Base UI components are not installed; swapping the behavior layer is a separate, larger change.
- The shell follows Linear: sidebar on the canvas, a framed viewport, a 48px top bar holding location, views and page actions. One registry, `workspace-navigation.ts`, feeds every navigation surface.
- Long pages split into views or URL sections instead of stacking panels.
- A ratchet, `pnpm check:design`, keeps banned patterns from growing.

## Consequences

- Status and stage colors are gone outside warnings and failures; stages read as words.
- The lime brand accent no longer colors the product UI; the primary is ink unless the person picks an accent.
- The dither chart kit is no longer used by any page and stays in the repo until someone decides to remove it.
- The browser specs were updated for renamed controls but not run as part of this change.
