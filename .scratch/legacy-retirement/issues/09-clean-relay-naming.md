# Remove CutLab and FrameDesk compatibility names

Status: in-progress
Blocked by: none

## Work

- Replace the active FrameDesk lockup with Relay branding.
- Rename or inline the `cutlab` design token object.
- Remove the legacy `sx` compatibility property once its callers are gone.
- Keep old local-storage keys only where changing them would strand user data. Document those keys as persisted compatibility identifiers.

## Done when

- User-visible UI and active source use Relay naming.
- A case-insensitive source scan finds no active `CutLab`, `FrameDesk`, or `Frame Desk` product name outside documented persisted keys or history.
- Branding and workspace browser checks pass.

## Comments

Renamed active copy, verification environment variables, test fixture copy,
and the design tracker to Relay. Retained the three `cutlab-studio:*` local
storage keys as documented compatibility identifiers so existing local data is
not stranded. Normalized the app brand preview filename so the asset contract
passes on case-sensitive filesystems.

## Answer

Resolved on 2026-09-15. Source searches found no active CutLab or FrameDesk
product copy in application, Convex, verification, or E2E source. The only
remaining matches are the documented persisted local-storage identifiers and
historical migration references.

Verification: `pnpm verify:relay`, `pnpm verify:brand-assets`,
`pnpm check:workspace-layout`, `pnpm lint`, and `pnpm build` passed.
