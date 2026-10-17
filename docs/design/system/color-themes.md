# Color and themes

## Purpose

One semantic palette for both themes. Feature code uses token names, never hex values.

## Surfaces

| Token                | Dark                | Light                  | Use                                                                  |
| -------------------- | ------------------- | ---------------------- | -------------------------------------------------------------------- |
| `--surface-frame`    | `#131315`           | `#ebebee`              | Sidebar rail and panel; the frame around the content panel           |
| `--surface-page`     | `#000000`           | `#ffffff`              | The content panel and everything that lies flat on it                |
| `--surface-fill`     | `#141416`           | `#f4f4f5`              | Controls, tags, metric cards, the inspector card, hover fill on rows |
| `--surface-active`   | `#232326`           | `#ffffff`              | Active sidebar item, active segment, selected row                    |
| `--surface-overlay`  | `#18181b`           | `#ffffff`              | Menus, selects, popovers, dialogs, sheets, toasts, tooltips          |
| `--surface-skeleton` | `#1a1a1d`           | `#ececef`              | Loading placeholders                                                 |
| `--overlay-scrim`    | `rgb(0 0 0 / 0.74)` | `rgb(24 24 27 / 0.58)` | Behind dialogs and sheets                                            |

In light mode the active segment is white on the `#f4f4f5` track, and the active sidebar item is white on the `#ebebee` frame.

## Text

| Token            | Dark      | Light     | Use                                                                                                                        |
| ---------------- | --------- | --------- | -------------------------------------------------------------------------------------------------------------------------- |
| `--text-primary` | `#ffffff` | `#0b0c0e` | Everything you read or click: titles, body, table cells, links, tabs, sidebar items, menu items, inputs, button labels     |
| `--text-meta`    | `#9a9aa2` | `#5f5f68` | Metadata only: dates, counts, helper text, the description line under a title, column headings, placeholders, group labels |

`--text-meta` is never used for links, tabs, navigation, labels or anything clickable. There is no third text step: `--app-muted`, `--app-subtle`, `--text-secondary`, `--text-disabled` and `text-muted-foreground` all collapse into these two. Disabled controls use 50% opacity instead of a gray.

## Lines and borders

| Token              | Dark                      | Light     | Use                                                                              |
| ------------------ | ------------------------- | --------- | -------------------------------------------------------------------------------- |
| `--border-control` | `rgb(255 255 255 / 0.20)` | `#d4d4d8` | Inputs, selects, textareas, Secondary buttons, segmented controls, overlay edges |
| `--border-table`   | `rgb(255 255 255 / 0.09)` | `#ececef` | Data tables only: under the column headings and between rows                     |

No other borders exist. See [Layout](layout.md) for where lines are allowed.

## Accent

The accent is lime `#C6FF00` by default. Users can pick any color in Settings → Appearance, and it replaces lime everywhere. Three tokens derive from it at runtime:

| Token                 | Rule                                                                                                                                         | Default dark | Default light |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ------------- |
| `--accent`            | The chosen color, used as a fill                                                                                                             | `#c6ff00`    | `#c6ff00`     |
| `--accent-foreground` | Near-black (`#0b0c0e`) or white, whichever contrasts more with `--accent`                                                                    | `#0b0c0e`    | `#0b0c0e`     |
| `--accent-mark`       | The chosen color, lightened or darkened until it reaches 3:1 against `--surface-page`. Used for lines, chart series and progress on the page | `#c6ff00`    | `#3a7500`     |

The accent appears in exactly these places:

- The fill of the page's one Primary button (and the phone "New" button).
- The key series in a chart and the fill of a progress bar or segmented meter (`--accent-mark`).
- Text selection, at 22% strength.

The accent never marks active navigation, selected rows, focus or hover. Those use tone.

The client portal's branding accent is separate. It belongs to the studio's client-facing brand and does not touch workspace tokens.

## Status

| Token              | Dark      | Light     |
| ------------------ | --------- | --------- |
| `--status-success` | `#34d399` | `#047857` |
| `--status-warning` | `#fbbf24` | `#b45309` |
| `--status-danger`  | `#f87171` | `#b91c1c` |
| `--status-info`    | `#60a5fa` | `#2563eb` |
| `--danger-fill`    | `#dc2626` | `#dc2626` |

Status colors appear as a 6px dot inside a neutral tag, a dot in a toast, or an icon. Errors and destructive menu items are the only status-colored text (`--status-danger`). `--danger-fill` with white text is the Danger button.

Project statuses map as: Delivered → success; Review, Revision, Client Review → warning; Cancelled → danger; In Progress → info; everything else → a `--text-meta` dot. Workflow stages and payment status use the same four colors plus neutral. The old `--workflow-stage-*` teal and cyan values are retired.

## Charts

Charts use the dither kit in `src/components/dither-kit`. The key series takes `--accent-mark`; other series take neutral steps of `--text-meta` and `--surface-active`. Charts do not glow or bloom on hover.

## Named palettes

Provider brand colors (`--brand-*`) and the media thumbnail palettes (`--media-package-*`, `--decorative-thumb-*`) carry identity or grouping, not interface state. They stay as named tokens and appear only on logos and thumbnails.

## Shadows

Only overlays cast a shadow: `0 16px 48px rgb(0 0 0 / 0.6)` in dark, `0 16px 48px rgb(11 12 14 / 0.16)` in light. Nothing at rest has a shadow.

## Theme boot

`globals.css` is the source for theme values. Runtime theme code sets the `light` or `dark` class and writes the three accent tokens. Theme and accent apply before hydration so the page never flashes.
