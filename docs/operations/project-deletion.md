# Project deletion

Deleting a Project requires its Owner or an authorized Workspace manager. The existing confirmation remains the user action that authorizes deletion.

## What happens

The `projects.remove` mutation closes both kinds of Client Portal, removes the Project record, and schedules a durable `projectDeletions` job in one transaction. Project writes and new upload bindings then fail because the Project no longer exists.

The worker removes indexed batches of at most 25 records per transaction. It removes Project Outputs, Media Versions, Comments, transcripts and matches, revision items, Project AI drafts and runs (including confirmed brief-import results), Activity, notifications, stage assets, file versions, Project file metadata, saved Project links, Client Hub publication, revision scope, and upload reservations. Native uploads go through a server endpoint that binds the stored bytes to their reservation before returning an identifier. Native stored files and uncommitted bytes, including released reservations, are deleted with their rows.

New hosted uploads record the Workspace originally charged. Deletion credits that Workspace even if membership or ownership later changes. Older rows can use their committed storage reservation as evidence. If an older row has no reliable billing attribution, cleanup removes the data and records `unattributedStorageBytes` on the job rather than reducing a potentially unrelated Workspace's counter. Reconcile those historical counters from a reviewed inventory; the worker does not guess from current membership.

R2 object deletion happens before the corresponding metadata and retained quota are released. Failed object deletion retries after a minute. A final pass waits until existing signed upload URLs expire, then deletes their targets again so a late upload cannot restore an object. A five-minute cron resumes interrupted jobs from their stored phase. Completed jobs retain a Project identifier and completion metadata to reject stale imports that reuse the deleted identifier.

Shared Clients, Salary Plans, Salary Batches, Workspace-wide AI/financial summaries, and files held by external video hosts are preserved. Deleting a Project is not a complete account or Workspace erasure request.

## Freeing storage for one stage asset

Archive the asset, enable **Show archived assets**, then choose **Delete permanently**. For native uploads, the mutation deletes the file, releases its original Workspace's retained quota, and removes the asset row in one transaction. Project Activity remains. External links are removed without deleting the provider's file. Repeated deletion does not credit quota twice.

Stage upload APIs currently create native files only. Individual permanent deletion refuses R2 rows or legacy native rows without reliable original billing attribution; reconcile those through a reviewed operator procedure. Project-wide cleanup supports R2 and records unattributed legacy bytes as described above.

## Operator checks

- Inspect `projectDeletions` in the intended deployment. `completedAt` means all job phases finished; a missing value means cleanup is pending. Use `retryAfter` to distinguish a waiting upload target from an interrupted job.
- If R2 cleanup remains pending, inspect the action failure and the existing bucket access/configuration. Restore access and let retries finish. Do not delete the job or file rows to hide a storage failure.
- Check `unattributedStorageBytes` after cleanup. A positive value requires historical quota reconciliation; it does not mean that the file data is still present.
- For a complete Workspace/account erasure request, inventory shared records, credentials, storage, provider logs and backups separately. Removing Clerk identity alone does not prove that Convex data was removed.
- Record the actual backup/log retention and provider settings for the production accounts before confirming a full erasure. This repository does not establish a verified production retention period.

## Deployment scope

The secure native upload endpoint uses the Convex HTTP host (`*.convex.site`). The matching app CSP is included in PR #122. Publish that app CSP before deploying this backend: the currently served app policy does not allow that host. Apply a CSP-only update to the current app release if the backend does not yet serve the new frontend's functions. Then deploy the backend and the complete matching app. The existing upload response shape is unchanged, but changing the URL origin still requires the browser policy to permit it.

The schema update adds a job table and indexes. It does not backfill deletion jobs or purge orphaned records from past Project deletions. No production deletion test or bulk purge is part of deploying this code. Any cleanup of historical orphaned data needs its own reviewed inventory and authorization.

Local proof is in `apps/web/convex/projectDeletion.test.ts`: permission denial, immediate portal closure, stale uploads/identifier reuse, multiple cleanup batches, cross-Project file preservation, quota release, recovery after interruption, and R2 failure/late-upload retries.
