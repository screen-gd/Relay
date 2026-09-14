---
name: convex-authz
description: "Audit Convex authorization; apply fixes only when the user requests them."
---

# Convex authorization

Read [../CONVEX-WORKFLOWS.md](../CONVEX-WORKFLOWS.md). Select audit-only for an audit/review request or apply-fixes when the user explicitly requests remediation. A parent scan-only task always stays read-only.

## Inspect

Read the relevant public functions, existing auth helpers, provider configuration and ownership model. Establish which operations are intentionally public and which require identity, ownership, membership or roles.

Look for these candidates:

- Client-supplied identity used as authority without server validation.
- Reads or writes by document ID without the required ownership or membership check.
- Sensitive data returned outside the caller's permitted scope.
- Creating or moving a child inside a parent the caller cannot access.

Searches and regexes locate candidates; inspect the complete call path, including shared helpers, before claiming a defect. A helper may enforce authorization outside the function body. Public access alone is not proof of a vulnerability.

## Report or fix

In audit-only mode, return evidence and suggested changes without editing code, internalizing functions, configuring auth or deploying.

In apply-fixes mode, reuse the project's identity and access-control helpers. Compare ownership against the identity type actually stored by the schema, resolving a user row when needed. Preserve intentionally public behavior and legitimate admin operations. If the auth foundation is missing, report the prerequisite and continue independent repairs; do not silently replace the provider or make all public functions internal.

Keep the patch within the requested scope. Verify protected behavior using existing tests or `convex-verify`: legitimate caller succeeds, wrong caller is denied, and returned data stays in scope. A typecheck or a disappearing regex match alone does not prove authorization works. Report remaining uncertainty using the local finding format.
