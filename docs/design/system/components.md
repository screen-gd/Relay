# Components

## Purpose

Provide small, owned building blocks that compose into work surfaces.

## Anatomy

Foundation: Button, Link, IconButton, Input, Textarea, Select/Combobox, Checkbox, Switch, Label, Badge, Separator, Tooltip. Surfaces: Card, Sheet, Dialog, Alert Dialog, Popover, Dropdown Menu, Scroll Area, Resizable. Work: table, board row, calendar item, timeline row, filter builder, bulk bar, activity feed. Feedback: alert, empty, skeleton, progress, toast.

## Behavior

Use shadcn source with Radix primitives. Each component documents content, keyboard model, focus, loading, disabled, error, and mobile behavior. Use a native table unless the interaction truly needs an ARIA grid.

## States

Expose semantic variants for selected, destructive, success, warning, loading, error, and read-only. Do not encode state by color alone.

## Responsive rules

Controls wrap in toolbars; dense rows scroll or become prioritized cards; dialogs and sheets fit the viewport.

## Accessibility

Every icon-only control has an accessible name. Dialogs move and return focus. Grid arrow-key behavior follows APG only when `role=grid` is needed.

## Preserved features

Keep current shadcn/Radix, Lucide, TanStack Table, Recharts, Sonner, and Motion choices. Remove MUI presentation code only after migration checks pass.

## Acceptance checks

- Story or fixture coverage shows all interactive states.
- Keyboard paths and focus return work for menus, dialogs, sheets, tabs, and grids.
- No feature component uses raw color constants.
