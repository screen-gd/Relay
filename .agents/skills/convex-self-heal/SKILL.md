---
name: convex-self-heal
description: "Prepare verified fixes for reported Convex failures within an explicitly authorized scope."
---

# Prepare a Convex failure fix

Follow [../CONVEX-WORKFLOWS.md](../CONVEX-WORKFLOWS.md) and `convex-deploy-guard`. Establish which failure and actions the user authorized. Live reads, snapshot exports, preview creation and production writes are distinct operations.

Use available redacted logs or a user-supplied error as evidence. Sentinel is optional; missing capture tooling does not prevent investigation of an existing report. Distinguish transient failures, configuration problems and code defects.

Reproduce locally when possible, inspect the implicated code, and prepare an authorized local patch. Use `convex-authz` in audit-only mode during diagnosis and apply-fixes mode only for authorized repairs. If reproduction is unavailable, continue useful source analysis and label the verification limit.

Verify the triggering behavior and affected tests. Use a snapshot rehearsal only when data access and the isolated target are explicitly authorized. Prepare a PR when requested by the user or the established workflow, with evidence and unresolved risks. Never auto-merge. Deployment is a separate authorized step; report observed post-deployment behavior only if it was actually checked.
