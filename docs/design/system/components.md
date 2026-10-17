# Components

The controls in `src/components/ui/` keep their Radix APIs and take Quartz's classes. Do not restyle them at the call site; a codemod removed those overrides once (`scripts/design/control-override-codemod.mjs`).

| Component                                                 | Quartz behavior                                                                                                                                                                                                              |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Button`                                                  | `default` is the ink key, one per view. `outline` is the framed key, `secondary` the grey field, `ghost` for toolbars and rows, `destructive` a fail edge, never a red fill. Sizes: `xs` 24, `sm` 28, `default` 32, `lg` 44. |
| `Input`, `Textarea`, `SelectTrigger`, date picker trigger | One field box (`field-control.ts`): page color, control edge, darker on hover, ink on focus, fail line when invalid.                                                                                                         |
| `DropdownMenu`, `Select` list                             | Raised surface, frame line and the overlay shadow; rows are `menu-item`. Destructive rows use `variant="destructive"`.                                                                                                       |
| `Dialog`, `Sheet`, `AlertDialog`, `Popover`, `Tooltip`    | Same raised surface; dialogs 480px by default, sheets slide 16px from their edge.                                                                                                                                            |
| `Tabs`                                                    | `default` is the segmented control, `line` tabs over a hairline, `ghost` without a track. `ToggleGroup` matches the segmented control.                                                                                       |
| `Badge`                                                   | A tinted word, `rounded-inner`. `warn` and `destructive` are the only warm variants.                                                                                                                                         |
| `Table`                                                   | Row rules, quiet label header, hover wash, `data-state="selected"` wash.                                                                                                                                                     |
| `Card`                                                    | A grey field. Prefer `ContentSection`.                                                                                                                                                                                       |
| `Switch`, `Checkbox`                                      | Ink when on.                                                                                                                                                                                                                 |
| `Sparkline`, `BarChart`, `ShareList`                      | Ink lines and bars; shares as rows with a proportion bar instead of a pie.                                                                                                                                                   |

## Page blocks (`src/components/workspace-page/`)

- `ContentSection`: the Quartz panel. `bodyMode="flush"` for lists and tables, rows with `sectionRowClassName`.
- `MetricStrip` and `MetricItem`: several numbers as one strip split by column rules.
- `PageToolbar`: filters left, display options right; `sticky` pins it on the solid page color.
- `PageHeader`: the page's h1 (screen-reader only, the top bar shows the name) and its actions, rendered into the top bar. `PageActions` gives one primary and a More menu. `TopBarActions` renders actions where the heading lives elsewhere.
- `SectionNav`: the views of a record or page, as line tabs.
- `PageEmptyState`: a title, one line and the action, at the top-left.
- `FilterMenu` (`src/components/filter-menu.tsx`): every filter behind one Filter button, each a submenu naming its current choice.
