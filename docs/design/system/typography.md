# Typography

## Fonts

- **Geist Sans** for every title, label and paragraph.
- **Geist Mono** for numbers, dates, durations, timecodes, IDs, amounts and keyboard shortcuts.

Both are self-hosted through Fontsource (`@fontsource-variable/geist`, `@fontsource-variable/geist-mono`). There is no display face: Space Grotesk was removed in commit 4971d0a and stays out. `--font-display` and `.font-display` are dropped.

## Scale

Five sizes. Every piece of text uses one of these roles; arbitrary sizes (`text-[11px]`, `text-[15px]`, `text-[34px]`) are not allowed.

| Role           | Size / line height | Weight                | Font          | Use                                                                                |
| -------------- | ------------------ | --------------------- | ------------- | ---------------------------------------------------------------------------------- |
| `text-meta`    | 12 / 16            | 400 or 500            | Geist or Mono | Dates, counts, helper text, descriptions, column headings, tags, group labels, kbd |
| `text-body`    | 13 / 20            | 400, 500 for emphasis | Geist         | Body, controls, rows, menu items, tabs, sidebar items                              |
| `text-section` | 13 / 20            | 600                   | Geist         | Section titles, empty-state titles, field labels                                   |
| `text-title`   | 16 / 24            | 600                   | Geist         | Dialog and sheet titles, the inspector card's title                                |
| `text-metric`  | 20 / 24            | 600                   | Mono          | Metric card values                                                                 |
| `text-display` | 28 / 32            | 600                   | Geist         | Client portal, public profile, sign-in and onboarding headings                     |

Nothing is smaller than 12px. Weights are 400, 500 and 600 only. Titles at 20px and above use `-0.02em` tracking; everything else uses `0`.

## Rules

- Sentence case everywhere. No all-caps labels, no eyebrow text above titles.
- Workspace pages show no visible page title. The breadcrumb and sidebar name the page; each page still renders a screen-reader `h1`.
- Numbers in tables and metrics use Mono with `tabular-nums` and right alignment.
- Never use size or weight alone to signal status.
- Long labels wrap; they are never shrunk to fit.
- Inputs use 16px on touch screens so phones do not zoom.

## Accessibility

Text meets 4.5:1 contrast in both themes (`--text-meta` is 7.6:1 on black and 6.4:1 on white). Headings form a real outline. Content survives 200% text zoom.
