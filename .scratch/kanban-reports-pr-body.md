## Summary

Make basic reports available to signed-in Free accounts and use Kibo UI Kanban building blocks for Projects, with dither.kit area and donut charts for Reports.

```diff
 Projects
-  Table by default
+  Kanban by default, respecting saved Table preferences
 Reports
-  Free accounts see a plan gate
+  Free accounts see totals, delivery trends, work mix, and payment batches
+  Dithered charts with bloom disabled and fixed sparkle textures
```

Report charts share responsive heights and aligned footers. Kanban uses a floating drag preview outside scroll containers, readable card text, and top-aligned empty-column hints. Status updates, stage menus, filters, finance permissions, and existing salary plans remain connected. Advanced CSV exports, client totals, invoice drafts, and editor summaries stay gated by the subscription capability. No account migration or backend change is included.

## Evidence

- **Before:** Free accounts could not access the existing report totals or charts; Projects defaulted to Table.
  **After:** Focused report-access, finance-restriction, project-filter, and view-default tests pass on this host's isolated branch (15 tests). Application TypeScript passes with video source folders excluded. The layout follow-up also passes 30 focused tests, including drag-source and read-only checks.
- Source: Kibo UI's free MIT-licensed Kanban registry and dither.kit's official chart registry. Four D3 dependency declarations added; existing UI and drag dependencies reused.
- No live browser testing or deployment performed. GitCafe's main branch still includes video sources in its full TypeScript check; missing Remotion dependencies are unrelated to this change.

## Merge Danger

**Door:** Two-way

Reverting restores the previous UI and report gate. No stored data or account ownership changes.

**Blast Radius:** Workspace

Projects defaults to Kanban for users without a saved view. Chart rendering and responsive layout have not been checked in a live browser.
