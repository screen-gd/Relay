## Summary

```diff
 Reports
-  Unequal chart heights and misaligned captions
+  Matching responsive chart heights, centered work mix, aligned footers
 Projects
-  Dragged cards move inside clipped column containers
+  Floating drag preview outside scroll containers; source card stays in place
+  Readable card text, separate due date, top-aligned empty-column hints
```

Preserves filters, stage updates, permissions, and report access. Also fixes singular delivery-time wording.

## Evidence

- **Before:** Supplied screenshots show unequal report panels and a dragged Kanban card clipped within its column.
  **After:** 30 focused tests and application TypeScript pass. New checks cover the stationary drag source and read-only cards. Mechanical UI detector reports no findings.
- Live browser testing was not requested and was not performed.

## Merge Danger

**Door:** Two-way

UI-only follow-up to #4. No stored data or account changes.

**Blast Radius:** Workspace

Report sizing and Kanban drag presentation change. Live pointer and responsive behavior still need browser verification.
