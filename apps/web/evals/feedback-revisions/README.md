# Feedback revision evals

Excluded from normal unit and Convex runs. Four synthetic, anonymised threads
cover audio grouping, distant timestamps, vague feedback, extra outputs, and
instruction injection. Add real threads in `fixtures/real/` before choosing models
based on quality.

Offline fixture check (no provider calls):

```powershell
pnpm --filter @relay/web exec vitest run --config evals/feedback-revisions/vitest.config.mts
```

Paid comparison requires explicit opt-in and dedicated evaluation credentials in
`GOOGLE_GENERATIVE_AI_API_KEY` and `OPENAI_API_KEY`. These are only for the local
eval harness. Production uses encrypted workspace BYOK keys saved in Settings.
Do not use browser variables or commit keys.

```powershell
$env:RELAY_RUN_PAID_EVALS = "1"
pnpm --filter @relay/web exec vitest run --config evals/feedback-revisions/vitest.config.mts
```

The report prints each model's source grouping, expected group matches, vague and
scope flags, and token usage. It avoids logging client text and provider errors.
Review grouping/flag mismatches manually; flags are suggestions, not scope decisions.
