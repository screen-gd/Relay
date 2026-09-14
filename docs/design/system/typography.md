# Typography

## Purpose

Make hierarchy and dense production data easy to scan without changing the current type voice.

## Anatomy

Use the current font set: Space Grotesk for display and page titles, Geist Sans for the interface and body, and Geist Mono for code and fixed-width data. Define page title, section title, body, label, metadata, numeric, and code roles.

## Behavior

Use rem sizes, clear weight and line-height steps, short labels, and sentence case. Prose uses a shared typeset wrapper. Never use size or weight as the only status cue.

## States

Keep text readable for disabled, error, selected, loading, and dark-theme states. Preserve entered text on form errors.

## Responsive rules

Allow wrapping and reflow at 200% text zoom. Do not reduce text below a readable size to fit a table.

## Accessibility

Meet WCAG contrast and 200% resize requirements. Headings must form a useful outline and route titles must match the page.

## Preserved features

Keep current product fonts and font loading. Preserve code, comments, descriptions, and numeric data roles.

## Acceptance checks

- Typography tokens cover every route family.
- 200% zoom retains all content and controls.
- Long labels and translated-like strings wrap without overlap.
