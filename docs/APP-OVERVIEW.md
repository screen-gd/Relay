# Relay App Overview

Relay is a web workspace for freelance video editors and small post-production teams. It keeps clients, video jobs, workflow stages, deliverables, review notes, files, deadlines, payments, and team work in one place.

Relay manages the work around editing. It is not a video editor. Users still edit video in their normal tools, then attach files, hosted-video links, review links, and delivery records to the related Project.

This document describes the current repository as a product. It combines the current app code, the README, the feature and architecture docs, and related Relay task history.

## The basic model

Relay uses these records:

| Record            | What it means                                                                                                     |
| ----------------- | ----------------------------------------------------------------------------------------------------------------- |
| Workspace         | A studio space. It can start as a solo workspace and become a Team workspace.                                     |
| Client            | A lasting record for a person or company that commissions work.                                                   |
| Project Group     | An optional group of Projects for one Client, such as a retainer or campaign.                                     |
| Project           | One tracked video job. It drives workflow, delivery, reporting, and earnings.                                     |
| Project Output    | One promised result inside a Project, such as a master video, cutdown, thumbnail, captions, or document.          |
| Media Version     | A version of an Output. The latest version is current, while older versions and their comments remain in history. |
| Workflow Template | Reusable stages, Outputs, deadlines, roles, and checklist items copied into a new Project.                        |
| Client Portal     | A project-specific link for client review and delivery.                                                           |
| Client Hub        | An authenticated area where a Client Contact sees Projects published to that Client.                              |
| Salary Plan       | A contract that groups a set number of Delivered Projects into one payment batch.                                 |
| Salary Batch      | The recorded payment batch created when a Salary Plan reaches its required number of Projects.                    |
| Resource          | A saved external link or reference used by the Workspace.                                                         |

The default workflow is:

`Planned → Editing → Client Review → Revisions → Approved → Delivered`

Stages can be renamed and reordered. A Project moved to Delivered records its completion time and updates earnings and Salary Plan progress.

## How people use Relay

1. Create or select a Client.
2. Create a Project from a blank record or a Workflow Template.
3. Set the Project's dates, work type, value, notes, Client, group, stages, and assignees.
4. Add the promised Project Outputs.
5. Add Media Versions as external links or hosted files.
6. Share selected work through a Client Portal or Client Hub.
7. Collect comments and revision requests.
8. Resolve review threads, approve the current version, and deliver the Project.
9. Track payment, Salary Plans, reports, activity, and team work.

## Ways to use the app

### Local Mode

- Works without a Clerk account or Convex setup.
- Stores Projects, Clients, settings, Resources, and salary data in the browser.
- Supports JSON backup export and import.
- Import replaces Local Mode data.
- Client Portals and cloud-only collaboration are not available in Local Mode.

### Sample Workspace

- Provides a read-only example workspace.
- Lets a new user inspect the main dashboard and workflow before creating data.
- Blocks edits and explains that the sample is read-only.

### Cloud Account

- Uses Clerk for sign-in and Convex for synced data.
- Syncs work across devices.
- Enables team workspaces, cloud files, Client Portals, Client Hub, notifications, chat, and subscription features.
- Can import a Local Mode backup into a new empty cloud workspace. Existing cloud workspaces do not accept an automatic merge.

## Main workspace features

### Dashboard

The Dashboard is the daily work view. It includes:

- Production metrics.
- A searchable Project ledger.
- Filters for status, work type, Client, due date, and payment state.
- Sorting by newest, oldest, due date, value, and other work fields.
- An attention queue for overdue work, due-soon work, review work, and unpaid Delivered work.
- Active Project summaries grouped by workflow stage.
- Recent Project and Team activity.
- Salary progress.
- A Project inspector and quick access to Project actions.
- Project create, edit, delete, status, payment, and note actions, subject to permissions.

### Projects

Projects can be managed in personal or Team scope. The Projects view supports:

- Search by Project, Client, or note.
- Filters for Client, payment, work type, archive state, and assignee.
- Sorting by due date, name, stage, payment, and salary work.
- List and table-style views with status, progress, due date, Client, and value.
- Project Groups.
- Blank Project creation.
- Template-based Project creation.
- Edit, archive, delete, and status changes.
- Team assignment and permission checks.
- URL-backed filters so a view can be shared or revisited.

### Project workspace

Each Project has its own workspace with these views:

- **Overview:** workflow, stage, Client, Project Group, dates, value, work type, payment state, notes, and activity context.
- **Outputs and Versions:** promised results, categories, due dates, review states, current Media Version, version history, and links.
- **Client Review:** Client Portal setup, review state, feedback, and delivery controls.
- **Files and Links:** Project files, external links, visibility, download settings, and file management.
- **Activity:** Project events and changes.

Project-level actions include editing, deleting, changing stage, marking a billable Project paid or unpaid, adding comments, and opening connected services.

### Workflow Templates

Templates create repeatable Project setups. A template can define:

- Project type and work type.
- Workflow stages and their reporting purpose.
- Relative duration and due-date defaults.
- Starter Outputs and file categories.
- Checklist items.
- Roles and Client Portal defaults.

Built-in templates cover:

- YouTube Video.
- Instagram Reel.
- Corporate Event Video.
- Product Ad.
- Wedding Film.
- Theme Park / Social Campaign.
- Podcast Edit.
- Client Retainer Package.

Creator and Team plans can use custom Workflow Templates. Free workspaces keep the built-in and basic workflow options.

### Clients

The Clients page is a directory tied to Project history. It supports:

- Add and edit Client records.
- Client name, company, contact name, email, phone, and notes.
- Search by Client, company, contact, or email.
- Archive and restore behavior.
- Project history.
- Active, Delivered, Earned, Collected, and Outstanding totals.
- Opening a Client's Projects.
- Publishing selected Projects to the Client Hub.
- Adding Client Contacts for authenticated Hub access.

Client names are treated as records, not free text on each Project. The app also contains compatibility logic for older Projects that still hold a legacy Client name.

### Calendar and Timeline

The Calendar and Timeline provide date-based views of the same Project work:

- Month, week, and agenda views.
- Month navigation and a Today action.
- Week-start preference.
- Selected-day delivery list.
- Delivery counts.
- Links from calendar items to Projects.
- Chronological Timeline view for milestones, reviews, active work, and completed deliveries.
- Downloadable `.ics` calendar export.

The calendar is a generated export of Relay dates. It is not a live two-way calendar sync.

### Media

Media is a Project-package view. It supports:

- All, Active exports, and Delivered archive collections.
- Search by Project title, Client, or notes.
- List and grid views.
- Selected Project context.
- Progress and status display.
- Opening a Project for detailed file, Output, and review work.

### Project Outputs and Media Versions

Outputs represent what a Project promises to deliver. Each Output can have:

- Title, category, and due date.
- Review state: Draft, Sent to Client, Changes Requested, Approved, or Final Delivered.
- A current Media Version.
- Older Media Versions retained as history.
- External, YouTube, or Vimeo sources.
- Internal comments tied to a specific version.
- Next-action guidance, such as waiting for review or uploading a revision.

### Reviews and feedback

The Reviews page shows work that needs Client or editor attention. It supports:

- Review and Revision filters.
- Review queue counts.
- Project context.
- Review history.
- Client comments and revision requests.
- Optional timecodes on revision requests.
- Resolving and reopening comments.
- Status and delivery context without leaving the Project workflow.

### Files and storage

Relay has two file surfaces:

- **Files:** a workspace-wide searchable index.
- **Project Files:** the management surface inside the owning Project.

Supported hosted file types include PDF, plain text, Markdown, JPEG, PNG, and WebP. The current per-file limit is 20 MB. Files can be:

- Added to a Project or Output.
- Versioned.
- Categorized as Deliverable, Reference, or Asset.
- Marked with approval or review status.
- Made visible or hidden from a Client Portal.
- Made downloadable or view-only for clients.
- Archived, restored, or deleted.

Relay also supports external file and video links. Current Project uploads use Convex Storage. Cloudflare R2 storage is present in the settings surface as an upcoming capability, not as the current upload path.

### Client Portals

A Client Portal is a private, Project-specific sharing page. Editors can:

- Create and publish a portal link.
- Choose which Outputs and Project Files are visible.
- Show selected Project dates and public notes.
- Set an expiry date.
- Close the portal.
- Regenerate the token and invalidate the old link.
- Add optional PIN or password protection.
- Set a revision-request limit.
- Copy or open the portal link.

Clients can use the link without an internal Relay account to:

- View the published Project summary and progress.
- View the current published Output versions.
- Open allowed files and links.
- Submit review comments or revision requests.
- Include a timecode when the review flow allows it.

The public projection excludes internal notes, assignees, team data, money, salary data, private files, and other internal metadata.

### Client Hub

The Client Hub is different from a Project Portal:

- A Portal is a public bearer link for one Project.
- The Hub is an authenticated Client Contact area for Projects explicitly published to that Client.

The Hub shows published Project names, stages, progress, and due dates. Owners can add Client Contacts and set Hub branding. Client Hub requires a cloud account and a paid plan in the current entitlement model.

### Money, payments, and Salary Plans

Relay tracks the business side of editing work without collecting client payments itself.

Project money features include:

- Agreed Project value.
- Paid or unpaid state.
- Paid date.
- Earned, Collected, and Outstanding totals.
- Payment permissions for billable Delivered work.

Salary Plans support repeat contracts:

- Set the Client, required Delivered Project count, batch amount, start date, and notes.
- Count qualifying Delivered Projects toward a batch.
- Create a durable Salary Batch when the count is reached.
- Mark a batch received or unpaid.
- Add correction notes.
- Archive Plans while keeping completed batch history.

Local Mode keeps a simpler legacy salary batch flow. Durable Salary Plans require an authenticated cloud workspace and an eligible plan.

### Reports

Reports combine production and money data. They include:

- This month, quarter, year, custom dates, and all-time ranges.
- Prior-period comparisons.
- Earned, Collected, and Outstanding totals.
- Completed Project count.
- Linked Output count.
- Average turnaround.
- Delayed active stages.
- Earnings trend.
- Work mix.
- Client totals.
- Salary Batch Ledger.
- Editor Summary for Team work.
- Delivered Project list.
- Invoice draft CSV export.
- Payout report CSV export.

Invoice export creates local CSV drafts. Relay does not collect payments or act as a full invoicing or payment provider.

### Team Workspaces

Team Workspaces let a small post-production team share work. The Team area supports:

- Create and manage a Workspace.
- Invite members with an invite code and role.
- Active and pending member lists.
- Owner transfer.
- Member removal and leaving a Workspace.
- Project visibility policy, including whether Editors see all Team Projects.
- Project assignment.
- Role and per-member permission changes.
- Team activity feed.
- Project comments.
- Notification state.

Current internal roles are Owner, Editor, and Reviewer. The interface commonly presents Reviewer as Viewer. Permissions cover Project viewing, Project creation and editing, stage changes, review comments, Client Portals, finance, team management, and chat.

Viewers or Reviewers do not consume paid Editor seats in the documented plan model.

### Team Chat

Team Chat provides a focused Workspace conversation surface for:

- Production updates and handoffs.
- Short team messages.
- Project-linked context.
- `@name` notifications.
- Unread notification counts.
- Send, failure, and retry states.

Chat uses Team permissions and is not available in Local Mode.

### Resources and integrations

Resources are saved links that stay near the work. They support:

- Categories such as Asset Folder, Raw Footage, Music / SFX, Brand Assets, Review Link, Reference, and Other.
- Project association.
- Notes.
- Search and filtering.
- Create, edit, delete, copy, and open actions.

Integration settings currently save links and connection details. They do not grant API access or run a background sync. Supported service records include:

- Google Drive.
- Frame.io.
- Dropbox.
- OneDrive.
- Google Calendar.
- Slack.

Users can store global Workspace links and Project-specific links for folders, review pages, channels, and calendar events.

### Settings and account management

Settings cover:

- Workspace name and profile details.
- Workflow stages and default Workflow Template.
- Project tags and production defaults.
- Salary defaults and currency.
- Team project visibility.
- Member permissions.
- Notifications.
- Theme: Light, Dark, or System.
- Accent color.
- Interface density.
- Time zone.
- Date format.
- Week start.
- Currency.
- Integration records and Project links.
- Local backup and restore.
- Analytics consent.

The Account surface uses Clerk for account and authentication settings. The Profile and Organization surfaces manage public editor identity, Workspace identity, and published work context.

### Public editor profiles

An editor can publish a public profile at `/u/[slug]`. The profile can include:

- Name and username.
- Profile image.
- Title and bio.
- Location and time zone.
- Active Project count.
- Delivered edit count.
- Average turnaround.
- Selected public Projects with status, due date, and progress.

Only the information selected for publication is shown.

### Subscription and plan access

The app has a subscription surface backed by Clerk and Convex Workspace entitlements. The current capability model is:

| Plan    | Main access                                                                                                                                                        |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Free    | Unlimited basic Projects and Clients, basic workflow tracking, standard Client Portals, and external video links. No hosted file uploads or internal Team members. |
| Creator | Free features plus hosted file uploads, 5 GB storage, Client Hub, custom Portal branding, custom Workflow Templates, advanced Reports, and Salary Plans.           |
| Team    | Creator features plus Team Workspaces, roles, assignments, Team payouts, workload reporting, and included Editor seats.                                            |

The current backend gates file uploads, custom templates, advanced Reports, Salary Plans, custom Portal branding, Client Hub, and Team features by plan. The public plan document is marked as a proposed launch model, and the app can pause new purchases through configuration.

## Public, support, and access surfaces

The main repository also includes:

- Early access password page and return-to-route handling.
- Sign-in and sign-up through Clerk when cloud configuration is present.
- Contact page and contact form.
- Accessibility statement.
- Privacy policy and policy alias route.
- Terms of service.
- Error and not-found recovery pages.
- Client Portal landing page for missing or incomplete links.
- Public editor profile routes.

## Separate marketing website

The `website/` directory is a separate Next.js application. It is not the authenticated workspace. It provides:

- Relay product landing page.
- Interactive workflow story covering planning, client review, and delivery.
- Interactive dashboard demonstration.
- Product and pricing sections.
- Early access waitlist page and form.
- Waitlist API route.
- Public links to privacy, social accounts, and contact email.

The marketing app deploys separately from the main Relay Worker through OpenNext on Cloudflare. Related repo tasks also show that its build and responsive layout are maintained separately from the main app.

## Security and privacy behavior

- Clerk authenticates cloud users.
- Convex derives authorization from the authenticated identity rather than trusting a client-supplied user ID.
- Team and Project permissions are checked in Convex functions.
- Public Portal and Client Hub responses use client-safe projections instead of raw internal records.
- Portal links are bearer secrets. Editors can expire, close, password-protect, or regenerate them.
- Portal passwords are stored as derived hashes with salts, not as plain text.
- Hosted file downloads use short-lived signed links.
- Optional analytics require consent and redact Client names, Project names, comments, files, links, tokens, and money values.

These controls describe the implementation in this repository. They are not a claim of formal security certification.

## Current boundaries

Relay currently does not:

- Edit, render, or transcode video inside the app.
- Replace a full NLE, DAM, or review platform.
- Run real OAuth integrations or background sync for the saved service links.
- Provide live two-way calendar synchronization.
- Collect client payments.
- Generate and send full invoices. It exports invoice drafts as CSV.
- Use Cloudflare R2 for the current Project upload path. R2 is marked as upcoming.

## Technical shape

- Next.js App Router 16.
- React 19 and TypeScript.
- Clerk authentication.
- Convex reactive backend and database.
- Browser local storage for Local Mode.
- Convex Storage for current hosted Project files.
- Tailwind CSS, owned Radix-based UI primitives, Lucide icons, Motion, TanStack Table, Recharts, and Sonner.
- dnd-kit for keyboard-accessible stage interaction.
- OpenNext and Cloudflare Workers for deployment.
- Vitest, `convex-test`, and Playwright for tests.

## Related implementation context

The Relay task history shows a few themes that matter when reading the current code:

- Clerk and Convex identity migrations were used to restore synced Projects, Outputs, Clients, and settings after identity-key changes.
- Client records now use canonical relationships while keeping compatibility fallbacks for older Project data.
- UI work has focused on the Dashboard, Calendar, Projects, Project details, Clients, Settings, sidebar spacing, and responsive marketing pages.
- The marketing site and the main workspace have separate build and deployment paths.

The product definition above describes the app's capabilities. It is not a list of future tickets, and plan pricing or purchase availability should be checked against the current billing configuration before being published.
