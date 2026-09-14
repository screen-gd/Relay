---
name: convex-optimize
description: "Diagnose Convex bottlenecks and apply requested, evidence-backed local fixes."
---

# Optimize an existing Convex app

Use [../CONVEX-WORKFLOWS.md](../CONVEX-WORKFLOWS.md). An audit request stays read-only; a request to fix a named bottleneck authorizes relevant local changes without another plan-approval round.

Gather the relevant code and authorized runtime evidence. Use `convex-performance-audit` for the observed symptom, or `convex-launch-readiness` in audit-only mode when a broad assessment was requested. Do not run every audit for a narrow performance issue.

Prioritize fixes by measured impact. Apply the requested changes and verify with the same signal where possible. Upgrades, new monitoring services and cloud changes are separate scope decisions, not automatic cleanup. Ask only if an unresolved tradeoff or new external action requires it.
