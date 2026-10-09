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

Audit records keep hashes and source IDs rather than raw input. The bounded input still passes through Convex's scheduled action arguments; do not include secrets, media, client contact details or unrelated records. Feature-specific prompts, persistence, AI-drafted labels and source links belong to the feature modules.

## Shared generation runner

`convex/aiGeneration.ts` runs in the default Convex action runtime, using the AI
SDK's `generateObject` and a Zod schema, or `generateText` with tools (below). `default` selects Gemini
`gemini-3.8-flash`; `better` selects OpenAI `gpt-5.5`. OpenAI receives
`store: false`. Explicit provider instances read only the Convex environment keys
below, without gateway or browser credential fallbacks. Changing the mapping
requires bumping each feature's prompt version to invalidate cached results.

```ts
generateAiObject<S extends z.ZodType>(
  ctx: Pick<ActionCtx, "runMutation">,
  options: {
    runId: Id<"aiRuns">;
    modelTier: "default" | "better";
    prompt: string | ModelMessage[];
    schema: S;
    save?: (output: z.output<S>, completion: AiCompletion) => Promise<boolean>;
  }
): Promise<z.output<S> | null>
```

```ts
const output = await generateAiObject(ctx, {
  runId,
  modelTier: "default",
  prompt: "Draft a short update from the supplied project title...",
  schema: z.object({ draft: z.string().max(1000) }),
});
// output is inferred as { draft: string } | null.
```

The runner claims before contacting a provider, validates the object again with
Zod, records the actual response model and token usage, and leaves unknown cost
unset. Missing usage fails rather than inventing token counts. A request has a
two-minute abort limit, 8,000 output tokens and no automatic paid retries.
Failures persist only a failure code (`provider_error`, or `verification_failed`
from the tool runner's `verify`), never provider error text.

Features with database output pass `save`. That callback invokes one internal
mutation, which validates attribution and current access, calls
`internal.aiRuns.complete` and writes the feature rows in the same transaction.
Return its boolean result. This makes completion and feature persistence atomic
and prevents duplicate workers or expired runs from writing drafts. Without
`save`, the runner calls `internal.aiRuns.complete` directly. A false claim or
completion returns `null`.

### Tool-calling runner

`generateAiObjectWithTools` keeps the same claim, complete and fail lifecycle and
the same model mapping, limits and `store: false`. It calls the AI SDK's
`generateText` with `tools`, `stopWhen: isStepCount(maxSteps)` and
`Output.object({ schema })`, records total usage across steps, and passes the
parsed output plus every tool result to a required `verify` callback before
saving. A throwing `verify` is wrapped in `AiVerificationError` and fails the run
with `verification_failed`, so the UI can tell users the output was rejected
rather than the provider failing. Tools must be built inside the action from the
stored run (`workspaceId`, `requestedBy`), not from model input, and must call internal functions that re-check that
requester's access. `generateAiObject` and `generateDraft` also accept AI SDK
message arrays for native PDF file parts; text-only callers retain the same behavior.

```ts
generateAiObjectWithTools<S extends z.ZodType>(ctx, {
  runId, modelTier, prompt, schema: S,
  tools: ToolSet,
  maxSteps: number,
  verify: (output: z.output<S>, toolOutputs: unknown[]) => void,
  save?: (output: z.output<S>, completion: AiCompletion) => Promise<boolean>,
}): Promise<z.output<S> | null>
```

## Deadline risk digest (#79)

An hourly cron (`deadlineRisk.scanAll`) evaluates rule-based findings for every
Workspace. It never starts AI. `riskDigest.generate` is editor-triggered: it
requires an Owner or Editor with project visibility, re-runs the Workspace scan
(`deadlineRisk.scanWorkspaceNow`, the same bounded code as the cron) in the same
mutation, reads the caller's visible findings server-side, and enqueues at most
40 of them in rule order. Input holds only kind, severity, who it waits on,
project/output titles, due date, days until due and the scan date; finding IDs
stay in run metadata.

The model returns one line per finding with its zero-based position.
`riskDigest.save` rebuilds the input from the stored snapshot and rejects output
that adds, drops or reorders findings, or quotes a number that is not in that
finding's title, due date or day count. It then rechecks consent and access and
atomically completes the run and stores the lines. The dashboard shows rule
findings without AI and the digest labelled `AI-drafted`, each line linked to
its project or output. Nothing is sent automatically.

## Earnings Q&A (#80)

`earningsQa.ask` requires an Owner or Editor with Finance permission. Input is
the question (3–500 characters) and the Workspace's local date. The action
exposes five tools (`totals`, `byClient`, `byPeriod`, `byProject`,
`bySalaryBatch`) with Zod inputs limited to dates, Client ID, granularity and row
limit. Each tool calls an internal `earnings.*ForRequester` query with the run's
stored Workspace and requester, so Finance access and Project visibility are
re-checked as that editor on every call. All arithmetic stays in
`earningsLedger.ts`.

The answer has text and citations (label, value, Project and Salary Batch IDs).
`verifyEarningsAnswer` rejects it unless every number in the text and every
citation value appears in tool results (numbers, or digits in returned titles,
labels and dates; never digits inside IDs or the question), every cited ID was
returned by a tool, and an answer with numbers has citations. Percentages,
totals or differences the tools did not return therefore fail. A failed check
fails the run with `verification_failed` (other errors use `provider_error`),
and Reports tells the editor the numbers could not be verified. `earningsQa.save`
rechecks consent, role and Finance access before completing. Reports shows
recent answers labelled `AI-drafted` with cited values and Project links.

## Feedback revision list (#75)

`revisionItems.generate` authorizes project edit access and the Owner/Editor role,
then enqueues unresolved comments for one Media Version. Input contains three
titles (160 characters each), at most 40 comments (first 1,000 characters each),
and video timestamps only. Larger threads must be reduced by resolving comments.
The foundation also caps serialized input at 64 KB. Comment IDs remain in run
metadata; the provider returns zero-based source positions instead.

`revisionItemsActions.run` uses the shared runner. Its save mutation rejects
unknown or missing source references, incomplete coverage, mismatched versions
and empty clarifying questions for vague notes. It derives timestamps and source
IDs from stored comments, rechecks consent/access, and atomically saves up to 40
draft items and completes the run. A version holds at most 200 items; generating
requires room for 40 more. Retry uses the better tier and its separate cache key.
Existing drafts and editor decisions remain intact across runs.

Items retain their run and Media Version attribution, theme, text, source comment
IDs, timestamp list, vague/question and possible-scope flags. Only editors can
accept, edit, resolve, reopen or delete them. Editing accepts a draft. Revision
resolution does not resolve client comments. The internal review history
subscribes to the list and run state, groups themes and sorts timestamps, and
links directly to source comment anchors. Drafts are labelled `AI-drafted`.

The separate [eval harness](../../evals/feedback-revisions/README.md) checks four
synthetic threads offline and can compare both tiers with explicit paid opt-in.
It is excluded from normal test runs. Add 15–20 anonymised real threads in its
`fixtures/real/` directory before assessing quality or changing the better model.
No paid evals or real client quality comparison have been performed.

## Brief import (#77)

The New Project dialog offers brief import to opted-in Workspace Owners and
Editors with creation and edit permissions. Pasted text is limited to 12,000
characters. PDFs up to 10,000,000 bytes (10 MB) upload directly to the existing
R2 bucket using a 15-minute signed, single-part multipart PUT URL. R2 was chosen
because the server can reserve an uploader-owned object key before any bytes arrive, including
uploads abandoned before generation. No new dependency or PDF parser is added.
`briefUploads` binds each key and multipart ID to the requester and Workspace.
The server finalizes the single part before validation. Completed multipart
uploads cannot be overwritten through their old signed part URL. The source link
still opens the editor's local PDF while the dialog is open.

`briefImport.generate` is now an action: it checks ownership and expiry, reads
the stored object, verifies its MIME type, bounded size and `%PDF-` signature,
and computes SHA-256 before the enqueue mutation rechecks permissions and
ownership. Scheduled inputs contain only the upload ID and content hash.
Dedupe uses the content hash, so fresh uploads of identical PDFs reuse an
existing run without hashing raw bytes in a mutation. The worker reads R2 and
checks the hash again before passing bytes as a native AI SDK file part,
rejecting any unexpected server-side replacement of the queued brief.
The 10 MB cap leaves base64/request headroom below Gemini's inline request
limit and its [50 MB PDF limit](https://ai.google.dev/gemini-api/docs/generate-content/document-processing).
The [AI SDK supports native PDF file parts](https://ai-sdk.dev/docs/foundations/prompts).

Cleanup runs one minute after the PUT URL expires, after the associated run
has completed or failed (including timeout). It aborts any incomplete multipart
upload, deletes the R2 object, and then the ownership record. Active runs and deletion failures retry every minute.
This also cleans invalid uploads, unused dedupe uploads, and uploads that never
become runs. Aborting the multipart upload prevents an in-flight or late part PUT
from creating an object after cleanup; only the server can finalize an upload.
R2 CORS and credentials use the existing project upload configuration. Save calls the plain
`completeAiRun` helper so output validation and run completion share a transaction;
`internal.aiRuns.complete` remains available to other features.

Trusted system instructions treat the brief as data and prohibit actions,
permission changes and contact details. Zod bounds titles, specifications,
20 outputs, 12 questions and real ISO dates. Common contact details are redacted
from scheduled text input and persisted draft fields. AI runs store the hash
and the cleaned structured draft, never the raw brief.

Generation creates no Project or Output. The editor chooses an existing Client,
edits the draft and supplies a Project deadline before explicit confirmation.
`briefImport.confirm` rechecks consent, requester and creation/edit permissions,
then calls `projects.create` and `projectOutputs.create` inside one mutation.
Their existing validation and authorization remain authoritative; failure rolls
back the whole confirmation. `briefImports` records run-to-project attribution
and makes repeated confirmation idempotent. Open questions become Project notes.

## Transcript feedback (#81)

Owners and Editors with Project edit access can attach one SRT/VTT transcript
to a Media Version. Uploading again replaces it: the old transcript, its
segments and saved AI matches are deleted in the same mutation, and a match run
started on the old transcript fails at save. The pure parser limits uploads to
32 KB, 300 cues, 500 characters per cue and 24 hours. It handles BOM/CRLF,
multiline cues, VTT identifiers/settings and metadata, strips subtitle markup
and rejects invalid timestamps or empty/reversed cues. Parsed rows live in `transcriptSegments`,
with version/source attribution in `transcripts`; no original upload is stored.

Comment timestamps match an enclosing cue, otherwise the nearest cue within
two seconds. Ties prefer the cue with the latest start; this also handles shared
boundaries. Queries compute these matches locally, including new comments.
AI is only editor-triggered for up to 20 ambiguous comments per version and
requires Workspace opt-in. Input contains cue text/timestamps/IDs and comment
text/timestamps, not author names or review-cut URLs. Serialized input remains
bounded by the shared 64 KB limit.

The model returns one exact supplied segment ID or null per comment position.
Both the worker and save mutation reject unknown IDs, duplicate/missing comments
and cross-version references. Save rechecks consent/access and atomically
completes the run and writes `transcriptMatches`. The internal Media Version UI
shows matched dialogue beside comments and revision items, links to the source
cue and labels model-selected matches `AI-drafted`. Public portal responses do
not include transcripts.

## Revision rounds and change orders (#78)

`revisionRoundsRules.ts` holds the pure rules. For each active Project Output,
versions are ordered by number and version N+1 closes a round when version N's
earliest client comment is not later than N+1's creation. Several comments on
one version count once; versions without feedback in between add nothing. A
latest version with feedback is an open round, shown but not counted. An editor
correction is stored as an adjustment to the computed count, floored at zero, so
later rounds still add to it. Included rounds come from the Project, then the
Workflow Template, then the Workspace default; none means no limit. The round
basis says what they cover: `per_output` (each output separately, the default)
or `per_project` (all outputs together). The Project basis overrides the
Workspace default. Per output, each output's rounds over the limit add up; per
project, extra rounds are the summed rounds of all outputs minus the limit, and
no single output carries billable extra rounds. Amounts are computed in whole
cents from the Workspace's saved per-round and hourly rates. Counting covers at
most 20 active outputs.

`revisionRounds.ts` serves the summary with the limit, basis and their sources
(anyone who can view the Project; rates only for Owners/Editors with edit
access), project limits, basis and corrections (Owners/Editors with edit
access), and Workspace defaults, basis, template limits and rates (writes
require the Workspace Owner, the same check as AI consent). Tables live in
`revisionScopeTables.ts`.

`changeOrders.generate` requires an Owner or Editor with Project edit access,
opt-in, and extra rounds or editor-entered extra hours (quarter hours, at most
500). The editor picks up to 20 revision items from each output's newest two
versions; possible-new-scope items are listed first but never added
automatically. Input holds the project and output titles, counts, the limit
and its basis (per-output extra rounds are null per project), currency, rates,
computed amounts and chosen item themes/text (300 characters); no client names,
emails, contact details or portal tokens. The facts are stored on a
`changeOrderDrafts` row at enqueue time. `changeOrders.save` rejects any draft
containing a number (digits, thousands separators and decimals, compared
to the cent) that is not in those facts, including digits in supplied titles and
item text, and rejects drafts that omit a computed total. It then rechecks
consent and access and atomically completes the run. The Project overview shows
the subject and message labelled `AI-drafted` with output and revision item
links; editors edit, save and copy it. Nothing is sent.

## Provider credentials and live verification

Declare `GOOGLE_GENERATIVE_AI_API_KEY` and optional `OPENAI_API_KEY` in Convex's environment configuration. Set their values only in the intended deployment's environment variables; never in browser variables, source files, screenshots or issue bodies. Use a billing-enabled Gemini project in production, not the free tier. Configure a provider spending budget before paid verification. Default feature generation to Gemini Flash; OpenAI integrations must use `store: false`.

No Convex AI Gateway subscription is needed when using provider keys directly. A deployment, its credentials and authorization to deploy/test must be confirmed separately. This change adds an optional consent field and a new table; existing workspaces remain opted out without a backfill.
