# RELA-14 UI fix tickets — agent-ready

These are the 12 fixable defects from the Relay UI audit (`reports/RELA-14.md`, rendered evidence in
`renders/RELA-14/`), rewritten as self-contained work items so an implementing agent can pick one up
without reading the audit. `13-judgement-calls.md` holds four items that are usability opinions rather
than contract breaches — decide on those separately, don't "fix" them silently.

## How to use these

- One file per issue. Each carries severity, the exact contract clause it breaks, verified `file:line`
  anchors, a runnable repro, the evidence screenshot, a fix direction, and acceptance criteria.
- **Sweep order by value:** 02 and 03 are the same three-line mistake and take minutes; 01 is the one
  that makes the product look dead; 04 and 06 are the two where the UI states something untrue.
  Suggested order: `02, 03, 01, 05, 04, 08, 07, 09, 06, 11, 12, 10`.
- Tickets are independent. Nothing here requires another ticket to land first.

## Baseline these anchors were verified against

```
$ cd relay && git rev-parse HEAD
302d4445c52437d6c9bfdf42463720190384c9c8
$ git status --short
(empty)
```

**Correction, added by the Captain 12 Oct 2026 after checking the remotes myself: `302d444` IS the
current `main`, and nothing is ahead of it.** The "behind origin/main by 22 commits" reading above comes
from a stale ref on the device that wrote these tickets, not from the real repository — that device's
fetch failed against a wrong remote URL, so its `origin/main` was never refreshed. Verified from the
primary machine:

```
$ git log --oneline -1 origin/main      # the Capy mirror
302d444 Add a dark-mode showcase video of the marketing site
$ git rev-list --count HEAD..origin/main
0
$ git ls-remote https://github.com/screen-gd/Relay.git refs/heads/main
302d4445c52437d6c9bfdf42463720190384c9c8	refs/heads/main
```

So both the Capy mirror and GitHub agree: these tickets are written against the tip of `main`. The
`file:line` anchors were verified at that commit and need no adjustment — unless you are working on a
branch that has moved since, in which case re-grep as the paragraph above says.

## Environment to reproduce any of these

```
cd relay
pnpm install --frozen-lockfile
cp .env.production .env.local
pnpm dev:next          # http://localhost:3100
```

`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` must be removed from `.env.local` to get a bootable app — see
ticket 01, which is why. `.env.local` is gitignored; `.env.production` stays as committed.

## The contract these tickets are graded against

`docs/design/DESIGN_SYSTEM.md` plus every file in `docs/design/system/` and `docs/design/features/`.
Those documents are the approved UI contract. Do not change them to make a ticket pass; change the
code. If you believe a clause is wrong, say so on the ticket rather than editing the contract.

## Files in this folder

| File                                        | Severity | One line                                                            |
| ------------------------------------------- | -------- | ------------------------------------------------------------------- |
| `01-loading-gate-blocks-app.md`             | HIGH     | Every screen unusable behind a permanent "Loading Relay…" overlay   |
| `02-dashboard-primary-cta-invisible.md`     | HIGH     | "Create first project" is white on white, 1.0:1                     |
| `03-not-found-error-cta-invisible.md`       | HIGH     | "Back to Dashboard" on 404/error pages is white on white, 1.0:1     |
| `04-fabricated-thumbnail-duration.md`       | HIGH     | Thumbnails print an invented clip runtime on projects with no media |
| `05-week-start-selected-state-invisible.md` | HIGH     | On /profile/edit the selected day chip is the unreadable one        |
| `06-delivery-salary-disagreement.md`        | HIGH     | Delivery says "1/5" and every money surface then reads 0            |
| `07-muted-text-contrast.md`                 | MEDIUM   | `--app-muted` misses 4.5:1 in 26 measured places                    |
| `08-accent-control-inert.md`                | MEDIUM   | Changing the accent colour changes nothing                          |
| `09-settings-mobile-overflow.md`            | MEDIUM   | /settings scrolls the page sideways at 390px                        |
| `10-sidebar-structure.md`                   | MEDIUM   | 13 destinations in the rail, Team missing                           |
| `11-missing-h1.md`                          | MEDIUM   | `/` and `/sample-studio` have no h1                                 |
| `12-calendar-grid-semantics.md`             | MEDIUM   | No grid semantics, no arrow keys, 35 tab stops                      |
| `13-judgement-calls.md`                     | LOW      | Four opinions, no clause breached                                   |
