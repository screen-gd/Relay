# Typography

One family, Geist, set through Quartz type roles. A role sets size, line height and weight in one class; do not add `text-sm`, `font-semibold` or tracking next to it. `scripts/design/type-role-codemod.mjs` moved the old ad-hoc sizes onto roles.

| Role                        | Size / line | Weight | Use                                           |
| --------------------------- | ----------- | ------ | --------------------------------------------- |
| `type-heading-lg`           | 32/36       | 500    | standalone page titles (public pages)         |
| `type-heading`              | 24/28       | 500    | first-run and error titles                    |
| `type-heading-sm`           | 20/24       | 500    | a record's name in a detail view, stat values |
| `type-heading-xs`           | 16/20       | 500    | dialog and sheet titles                       |
| `type-label`                | 13/16       | 500    | buttons, nav items, row titles, panel titles  |
| `type-label-sm`             | 12/16       | 450    | metadata, table headers, counts               |
| `type-body`                 | 14/20       | 400    | paragraphs                                    |
| `type-body-sm`              | 13/18       | 400    | descriptions under titles, empty-state lines  |
| `type-code`, `type-code-sm` | 13, 12      | 400    | ids, codes, timecodes                         |

- Add `data` for numbers so digits line up (tabular figures).
- Mono only for what a person copies: codes, ids, timecodes.
- Sentence case everywhere; no capitals or tracked-out labels.
- Text color is a role: `text-text-1` for primary text, `text-text-2` for secondary, `text-text-3` for metadata. All three pass 4.5:1 on every surface.
