# AI foundation

Issue: [#74](https://github.com/screen-gd/Relay/issues/74).

## Consent and permissions

AI is off unless `teamWorkspaces.aiEnabled` is explicitly true. Only the active Workspace Owner can change consent in Settings → Workspace → AI assistance. Owners and Editors can request runs; Viewers and client contacts cannot. Project-scoped runs also require edit permission and project visibility. Workers recheck consent and access immediately before starting.

## Monthly allowance

Free has 10 runs and Creator has 300 runs per UTC calendar month. Team provisionally pools 300 runs per included or purchased Editor Seat, including the Owner's seat. Three included seats provide 900 shared runs. Viewers add no allowance. This Team formula needs product confirmation.

Every new queued attempt consumes one run, including failures and better-model retries. Identical queued/running requests and successful cached results reuse the original run without consuming quota. Failed requests can be retried as new attempts. Disabling AI never resets usage. Plan and seat changes adjust the allowance without erasing that month's consumption.

The `@convex-dev/rate-limiter` component stores consumption transactionally. Each workspace/month has a fixed-capacity meter independent of its subscription. The plan allowance is checked against consumed units before reserving another unit. Keeping meter capacity separate from plan allowance prevents upgrades or downgrades from resetting consumption. The meter's safety ceiling is one million runs per workspace/month. Queries take the month explicitly rather than reading the wall clock; Settings refreshes that month once a minute.

## Feature integration

A feature's public mutation must authorize and read its source data server-side, construct a bounded JSON input with only the permitted text, timestamps and titles, and call `enqueueAiRun` with its internal action reference. Never expose a generic prompt endpoint or accept a user-supplied identity or cache hash.

`enqueueAiRun` hashes the feature, prompt version, model tier, project, source IDs and serialized input. It scopes reuse to the workspace and requesting editor, so one editor cannot retrieve another editor's draft through a cache hit. Keep serialization stable, include all output-affecting context in the input, and increment the prompt version when prompts, output schemas or model configuration change. For workspace-wide features such as earnings insights, enforce feature-specific permissions before calling the helper.

Quota reservation, the `aiRuns` insert, and scheduling commit in one mutation. The helper schedules the feature action and a ten-minute timeout. An action must first call `internal.aiRuns.claim`; if that returns false, it must not contact a provider. This prevents duplicate workers and stops queued work after consent or access is revoked.

The feature action validates its generated object with Zod, then calls `internal.aiRuns.complete` with JSON output, the actual provider/model, token usage and optional known cost. Unknown costs remain unset rather than estimated. On failure, call `internal.aiRuns.fail` with a safe failure code, never a raw provider error. Successful completion is immutable; duplicate completion or failure callbacks cannot overwrite it. `api.aiRuns.getRun` lets the requesting editor subscribe to state and output, subject to current workspace/project access. A timeout marks unfinished work failed so it does not stay queued or running forever.

Audit records keep hashes and source IDs rather than raw input. The bounded input still passes through Convex's scheduled action arguments; do not include secrets, media, client contact details or unrelated records. Model execution, a concrete feature action, AI-drafted labels and source links in generated feature UI belong to the feature issues, beginning with #76. This foundation does not make provider calls by itself.

## Provider credentials and live verification

Declare `GOOGLE_GENERATIVE_AI_API_KEY` and optional `OPENAI_API_KEY` in Convex's environment configuration. Set their values only in the intended deployment's environment variables; never in browser variables, source files, screenshots or issue bodies. Use a billing-enabled Gemini project in production, not the free tier. Configure a provider spending budget before paid verification. Default feature generation to Gemini Flash; OpenAI integrations must use `store: false`.

No Convex AI Gateway subscription is needed when using provider keys directly. A deployment, its credentials and authorization to deploy/test must be confirmed separately. This change adds an optional consent field and a new table; existing workspaces remain opted out without a backfill.
