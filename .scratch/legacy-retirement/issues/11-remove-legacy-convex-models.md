# Remove migrated Convex models and fields

Status: resolved

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
fallback. `clientPortals` now requires `enabled` and all current test fixtures
write it. Settings now use only the canonical `identity.tokenIdentifier` after
the production identity migration completed.

Verification evidence: local Convex typecheck via `pnpm lint`, focused Convex
and persistence suite with 55 tests passing, `pnpm verify:team`, and
`pnpm build` passing. The full local Vitest suite now passes 17 files and 92
tests after updating the rebuilt hosted-file fixture to provision the current
workspace model. Source search finds no retired Convex table, field, fallback
reader, or removed migration reference under `convex/` or `src/`.

Production verification and deployment on `spotted-pheasant-146`: snapshot
export completed with Convex file storage, retired tables returned zero rows,
all identity migration statuses including `migrateSettingsIdentityV2` were
successful, and all sampled data matched the narrowed schema. The final
narrowed deployment deleted only the six indexes belonging to those empty
retired tables. Post-deploy verification found one canonical settings row,
zero legacy settings fields, zero legacy workflow stages, and no missing
`clientPortals.enabled` values.

Production schema deployment completed after the verification above and the
approved final push to the exact target.
