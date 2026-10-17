# Writing

Use plain words, active voice, and concise explanations. Follow the user's writing preferences.

# Design system

UI work follows Quartz in the Linear-style shell. Start at [docs/design/DESIGN_SYSTEM.md](docs/design/DESIGN_SYSTEM.md).

- Classes name roles (`bg-page`, `text-text-2`, `type-label`, `rounded-soft`); no literal colors or pixel font sizes.
- Use `src/components/ui` and `src/components/workspace-page` before new markup; do not restyle them at the call site.
- One primary action per page, in the top bar through `PageHeader` or `TopBarActions`.
- Status is a word; only warnings and failures are warm.
- Add pages to `src/components/workspace-navigation.ts` so every navigation surface lists them.
- Run `pnpm check:design` before committing UI changes.

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
