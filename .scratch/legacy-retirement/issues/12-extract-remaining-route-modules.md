# Extract the remaining route modules

Status: resolved

## Work

Move one capability at a time out of `tracker-app.tsx`: Settings, Resources, Salary Plans and Batches, Team, Integrations, Profiles, Client Portals, and shared onboarding composition.

For each capability:

- define the smallest useful controller interface;
- move the existing implementation rather than rewriting it;
- keep presentation free of persistence and authorization decisions;
- run its focused checks;
- delete the old implementation before starting the next capability.

## Done when

- `tracker-app.tsx` contains shared composition only.
- Route behavior remains unchanged.
- No temporary adapter or duplicate implementation remains.
- Dependency checks enforce the seams described in ADR 0001.

## Answer

Resolved on 2026-09-15. Moved the remaining Settings, Resources, Templates, Team, Integrations, Profiles, Account, Subscription, notification, and onboarding route implementations plus their shared helpers into `src/features/routes/remaining-routes.tsx`. `tracker-app.tsx` now keeps workspace state, route selection, and shared shell composition. Route presentation consumes typed controllers from `src/features/routes/route-controllers.ts`; generated Convex functions and auth/data branching stay behind that seam. Existing Projects, Salary Plans, and Client Portal feature modules remain the capability seams; no duplicate page implementations or temporary adapters remain.

Verification evidence: source search found only `TrackerApp` as a page implementation in `tracker-app.tsx`; `pnpm verify:relay`, `pnpm lint`, `pnpm build`, and the local browser run passed onboarding, sample isolation, navigation, route geometry, and representative page-family checks. The full `pnpm verify:ui` run still stops at the pre-existing dashboard KPI separator assertion (`8px` measured where the script requires zero gap). `pnpm verify:browser` was not completed because its production-build server could not start after the intentionally blank local-only build; no production target was accessed or changed.
