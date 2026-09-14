# Dashboard

## Purpose

Show the day’s work: delivery risk, review queue, active projects, money, and recent activity.

## Anatomy

Page header and create action; metric strip; due/review queues; active-project table; activity feed; salary progress; project inspector.

## Behavior

Filters update all relevant modules without losing selection. Create, edit, delete, inspect, status, progress, payment, notes, and activity actions keep current data rules.

## States

Loading skeletons preserve metric/table geometry. Empty and no-results states explain the next action. Error, permission, sample/read-only, and offline states stay visible near affected modules.

## Responsive rules

Stack metrics, prioritize queues, and use a selected-project sheet below tablet width. Keep primary create, filter, due, and review actions reachable.

## Accessibility

Use one h1, table headers and sort names, labeled metric values, keyboard row actions, and text summaries for progress/chart content.

## Preserved features

Operational stats, filters, due/review queues, activity, projects, salary progress, inspector, and project CRUD.

## Acceptance checks

Existing dashboard light/dark/mobile captures, route tests, CRUD tests, keyboard pass, and reduced-motion checks pass.

Related: [states and feedback](../system/states-feedback.md).
