---
name: convex-design
description: "Design or implement a backend after Convex has been selected."
---

# Design a Convex backend

Follow [../CONVEX-WORKFLOWS.md](../CONVEX-WORKFLOWS.md). Implement the specific request using the existing schema, components and conventions. For a new app, confirm Convex is already selected by the user or project policy before choosing it.

For a design question, explain the relevant data model and tradeoffs without edits. For an implementation request, continue through the requested feature and local verification. Use `convex-expert` for unfamiliar backend patterns and `convex-setup-auth` for authentication choices. Delegate only when useful and permitted by the available tools and model policy.

Prefer bounded indexed access for growing data, server-derived identity for protected operations, and internal functions for operations not intended for clients. Reuse existing components where they fit; do not replace an established solution solely to satisfy a recipe.

Run the project's relevant local typecheck and behavioral tests. A cloud push is a separate target-specific operation, not an automatic self-verification step. Report any deployment verification that remains outside the authorized scope.
