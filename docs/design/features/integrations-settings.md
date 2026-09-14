# Integrations and settings

## Purpose

Let users connect services and set workspace behavior without losing context.

## Anatomy

Settings navigation, profile/preferences, theme/accent/density/date/currency controls, project options, integration cards, project link configuration, account settings, save/reset actions.

## Behavior

Preserve integration configuration, workspace settings, account/auth settings, theme boot, accent, density, date, currency, and project options. Keep save errors and unsaved changes clear.

## States

Loading values, saving/saved, invalid field, integration connected/disconnected/error, permission denied, and read-only/sample.

## Responsive rules

Use a settings list and single-panel form on small screens. Keep save status and primary action visible; do not hide fields behind hover.

## Accessibility

Use fieldset/legend or clear headings, labels, descriptions, error relationships, keyboard toggles, focus return, and contrast-safe previews.

## Preserved features

Integrations, project links, settings, account, theme/accent/density/date/currency, and project options.

## Acceptance checks

Load/save/reset, validation, integration states, theme-before-hydration, mobile forms, keyboard, and error announcements pass.

Related: [color themes](../system/color-themes.md).
