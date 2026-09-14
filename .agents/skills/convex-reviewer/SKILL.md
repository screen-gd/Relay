---
name: convex-reviewer
description: "Review Convex functions for concrete correctness, access-control and performance defects."
---

# Review Convex code

Use audit-only mode from [../CONVEX-WORKFLOWS.md](../CONVEX-WORKFLOWS.md) unless fixes were requested.

Inspect the changed or requested functions and their callers. Check the actual access policy, identity and ownership flow, argument/return validation, bounded data access, relevant indexes, scheduled work, and error handling. Respect intentionally public operations and authorization implemented in shared helpers.

Report an unindexed scan when the data size and access pattern make it a material risk; do not classify every filter or missing index as a defect regardless of context. Ground platform-specific claims in generated project guidance, installed types or official docs for the installed version.

Return prioritized findings with a triggering case, file reference, consequence and suggested fix. Label uncertain candidates. Use focused local checks where they resolve uncertainty; do not deploy as part of an audit.
