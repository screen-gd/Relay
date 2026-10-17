# Components

Primitives live in `src/components/ui/` (shadcn source on Radix). Features use them as they are; they do not restyle them with `!important` or one-off classes.

## Button

| Variant   | Look                                                    | Use                                                                     |
| --------- | ------------------------------------------------------- | ----------------------------------------------------------------------- |
| Primary   | `--accent` fill, `--accent-foreground` text, weight 600 | The one main action of a page or dialog. At most one visible at a time. |
| Secondary | `--surface-fill` + `--border-control`, weight 500       | Other visible actions, More, empty-state actions                        |
| Ghost     | No fill; `--surface-fill` on hover                      | Cancel, toolbar and top-bar icons, sidebar items                        |
| Danger    | `--danger-fill`, white text                             | Only the confirm button in a delete dialog                              |

- Sizes: `sm` 32px and `default` 36px, plus square icon buttons at the same two heights. Padding 12px; 8px icon gap.
- Hover changes the fill only. No lift, no glow.
- Pressed: the button moves down 1px. No scale.
- Pending: the button keeps its color, ignores clicks and changes its label ("Saving…").
- Disabled: 50% opacity.
- There is no `link` or `outline` variant. Inline text links are underlined `--text-primary` text.
- Delete actions outside the confirm dialog live in menus as red items.

## Input, select, textarea

36px tall, `--surface-fill`, `--border-control`, 6px radius, 13px text, `--text-meta` placeholder. While typing, the border becomes `--text-primary`; there is no ring. An invalid field gets a `--status-danger` border with the message below it in `--status-danger` text. Read-only fields drop the border.

## Segmented control (tabs)

`Tabs` has one look: a `--surface-fill` track with a `--border-control` edge and 3px padding; each segment is 4px radius; the active segment gets `--surface-active`. Labels are `--text-primary`. It is used for:

- a hub's pages in the page bar,
- a project's views (replaces `SectionNav`),
- view toggles such as List / Board or Week / Month (replaces `ToggleGroup` for this job).

On narrow screens the control scrolls sideways; it never wraps. There is no underline variant and no `ghost` variant.

## Menu, select content, popover

`--surface-overlay`, `--border-control`, overlay shadow, 6px radius, 4px padding. Items are 32px, 4px radius, 13px `--text-primary`; hover gets `--surface-fill`. Separators are 4px of space, not lines. Destructive items use `--status-danger` text.

## Dialog and sheet

`--surface-overlay`, `--border-control`, overlay shadow, 6px radius (sheets: square on the attached edge). Title in `text-title`. Footer buttons right-aligned: Ghost Cancel, then one Primary (or Danger for deletes). Dialogs move focus in and return it to the trigger.

## Tag

20px, `--surface-fill`, 4px radius, `text-meta` weight 500, `--text-primary`. A status tag adds a 6px status dot before the label. Tags have no border and are never tinted.

## Data table

Native `<table>` unless the interaction needs an ARIA grid. 40px rows. Column headings are `text-meta` in `--text-meta`. Lines follow [Layout](layout.md#lines). The row under the pointer gets `--surface-fill`; a selected row gets `--surface-active`. Numbers are Mono, right-aligned.

## List

Rows 40px (36px inside the sidebar), 6px radius, no lines. Hover gets `--surface-fill`.

## Metric card

A metric card: `text-meta` label, `text-metric` value in Mono, optional `text-meta` supporting line. Metric cards sit in a `MetricStrip` grid with 8px gaps.

## Tooltip

`--surface-overlay`, `--border-control`, overlay shadow, 6px radius, `text-meta` in `--text-primary`. Tooltips supplement visible labels; icon-only controls still have an accessible name.

## Toast

Sonner, bottom right (above the phone tab bar on small screens). `--surface-overlay`, `--border-control`, overlay shadow, 6px radius. Success and info toasts are white text with a status dot. Failure toasts use `--status-danger` text and offer Retry.

## Avatar

A circle, `--surface-fill`, initials in `text-meta` weight 600. Avatars and status dots are the only circles.

## Progress

A 4px bar on `--surface-active` with an `--accent-mark` fill, or `SegmentedMeter` where there is room. Progress always reflects a real value; there is no indeterminate animation.

## Icons

Import from `@/components/icons`, which wraps Hugeicons. Add a name to `scripts/icon-map.json` and run `node scripts/generate-icons.mjs`. Icons are 16px by default, 12px in `xs` contexts, and take the text color of their context.
