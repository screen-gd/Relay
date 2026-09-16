# 01: Establish Workspace subscription authority

**What to build:** Link each owned Relay Workspace to the Owner's Clerk user and one trusted Convex subscription projection. New Workspaces start on Free. The app can show the confirmed plan and a pending or repair state without trusting client input.

**Blocked by:** None. Can start immediately.

**Status:** done

- [x] Each Workspace projection records its billing Owner's Clerk user ID.
- [x] Convex stores the verified Workspace plan, billing period, status, subscription identifiers, quantities, last event, and reconciliation state.
- [x] A single server-side entitlement result describes plan features, Editor Seats, Storage Quota, and billing health.
- [x] Public Convex functions derive Workspace and identity on the server and reject client-supplied billing authority.
- [x] New Workspaces receive Free access even while Clerk and Convex synchronization is pending.
- [x] Existing development Workspaces gain a recoverable Free projection without touching production or deleting data.
- [x] Ownership transfer detaches the former Owner's Clerk user and requires billing repair for the new Owner.
- [x] Tests prove Free defaults, Workspace isolation, pending state, repair state, and billing-owner transfer behavior.
- [x] Type checking and relevant Convex tests pass.

## Comments

- Added Clerk User linking with safe Free fallback and repair state.
- Verified with `pnpm lint`, `pnpm build`, and `pnpm exec vitest run convex/workspaceSubscriptions.test.ts`.
- Corrected the remaining Team identity fixtures to use Clerk `tokenIdentifier` values.
- User Billing conversion left ownership-transfer relinking for ticket 09.
- Relay keeps the current Clerk `tokenIdentifier` account key. A future Clerk issuer change requires a separate data migration.
- September 16: transfer resets personal billing authority to Free/repair while preserving the Workspace Organization mapping, retained/reserved storage counters, and members. Only the new Owner can relink through authenticated repair. Former-owner billing events cannot find the detached projection. This does not cancel the former Owner's external subscription.
- Local verification: `node node_modules/vitest/vitest.mjs run convex/workspaceSubscriptions.test.ts convex/billingOwnership.test.ts convex/team.test.ts` passed 17 tests; `node node_modules/typescript/bin/tsc --noEmit` passed. Direct Node entry points bypass the broken local pnpm shell wrapper.
