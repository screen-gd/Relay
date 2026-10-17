# Responsive behavior

## Breakpoints

Test at 320, 390, 768, 1024 and 1440px, in landscape, with touch, keyboard, 200% zoom and reduced motion.

## Rules

| Width                 | Shell                                                                              | Page                                                                              |
| --------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `lg` and up (1024px+) | Frame, rail, panel, inset content panel                                            | Page bar on one row; inspector card beside the content                            |
| Below `lg`            | No frame or rail; full-bleed `--surface-page`; bottom tab bar on `--surface-frame` | Page bar wraps filters to a second line; the inspector moves into a sheet         |
| Below `sm` (640px)    | Same                                                                               | Gutters drop to 16px; the Primary action becomes the floating accent "New" button |

- Segmented tabs scroll sideways rather than wrapping.
- Data tables either scroll horizontally inside a labeled region or switch to a prioritized list. Status, due date and the row's main action stay visible.
- Coarse pointers get 48px targets and 16px input text.
- Dialogs and sheets fit the viewport; sheets open from the bottom on phones.
- No accidental page-level horizontal scroll below 400px.
- Never hide essential fields or actions to fit a width.

## Preserved

Mobile project inspector sheets, responsive media and project layouts, calendar and timeline behavior, and the shell's mobile navigation.
