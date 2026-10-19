# Spacing and density

- Spacing steps of 4px (`--space-1`); Tailwind's `p-2`, `gap-4` and so on read that scale.
- Controls: 24, 28, 32 (default) and 44px tall (`--control-xs`, `-sm`, default, `-lg`). Pointer-coarse screens widen hit areas with `touch-target`.
- Rows: 32px dense (`--row-sm`), 40px default (`--row`). Lists use `px-4 py-2.5` rows split by `rule-row`.
- Page padding: 16px on phones, 24px from 640px. Panels stack 16px apart; a panel's own padding is 4px of grey around a 16px body.
- Sidebar items are 28px tall with 8px around them; sections sit 16px apart.
- Radius: `rounded-inner` 4px for tags and cells, `rounded-soft` 6px for controls and rows, `rounded-frame` 10px for panels, menus and dialogs, `rounded-full` only for people, switches and progress tracks.
