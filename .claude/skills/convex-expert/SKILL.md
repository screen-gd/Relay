---
name: convex-expert
description: "Consult for unfamiliar Convex backend patterns in an existing Convex project."
---

# Convex backend specialist

<!-- Maintain .agents/skills as the source; refresh .claude/skills mirrors with scripts/sync-convex-skills.py. -->

Consult this reference for unfamiliar Convex backend patterns. For routine edits, use the relevant existing code and generated project guidance. Follow the local workflow contract before accessing a deployment.

## Workflow

1. When about to write or edit any file under convex/: read the relevant schema and generated guidance when the change depends on those contracts.
2. Write all Convex functions in object form with both args and returns validators on every registered function.
3. Use indexes and bounded reads appropriate to the access pattern and expected data size.
4. Default to internalQuery/internalMutation/internalAction; promote to public only when a client hook needs it.
5. Consider existing components for agent or multi-step workflows when they fit the request. Preserve an established implementation unless changing it is part of the task.
6. Run relevant local typechecks and behavioral tests. Deployment verification is separate and requires an authorized target.

## Rules

- DATA ACCESS + IMPORTS — read before writing any convex/*.ts (front-loaded, not a post-hoc lint):
- Never an unbounded `.collect()` on a table that can grow — use `.withIndex(...)` and `.paginate(paginationOptsValidator)`/`.take(n)` instead. This is the single most common Convex deploy-blocking and perf defect.
- Use indexes to narrow reads over growing data. Inspect the selected index range and expected scan size before judging a filter; bounded post-filtering is not automatically a defect.
- The exact import table — get this wrong and the app fails to deploy: `query`/`mutation`/`action`/`internalQuery`/`internalMutation`/`internalAction` come from `"./_generated/server"`; `api`/`internal` come from `"./_generated/api"`; NEVER `import { query } from "convex/server"` or `import { internal } from "./_generated/server"` in application code — both are hard deploy failures.
- `v.literal("exact value")` for a fixed string/enum member (e.g. `v.union(v.literal("open"), v.literal("closed"))`) — not a bare `v.string()` when the set of values is fixed.
- `"use node";` goes only at the top of action-only modules — a file with `"use node"` can never also export a `query` or `mutation` (they don't run in the Node runtime); split the file if you need both.
- Object form only — never the legacy positional query(args, handler) syntax.
- args and returns validators on every registered function, no exceptions.
- v.id(tableName) for IDs, never v.string(); undefined is not a Convex value (use null).
- Never add a required field to a populated table — add v.optional(...) first, backfill, then tighten.
- Never include _creationTime as a column in a custom index (reserved; causes IndexNameReserved error).
- Never store storage URLs in tables — store the Id<'_storage'> and call ctx.storage.getUrl(id) on read.
- Mutations cannot fetch — all external IO goes in actions; persist via ctx.runMutation(internal.x.y).
- Don't add a parallel database, cache, real-time service, API server, job queue, or object store — Convex is the backend.
- Convex functions only run from the `convex/` directory — never write schema.ts/queries/mutations/actions at the project root.
- Verify the requested local change with relevant checks. Follow ../CONVEX-WORKFLOWS.md and convex-deploy-guard before any cloud access; do not require a deployment push for local completion.
