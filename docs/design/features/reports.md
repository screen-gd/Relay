# Reports

## Purpose

Show production, payout, and invoice information in a form users can act on.

## Anatomy

Period selector, metric strip, production charts, payout/outstanding batches, chart summaries/table alternative, and CSV export actions.

## Behavior

Preserve metrics, payout calculations, paid/outstanding batches, period selection, invoice/payout CSV exports, and permission states.

## States

Loading charts, no period data, no results, export pending/success/error, stale/offline data, and read-only state.

## Responsive rules

Stack charts and use horizontal scroll only for essential tabular data. Keep period and export controls available on small screens.

## Accessibility

Pair every chart with a text summary or data table, label axes and values, avoid color-only series, and announce export status.

## Preserved features

Production metrics, payout periods, paid/outstanding batches, charts, and CSV exports.

## Acceptance checks

Period changes, calculations, exports, chart alternatives, mobile layout, keyboard, contrast, and screen-reader checks pass.
