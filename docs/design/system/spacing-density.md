# Spacing and density

## Density

Density is fixed. There is no user density setting, no `data-density` rules and no `density` prop.

| Element                                                    | Height |
| ---------------------------------------------------------- | ------ |
| Default control (button, input, select, segmented control) | 36px   |
| Small control (toolbar, dense row actions)                 | 32px   |
| Table and list row                                         | 40px   |
| Menu and select item                                       | 32px   |
| Tag                                                        | 20px   |
| Any target on a coarse pointer (phones, tablets)           | 48px   |

## Spacing scale

All spacing sits on a 4px grid and uses only these steps: **4, 8, 12, 16, 24, 32, 40, 48**.

| Token             | Value                         | Use                                                                    |
| ----------------- | ----------------------------- | ---------------------------------------------------------------------- |
| `--space-gutter`  | 24px desktop, 16px below `sm` | Page padding inside the content panel                                  |
| `--space-section` | 40px                          | Empty space between sections. No line.                                 |
| `--space-stack`   | 12px                          | Between a title and its body; between a page bar and the first section |
| `--space-pane`    | 24px                          | Gap between split panes and side-by-side columns                       |
| `--space-inline`  | 8px                           | Between controls in a row                                              |
| Card padding      | 16px                          | Metric cards and the inspector card                                    |

Pages never add their own outer padding. `WorkspacePage` owns the gutter.

## Accessibility

Pointer targets are at least 24×24px on desktop and 48px on touch screens. Focus indicators are never clipped by spacing or overflow.
