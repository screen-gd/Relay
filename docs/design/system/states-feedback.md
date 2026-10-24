# States and feedback

| State              | How it shows                                                                                                           |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Hover              | `bg-hover`, text steps up to `text-text-1`                                                                             |
| Selected / current | `bg-selected` and `aria-current` or `aria-pressed`; never an edge bar                                                  |
| Focus              | Quartz's 2px ink outline on every focusable element (`base.css`); inset (`focus-ring-inset`) inside lists              |
| Disabled           | `text-text-disabled`, framed controls lose their lift; the pointer says not-allowed                                    |
| Loading            | a skeleton in the shape of the content (static, no shimmer), or the turning arc for under a second                     |
| Empty              | `PageEmptyState`: title, one line on why, the action that fills it                                                     |
| Error              | the panel's text in `text-fail-text` with a title that names the problem; fields get the fail line and a message below |
| Warning            | `text-warn-text`, `bg-warn-wash` only for the word or row that needs care                                              |
| Success            | a toast on the raised surface; no green                                                                                |
| Read-only          | sample studio hides create actions; fields show the well color with no edge                                            |

Toasts sit bottom right, last a few seconds and can be dismissed. Only a warning toast is warm.
