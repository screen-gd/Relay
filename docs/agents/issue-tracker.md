# Issue tracker: Local Markdown

Specs and issues for this repo live as Markdown files in `.scratch/`.

## Conventions

- One feature per directory: `.scratch/<feature-slug>/`.
- The spec is `.scratch/<feature-slug>/spec.md`.
- Implementation issues use one file per ticket under `.scratch/<feature-slug>/issues/`.
- Ticket numbers follow dependency order, starting at `01`.
- A `Status:` line records triage state.
- Comments go under a `## Comments` heading.

## Skill operations

When a skill publishes a spec or issue, it creates the matching file under `.scratch/`. A ticket lists its blockers by number and title. An issue with no open blockers sits on the active work list.

GitHub remains the source remote and pull-request host. Local tickets exist because the GitHub CLI has no signed-in account in this environment.

## Wayfinding operations

- Map: `.scratch/<effort>/map.md`.
- Child ticket: `.scratch/<effort>/issues/NN-<slug>.md`.
- Blocking: `Blocked by: NN, NN` near the top.
- Claim: set `Status: claimed` before work.
- Resolve: add `## Answer`, set `Status: resolved`, then add a short link to the map.

Remove a completed effort after its durable decisions have moved into `CONTEXT.md`, `docs/adr/`, or the relevant product or architecture document. Git history remains the archive; `.scratch/` is only for active work.
