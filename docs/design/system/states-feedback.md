# States and feedback

## Interactive states

| State             | Treatment                                                                                                                |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Hover             | Fill change only (`--surface-fill`, or a slightly lighter accent on Primary). No lift, no glow, no color change on text. |
| Pressed           | Moves down 1px                                                                                                           |
| Keyboard focus    | See [Accessibility](accessibility.md#focus)                                                                              |
| Active / selected | `--surface-active` fill                                                                                                  |
| Disabled          | 50% opacity, `not-allowed` cursor                                                                                        |
| Read-only         | Field border removed; text stays `--text-primary`                                                                        |
| Pending           | Label changes ("Saving…", "Sending…"), clicks ignored, color kept                                                        |

## Empty

`PageEmptyState`, centered in the empty area:

1. A 44px icon tile: `--surface-fill`, 6px radius, a 20px icon in `--text-meta`.
2. A title in `text-section`.
3. One line in `text-meta`, optional.
4. One Secondary button, optional. It may repeat the page's primary action, but it is never the accent fill: the page bar holds the only Primary.

The compact variant (inside a section) uses 32px of vertical padding instead of 48px. There is no illustration.

**No results** uses the same pattern with the title "No matches" and a Ghost "Clear filters" button.

## Loading

- **First load:** static skeletons in the shape of the content (`--surface-skeleton`, 4px radius). They do not pulse or shimmer. Content fades in once when it arrives (180ms).
- **Refetch:** data already on screen stays as it is. No dimming, no overlay.
- **Pending action:** the button's label changes; nothing spins.
- **AI:** a static "Thinking…" line where the answer will appear.
- **Uploads and exports:** a progress bar with the real percentage, filled with `--accent-mark`. It stops when done.

Spinners (`animate-spin`), `animate-pulse`, the looping thinking orb and `[aria-busy]` dimming are not used.

## Errors

Errors sit next to what failed and never discard entered data.

- **Field:** the input's border turns `--status-danger`; the message sits below it in `text-meta` and `--status-danger`.
- **Page load:** the empty-state pattern. The icon tile holds a danger icon, the title is in `--status-danger`, one line explains, and a Secondary "Try again" retries.
- **Background action:** a toast with the message in `--status-danger` and a Retry action.
- **Permission or read-only:** no framed banners. A `text-meta` line next to the locked action says why it is locked.

Error messages and destructive menu items are the only colored text in the app.

## Success and other feedback

Success and info confirmations are toasts with white text and a status dot. Save states inside forms change the button label ("Saved"). Use `aria-live` only for important save and failure results.

## Coverage

Every route has loading, empty, no-results, error and permission states. Status is understandable without color: every dot or colored message has text.
