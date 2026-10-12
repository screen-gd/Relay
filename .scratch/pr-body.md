## Summary

Implements the eight AI features on top of the AI foundation (#74), one commit per issue.

- #75 Feedback → Revision List: groups unresolved client comments by timestamp and theme, flags vague notes with a clarifying question and possible new scope. New `revisionItems` table. Eval harness in `evals/`.
- #76 Client status update drafts: portal / email / WhatsApp drafts, reviewed and copied or published by the editor, never auto-sent.
- #77 Brief → Project + Outputs: PDF (up to 10 MB, via R2) or pasted text, extracted to outputs, deadlines and open questions, confirmed before anything is created.
- #78 Revision-round & scope guard: deterministic round counter, included-rounds limit (per output or per project, workspace default with project override), Owner-set rates, AI-drafted change order from stored figures.
- #79 Deadline / risk radar: hourly rules-based scan for all workspaces; "Draft digest" re-scans then has AI phrase the findings.
- #80 Earnings insights Q&A: typed Convex earnings queries exposed as tools; every quoted number is checked against tool output, and a failed check is shown to the user as `verification_failed`.
- #81 Transcript-anchored feedback: SRT/VTT upload (replaceable), timestamp matching in code, AI only for ambiguous comments.
- #82 "What changed in v(n)": changelog drafted from resolved revision items, approved snapshot shown in the client portal.

Shared conventions: opt-in per workspace, Owner/Editor only, `aiRuns` audit + monthly quota, idempotent request hash, Gemini Flash default with "retry with better model", `store: false` on OpenAI, only comment text / timestamps / titles sent to the model, every output labelled AI-drafted and linked to its sources.

Shared files (schema, lockfile, generated API) land in the first commit, so only the full branch builds, not each commit alone.

Closes #75, closes #76, closes #77, closes #78, closes #79, closes #80, closes #81, closes #82.

#### Test plan

- [x] `tsc --noEmit`: 0 errors outside `videos/`
- [x] Convex tests: 210 passed
- [x] Unit tests: 99 passed
- [ ] Set `GOOGLE_GENERATIVE_AI_API_KEY` (and `OPENAI_API_KEY`) in the Convex deployment
- [ ] `npx convex dev` to regenerate `convex/_generated`
- [ ] Check R2 bucket CORS allows `PUT` from the app origin for the PDF upload
- [ ] Try each feature against a real model; tune prompts where strict checks reject output
- [ ] Add real feedback threads to `evals/feedback-revisions/fixtures/real/` and run the eval to pick the "better" model

Generated with [Devin](https://devin.ai)
