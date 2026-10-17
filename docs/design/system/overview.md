# Overview

Relay should read like Linear: quiet chrome, one obvious next step per page, and nothing that has to be scrolled past to reach the work.

## Rules that decide most questions

1. Accessibility and keyboard behavior come first.
2. Tokens, never raw values. Classes name the role: `bg-page`, `text-text-2`, `rounded-soft`, `type-label`.
3. Use the shared component before writing markup.
4. One primary button per view. It sits in the top bar.
5. Status is a word. Only trouble is warm: `warn-*` for warnings, `fail-*` for failures and lateness.
6. Fields separate groups. A hairline goes only where a field cannot.

## Never

- Eyebrow labels above titles, capitals or tracked-out text.
- Cards in a grid for a set of numbers; use one `MetricStrip`.
- A box inside a box, icon tiles, status dots, side-rail bars.
- Glass, gradients on flat things, pulse, shimmer or bounce.
- Art in empty states.
- Highlight fills on text boxes or controls.

## Preserved

Local, sample and cloud modes; every route; theme and accent settings; permissions; Geist and Geist Mono.
