# 06 — HIGH — Delivery promises "Payment plan progress: 1/5" and every money surface then reads 0

**Impact:** the app tells the editor their delivery moved a payment batch, records the delivery, and then
reports zero everywhere that matters — dashboard salary progress, `/reports` Earned/Paid/Unpaid, delivered
edits, and the batch list. One of the two numbers is wrong, and both are what someone gets paid from.

**Confidence:** the observation is solid and reproducible. The _scope_ is not fully pinned: I could only
run it in Local Mode (no account, no obtainable plan), so a cloud workspace may compute the batch through
the Convex path instead. Re-run step 4 below on a cloud workspace before treating it as confirmed
production behaviour — the self-contradiction within one Local Mode session is already a defect.

## Contract clauses

- `docs/design/features/reports.md` — "Preserve metrics, payout calculations, paid/outstanding batches,
  period selection, invoice/payout CSV exports, and permission states"; States include "no period data,
  no results, export pending/success/error, stale/offline data, and read-only state".
- `docs/design/features/dashboard.md` — "salary progress" is a preserved feature, and "Filters update all
  relevant modules without losing selection."
- `docs/design/system/states-feedback.md` — "Errors sit beside the failed action and keep entered data."
  A silent disagreement between a confirmation and the resulting totals is the same class of problem.

## Verified anchors

- `src/features/projects/project-controller.ts:88-95` — the confirmation text is built from
  `preview.progress` and `preview.requiredProjectCount`:

  ```ts
  : `This moves the current Payment batch to ${preview.progress}/${preview.requiredProjectCount} Projects toward ${formatMoney(preview.amount)}.`
  ```

- `src/features/projects/project-controller.ts:104-122` — the write: `options.workflow.transitionStage`,
  then `moveProjectToStage(project, stageId, result.completedAt ?? new Date().toISOString())`.
- `src/components/precision-dashboard.tsx:104-105` — `salaryEdits`, `salaryBatchProgress` (the dashboard's
  own source for the module that reads 0/5).
- `/reports` renders `earned`, `delivered`, and the "Payment batches" section from
  `src/components/precision-workspaces.tsx` (the Earned labels are at `:559` and `:1509`).

## Repro (Local Mode, reproducible today)

1. `pnpm dev:next`, Local Mode, then seed one project whose `workType` is `"Job / Salary"` from the
   browser console:

   ```js
   localStorage.setItem(
     "video-editing-work-tracker:v1",
     JSON.stringify([
       {
         id: "flow-project",
         profileId: "video-editor",
         createdAt: "2026-09-01T08:00:00.000Z",
         title: "Flow project",
         client: "Acme Studio",
         clientId: "c1",
         status: "Planned",
         workflowStageId: "planned",
         workflowStages: [
           { id: "planned", label: "Planned", purpose: "planned" },
           { id: "editing", label: "Editing", purpose: "editing" },
           {
             id: "client-review",
             label: "Client Review",
             purpose: "client_review",
           },
           { id: "delivered", label: "Delivered", purpose: "delivered" },
         ],
         workType: "Job / Salary",
         startDate: "2026-09-01",
         dueDate: "2026-10-14",
         earnings: 500,
         notes: "note",
       },
     ])
   );
   localStorage.setItem(
     "video-editing-work-tracker:settings:v1",
     JSON.stringify({
       profileName: "Audit Editor",
       currencyCode: "USD",
       salaryWorkType: "Job / Salary",
       salaryBatchSize: 5,
       salaryBatchAmount: 10000,
       projectTags: ["Job / Salary", "Freelance"],
       theme: "Dark",
     })
   );
   ```

2. Go to `/projects?view=board`.
3. Click "Change stage for Flow project" → **Delivered** → confirm.
4. Read, in this order: the confirmation text, the toast, `localStorage`, then `/` and `/reports`.

Captured in one session, in that order:

```
CONFIRM    Mark Flow project as Delivered? Relay will record the delivery time.
           This moves the current Payment batch to 1/5 Projects toward $10,000.
TOAST      Flow project delivered. Payment plan progress: 1/5.
STORED     project.status = "Delivered", completedAt = "2026-10-12T12:29:28.730Z", earnings = 500
           video-editing-work-tracker:salary-batches:v1 = null
DASHBOARD  ... Paid $0   $0 unpaid   Salary batch 0 / 5 edits   Mark paid   0%
REPORTS    Earned $0   Paid $0   Unpaid $0   Delivered edits 0   0 salary edits
           Payment batches 0 batches
```

Evidence: `renders/RELA-14/flow-salary-after-delivery.png`,
`renders/RELA-14/flow-reports-after-delivery.png`.

## What is actually wrong

The confirmation and the toast use `preview.progress`, computed at the moment of the stage change. The
dashboard and `/reports` read the _stored_ state — `salaryEdits` / `salaryBatchProgress` in the dashboard
and the earned/delivered aggregation in `/reports` — and that state never moved: no salary-batch record
was written (`salary-batches:v1` is `null`), and `Earned` stayed `$0` even though the project is
`Delivered` with `earnings: 500`.

Two functions answer "what does delivering this project change?" and they disagree. Fix the disagreement,
not one symptom.

## Fix direction

1. Establish which number is correct by reading the salary/earnings derivation for the local path and for
   `convex/salaryPlans.ts`. The confirmation must be derived from the same source as the dashboard, so
   that `preview.progress` cannot differ from the stored progress after the write.
2. Write the batch record on delivery if the delivered project counts. A `Job / Salary` project that the
   confirmation counts as "1/5" must produce a stored batch (or a stored counter) that the dashboard and
   `/reports` read back.
3. Make `Earned` agree with a delivered project's `earnings`. A delivered project with `earnings: 500`
   and a `completedAt` timestamp must not leave `Earned` at `$0`.
4. Add a test that asserts the confirmation string, the toast, the dashboard counter and the `/reports`
   total all agree after one delivery. This is the regression that matters.

## Acceptance criteria

- After the repro above, the dashboard salary module, `/reports` Earned/Delivered edits, and the Payment
  batches list all reflect the delivered project.
- The number in the pre-confirmation dialog equals the number shown after confirming.
- A Delivered project with earnings contributes to `Earned`.
- The same assertions pass on a cloud workspace with the equivalent flow (required before closing).

## Out of scope

Do not rename Earned/Paid/Unpaid — that vocabulary change is a separate decision (row 16 in
`reports/RELA-16.md`). Do not change the client-project ("records $X as earned") path, which reported
correctly in the same session.
