# Remove migrated Convex models and fields

Status: in-progress
Blocked by: 03 Migrate workItems into Projects, 04 Migrate portal deliverables, 05 Normalize Client Portal access, 06 Normalize Salary Batches, 07 Normalize Workflow Stages, 08 Normalize integration and permission settings

## Work

- Remove the `workItems` and `portalDeliverables` tables after verified migration.
- Remove legacy public functions, fallback queries, validators, fields, branches, tests, and migration code.
- Make current fields required where the model requires them.
- Deploy the narrowed schema only after verification queries return zero legacy dependencies.

## Done when

- Schema deployment accepts all stored documents.
- Runtime source has no fallback to retired models.
- Generated Convex types contain no retired tables or fields.
- Full Convex and application verification passes.

## Result

Local narrowing is complete. Removed the `workItems`, `portalDeliverables`,
and legacy `salaryBatches` tables; removed the old settings fields, string
workflow-template validator, positional workflow fallback, portal access
fallback, legacy identity settings readers, and their tests. `clientPortals`
now requires `enabled` and all current test fixtures write it.

Verification evidence: local Convex typecheck via `pnpm lint`, focused Convex
and persistence suite with 55 tests passing, `pnpm verify:team`, and
`pnpm build` passing. Source search finds no retired Convex table, field,
fallback reader, or removed migration reference under `convex/` or `src/`.

Production schema verification and deployment were not run. They require
explicit approval for the exact target and operation.
