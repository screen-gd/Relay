# 05: Certify the Creator client experience

**What to build:** Prove that a paid Creator Workspace can use its complete client-facing offer without exposing another Client or weakening portal access.

**Blocked by:** 04: Launch Creator with Razorpay.

**Status:** blocked

- [ ] A Creator owner can manage authenticated Client Contacts separately from Team Members.
- [x] Client Contacts see only Projects explicitly published to Clients they can access.
- [ ] Unpublished Projects, other Clients, internal notes, hidden outputs, and Team data remain private.
- [ ] The token-based Client Portal remains independent from Client Hub access.
- [ ] Creator portal branding changes only approved presentation fields and cannot alter authorization, expiry, selected content, or downloads.
- [ ] Downgrade preserves records while returning the Workspace to standard Free portal behavior.
- [ ] Type checking, portal tests, entitlement tests, and focused signed-in browser checks pass.

The checked visibility criterion is covered by `convex/clientHub.test.ts`:
mocked Client Contacts see only their published Projects in a seeded Creator
Workspace. Other checks remain open until their complete behavior is verified;
existing implementation alone is not certification. No live-account or Razorpay
verification is claimed.
