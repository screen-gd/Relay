# 04 — HIGH — Project thumbnails print an invented clip runtime on projects that have no media

**Impact:** the projects table, the board, the inspector and the dashboard all show a runtime badge such
as `08:34` or `03:52` for projects that have no video, no output and no media version. An editor reading
the 50-row table takes those numbers for production facts. A screen-reader user is told a video
thumbnail exists.

## Contract clauses

- `docs/design/features/media-reviews.md` (Accessibility) — "Give thumbnails **alt text or a useful
  title**, expose version and review status as text, label media controls…"
- `docs/design/system/states-feedback.md` — "Status is understandable without color." (Not status that
  is invented.)
- `docs/design/system/states-feedback.md` (Anatomy) — status belongs in "skeleton, progress, empty
  state, no-results state, inline error, alert, toast, permission banner, read-only marker, and
  offline/stale marker". Nothing in the system allows a fabricated data value.

## Verified anchors

`src/components/precision-projects.tsx:238-247`

```tsx
function projectDuration(project: WorkItem) {
  let hash = 0;
  for (const char of project.title)
    hash = (hash * 33 + char.charCodeAt(0)) >>> 0;
  const minutes = 1 + (hash % 11);
  const seconds = (hash >>> 3) % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
```

`src/components/precision-projects.tsx:268-269` — the wrapper's accessible name:

```tsx
      role="img"
      aria-label={`${project.title} video thumbnail`}
```

`src/components/precision-projects.tsx:284` — the badge that renders it:
`{projectDuration(project)}`.

Call sites of `ProjectVideoThumbnail`: `:571` (table row), `:1189` (board card), `:1505` (inspector).

## Repro

1. Local Mode, create one project, do not add any output or media version.
2. Open `/projects?view=table`.
3. The first cell of the row shows a thumbnail with a duration badge, e.g. `03:52`.

It is stable per title and changes when you rename the project — proof that it is derived, not stored.
The same badge appears on `/projects?view=board`, in the inspector, in `/media` package cards and on the
dashboard project table.

Evidence: `renders/RELA-14/route-projects-desktop.png`,
`renders/RELA-14/route-media-desktop.png`, `renders/RELA-14/flow-projects-table-50.png`.

## Fix direction

Pick one, in this order of preference:

1. **Show the real thing.** If the project has media versions (see `src/features/project-outputs/` and the
   Media Version model), render the current version's real duration and label; when there is none, render
   no badge at all.
2. **Drop the number.** Keep the decorative gradient, delete `projectDuration()` and its badge, and set
   the accessible name to the project title with a neutral role (or `aria-hidden` on the decorative
   wrapper) so nothing claims a video exists.

Do not keep a placeholder duration "until real data lands": the number is indistinguishable from a real
one, which is the defect. Note that `projectColor()` (`:224-236`) is fine as-is —
`docs/design/system/color-themes.md` sanctions `--decorative-thumb-*` / `--media-package-*` as decorative
tokens with grouping meaning. The problem is only the fabricated measurement and the `role="img"` claim.

## Acceptance criteria

- No surface displays a clip runtime for a project with no media.
- The thumbnail wrapper's accessible name (or its absence) does not assert a video thumbnail exists when
  the project has none.
- `projectDuration` is deleted, or replaced by a value read from a media version, with the real-duration
  path covered by a test.
- A project with one real media version shows that version's real duration.

## Out of scope

Do not change the thumbnail's gradient palette, the row layout, or the `/media` collections. Ignore the
review status colours in the same component.
