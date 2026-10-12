# Relay audit — October 2026

Three read-only audits of `main` at `302d444`, run on 12 October 2026. No source file is changed by
anything in this directory; these are findings and work items.

| File           | Subject                                                                                                                              |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `RELA-14.md`   | UI audit of every screen. 96 route renders at desktop, mobile and 200% zoom, plus 21 driven flows.                                   |
| `RELA-15.md`   | Soundness sweep of `main`. Every quality gate with its exact outcome, then the fallout of the last ~40 commits.                      |
| `RELA-16.md`   | 63 advertised claims checked against what the app does, each with a `file:line` and a route, command or code path.                   |
| `cluster-*.md` | The four working notes behind `RELA-15.md`: marketing, design-system fallout, billing and AI state, and infrastructure and metadata. |

**Fix tickets live next door.** The twelve fixable UI defects from `RELA-14.md` are rewritten as
self-contained work items under `docs/fixes/ui-audit-2026-10/`, with the screenshots they cite beside
them. Start there if you are implementing rather than reading.

**Screenshots.** The audit reports refer to evidence as `renders/<code>/<file>.png`. Those full sets stay
in the Capy drive rather than in this repository — 131 shots for `RELA-14` alone — except for the 31 that
a fix ticket cites, which are committed with the tickets.

**Baseline.** `302d444`, which was the tip of `main` on both the internal mirror and GitHub when these
were written.
