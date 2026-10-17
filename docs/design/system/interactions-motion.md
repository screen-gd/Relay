# Interactions and motion

## Motion

Motion answers something the user did, runs once, and stops. Nothing loops, glows, shines or blurs.

| Token                    | Value                           |
| ------------------------ | ------------------------------- |
| `--motion-fast`          | 120ms                           |
| `--motion-base`          | 180ms                           |
| `--motion-ease-standard` | `cubic-bezier(0.2, 0, 0, 1)`    |
| `--motion-ease-out`      | `cubic-bezier(0.16, 1, 0.3, 1)` |

The complete list of allowed motion:

| What                                                     | How                                                                                      |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Menus, selects, popovers, dialogs, sheets, tooltips open | Fade in and scale from 97%, `--motion-base`, ease-out. Close: fade out, `--motion-fast`. |
| Segmented control                                        | The active fill slides to the new segment, `--motion-base`.                              |
| Sidebar active item                                      | The active fill moves to the new item, `--motion-base`.                                  |
| Sidebar panel open and close                             | Width change, `--motion-base`.                                                           |
| Button press                                             | Moves down 1px while pressed.                                                            |
| Hover                                                    | Fill color change, `--motion-fast`.                                                      |
| New content after loading                                | Fades in once, `--motion-base`.                                                          |

Removed: hover lift, press scale, page-enter rise (`workspace-enter`), `studio-silver-pass`, `studio-edge-sweep`, `studio-gooey-enter`, `studio-thinking-orb`, chart glow and bloom on hover, and every `backdrop-filter` blur.

`prefers-reduced-motion` turns every transition and animation into an instant change.

## Interaction rules

- One Primary action per page; other actions are Secondary or live in More.
- Rare actions go in menus or sheets. Destructive actions are menu items with a confirm dialog.
- Use optimistic updates only where rollback is clear. Keep input on failure.
- Dragging always has a button or keyboard alternative.
- Avoid hover-only actions; anything revealed on hover is also reachable by keyboard and touch.
- Keep focus after filtering, mutations, closing a sheet and route changes.

## Preserved

Command shortcuts, `G` route chords, Sonner toasts, CRUD dialogs and existing drag and reorder behavior.
