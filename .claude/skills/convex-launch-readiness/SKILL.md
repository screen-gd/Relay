---
name: convex-launch-readiness
description: "Combine relevant Convex audits into a read-only readiness report."
---

# Convex readiness review

Use [../CONVEX-WORKFLOWS.md](../CONVEX-WORKFLOWS.md). This workflow reads and reports; it does not authorize fixes or deployment.

1. Identify the requested scope and available evidence. Use code-only review unless live access to a named target is authorized.
2. Run relevant `convex-authz` and `convex-reviewer` checks in audit-only mode. Add advisor or insights only when authorized live evidence is available and useful. Pass audit-only explicitly to every composing workflow.
3. Collect findings in the local format. Deduplicate the same underlying defect, preserving different defects in the same function. List skipped checks and their reasons.
4. Rank confirmed defects by impact and list plausible candidates separately. Explain readiness in terms of the checks actually run. A numeric score is optional; if requested, state the formula and coverage limits.
5. Present an ordered fix plan. Apply it only when requested, carrying that authorized scope to each fixing skill. Recheck affected behavior after fixes.

Completion is a report supported by available evidence. Missing traffic, external schema files or a local report service do not block a code-only report.
