# Projects

## Purpose

Find, sort, manage, and inspect editing jobs.

## Anatomy

Scope switcher, search/filter/sort toolbar, list/table, status/progress/due/client columns, selected-project inspector, create/edit/delete dialogs.

## Behavior

Preserve personal/team scopes, permissions, project CRUD, blank/template creation, status, progress, notes, dates, payment, files, and review actions. Keep selection through filter changes where possible.

## States

Loading rows, empty workspace, no matching filters, permission denied, read-only/sample, saving, delete confirmation, and mutation error.

## Responsive rules

Use a prioritized list at narrow widths and a detail sheet for the selected project. Keep status, due date, progress, and primary action visible.

## Accessibility

Use table semantics or a fully defined grid, named row actions, sort state, focus return from sheets, and non-color status labels.

## Preserved features

All current project fields, scopes, filters, sorting, inspector, CRUD, and permission gates.

## Acceptance checks

Project create/edit/delete, template flow, search/filter/sort, local/cloud mode, mobile sheet, keyboard, and focus tests pass.
