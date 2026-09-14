---
name: convex-deploy-guard
description: "Identify the Convex target and authorized operation before deployment access."
---

# Deployment target and authorization

Read [../CONVEX-WORKFLOWS.md](../CONVEX-WORKFLOWS.md).

Before a deployment-affecting command, determine the actual target using non-secret configuration or available status tooling. Classify it as local, isolated dev/preview, daily-driver dev, or production. Resolve conflicting selectors before acting. Inspect whether a key is configured without printing its value.

Announce the target before touching it. Follow the user's explicit production, live-database and daily-driver restrictions for both reads and writes. Existing authorization applies to the same action and target; ask only for missing authorization or changed scope. A read-only audit never implies permission to mutate.

Keep production mutation tooling disabled for read-only work. Verify available MCP/CLI flags against the installed version before using them; do not assume a specific tool or flag is exposed.

Use safe local checks while preparing an unapproved deployment. If final approval is needed, present the actual diff, target and verification result first. Stop if the target remains unknown. If an observed result differs from the expected deployment, check target selection and deployment evidence before retrying; do not assume the cause.

Honor read-only scope until the user explicitly changes it. Never run a mutation, import or environment write merely because it seems harmless.
