# Local Convex workflow contract

These installed skills include local customizations. Maintain `.agents/skills` as the source and mirror shared Convex files to `.claude/skills` with `scripts/sync-convex-skills.py`. The checker compares both trees, including source-only and target-only files; `--apply` creates missing mirrors and refreshes differences, but reports target-only files without deleting them. Review upstream changes before regenerating over them.

## Scope and completion

An audit, review or explanation is read-only by default. Explicitly requested fixes authorize local code edits and relevant safe local tests. Pass the selected mode to any composing skill. A scan-only subtask returns findings without edits even if its specialist also supports fixing.

A local implementation does not require a cloud push to count as locally verified. Identify the deployment and confirm the requested operation is authorized before live reads or writes, following the user's production and daily-driver restrictions. Do not use an existing development deployment as disposable storage. Authorization persists for the same action and target; changed scope needs new authorization. A later explicit user request can change an earlier read-only scope.

Finish the authorized local work and its relevant checks. State any unverified deployment behavior separately. When a final approval is still needed, prepare a concrete diff or rehearsal result before asking.

## Finding format

For a local report, use these fields in prose or JSON: title, class, severity, confidence, identity, locus, evidence, suggestedFix. Use severity high/med/low and confidence confirmed/plausible. `identity` identifies the affected function or table; `locus` gives file/line or the authorized deployment; `evidence` states the observed result. Add fixCapability only when a matching installed skill exists. Distinct defects in one function remain distinct findings; deduplicate only the same underlying defect.

No findings bus, remote service, or absent JSON schema is required. If an external integration is explicitly requested, inspect its actual schema and adapt the report to that version. Do not invent a schema path or claim schema validation without running it.

## Tools and references

Use the tools exposed by the current session and the project's installed CLI. A helper, recipe runner or detector named by an upstream document is optional unless actually installed. Resolve it before use; otherwise use the local skill's procedure or current official documentation. Fetching an external script is not permission to execute it or share data.
