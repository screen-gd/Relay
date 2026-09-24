"use client";

import { useEffect, useMemo, useState } from "react";
import type { SettingsState, WorkItem } from "@/lib/types";
import { normalizeOptionalTimecode } from "@/lib/timecode";
import {
  ContentSection,
  MetricItem,
  MetricStrip,
  PageContent,
  PageHeader,
  SplitPane,
  WorkspacePage,
} from "@/components/workspace-page";
import { Button as OwnedButton } from "@/components/ui/button";
import { Badge as OwnedBadge } from "@/components/ui/badge";
import { FieldLayout } from "@/components/ui/field-layout";
import { Input as OwnedInput } from "@/components/ui/input";
import { Switch as OwnedSwitch } from "@/components/ui/switch";
import { Textarea as OwnedTextarea } from "@/components/ui/textarea";
import { trackOptionalEvent } from "@/lib/telemetry";
import { cn } from "@/lib/utils";
import { useTeamController } from "./team-controller";
import {
  TEAM_INVITE_CODE_PATTERN,
  TEAM_MEMBER_PERMISSION_LABELS,
  TEAM_PROJECT_COMMENT_LIMIT,
  TEAM_WORKSPACE_NAME_LIMIT,
  teamRoleOptions,
} from "./team-constants";
import { buildClientSummaries, isValidEmail } from "./team-utils";
import { copyText } from "@/features/routes/shared/clipboard";
import { EmptyPanel } from "@/features/routes/shared/empty-panel";
import { formatDate } from "@/features/routes/utils/date-utils";
import {
  Bell,
  Clock3,
  Copy,
  FolderKanban,
  LoaderCircle,
  UserRound,
  Users,
} from "lucide-react";
import { ProjectSelect } from "@/features/projects/project-select";

type EditableTeamRole = "Editor" | "Viewer";

function editableTeamRole(role: string): EditableTeamRole {
  return role === "Reviewer" ? "Viewer" : "Editor";
}

function serverTeamRole(role: EditableTeamRole): "Editor" | "Reviewer" {
  return role === "Viewer" ? "Reviewer" : "Editor";
}

export function TeamDesignPage({
  projects,
  settings,
}: {
  projects: WorkItem[];
  settings: SettingsState;
}) {
  const [workspaceName, setWorkspaceName] = useState(
    settings.studioName || "Relay Team"
  );
  const [inviteCode, setInviteCode] = useState("");
  const [inviteForm, setInviteForm] = useState<{
    email: string;
    role: EditableTeamRole;
  }>({ email: "", role: "Editor" });
  const [commentBody, setCommentBody] = useState("");
  const [commentTimecode, setCommentTimecode] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [teamError, setTeamError] = useState("");
  const [inviteCopyLabel, setInviteCopyLabel] = useState("Copy Invite Code");
  const [busyAction, setBusyAction] = useState("");
  const {
    isSignedIn,
    isUserLoaded,
    openSignIn,
    openSignUp,
    isConvexAuthenticated,
    isConvexAuthLoading,
    teamData,
    createWorkspace,
    joinWorkspace,
    inviteMember,
    updateMemberRole,
    updateMemberPermissions,
    transferOwnership,
    normalizeLegacyRoles,
    removeMember,
    leaveWorkspace,
    addProjectComment,
    markNotificationRead,
    markAllNotificationsRead,
    teamProjects,
    selectedProject,
    projectComments,
  } = useTeamController({ projects, selectedProjectId });
  const teamProjectTitles = useMemo(
    () =>
      Object.fromEntries(
        teamProjects.map((project) => [project.id, project.title])
      ),
    [teamProjects]
  );
  const clients = buildClientSummaries(teamProjects, settings.customClients);
  const activeMembers =
    teamData?.members.filter((member) => member.status === "active") ?? [];
  const pendingInvites =
    teamData?.members.filter((member) => member.status === "invited") ?? [];
  const unreadNotifications =
    teamData?.notifications.filter((notification) => !notification.read)
      .length ?? 0;
  const canManageTeam = Boolean(teamData?.currentMember.permissions.manageTeam);
  const canCommentProjects = Boolean(
    teamData?.currentMember.permissions.commentProjects
  );
  const canLeaveWorkspace = Boolean(
    teamData && teamData.currentMember.role !== "Owner"
  );
  const inviteCodeIsValid = TEAM_INVITE_CODE_PATTERN.test(inviteCode.trim());
  const inviteEmailIsValid = isValidEmail(inviteForm.email);

  function displayTeamRole(role: string): EditableTeamRole {
    return editableTeamRole(role);
  }

  useEffect(() => {
    if (!teamProjects.length) {
      if (selectedProjectId) setSelectedProjectId("");
      return;
    }
    if (!teamProjects.some((project) => project.id === selectedProjectId)) {
      setSelectedProjectId(teamProjects[0].id);
    }
  }, [selectedProjectId, teamProjects]);

  useEffect(() => {
    if (
      !teamData?.workspace ||
      !canManageTeam ||
      !teamData.members.some((member) => member.role === "Client")
    )
      return;
    void normalizeLegacyRoles({ teamId: teamData.workspace._id }).catch(
      (error) => {
        setTeamError(
          error instanceof Error
            ? error.message
            : "Legacy team roles could not be updated."
        );
      }
    );
  }, [canManageTeam, normalizeLegacyRoles, teamData]);

  async function runTeamAction<T>(label: string, action: () => Promise<T>) {
    setBusyAction(label);
    setTeamError("");
    try {
      await action();
    } catch (error) {
      setTeamError(
        error instanceof Error ? error.message : "Team action failed."
      );
    } finally {
      setBusyAction("");
    }
  }

  function formatActivityTime(value: string) {
    return new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));
  }

  async function copyInviteCode(code: string) {
    const copied = await copyText(code);
    setInviteCopyLabel(copied ? "Copied" : "Copy Failed");
    window.setTimeout(() => setInviteCopyLabel("Copy Invite Code"), 1800);
  }

  function teamProjectLabel(projectId?: string) {
    if (!projectId) return "";
    return teamProjectTitles[projectId] ?? "Deleted team project";
  }

  function showTeamProject(projectId?: string) {
    if (!projectId || !teamProjectTitles[projectId]) return;
    setSelectedProjectId(projectId);
  }

  return (
    <WorkspacePage family="administration">
      <PageHeader
        eyebrow="Workspace / Team"
        title="Team"
        description="Manage members, shared project comments, notifications, and workspace activity."
      />
      <PageContent className="space-y-5">
        <MetricStrip columns={4}>
          {[
            {
              label: "Active members",
              value: String(activeMembers.length),
              helper: `${pendingInvites.length} pending invite${pendingInvites.length === 1 ? "" : "s"}`,
              icon: Users,
              highlighted: true,
            },
            {
              label: "Team projects",
              value: String(teamProjects.length),
              helper: "Shared production work",
              icon: FolderKanban,
            },
            {
              label: "Client contacts",
              value: String(clients.length),
              helper: "From shared projects",
              icon: UserRound,
            },
            {
              label: "Unread updates",
              value: String(unreadNotifications),
              helper: "Mentions and activity",
              icon: Bell,
              highlighted: unreadNotifications > 0,
            },
          ].map((metric) => {
            const Icon = metric.icon;
            return (
              <MetricItem
                key={metric.label}
                label={metric.label}
                value={metric.value}
                supporting={metric.helper}
                action={
                  <span
                    className={
                      metric.highlighted
                        ? "rounded-md bg-primary/15 p-2 text-primary"
                        : "rounded-md bg-muted p-2 text-muted-foreground"
                    }
                  >
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                }
              />
            );
          })}
        </MetricStrip>

        {teamError ? (
          <div
            role="alert"
            className="rounded-xl border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive shadow-sm"
          >
            {teamError}
          </div>
        ) : null}

        {!isUserLoaded ? (
          <ContentSection
            bodyClassName="flex min-h-28 items-center gap-3 p-6 text-sm text-[var(--app-muted)]"
            role="status"
          >
            <LoaderCircle
              aria-hidden="true"
              className="size-5 animate-spin text-primary"
            />
            Checking account status...
          </ContentSection>
        ) : !isSignedIn ? (
          <ContentSection
            title="Team access"
            description="Shared workspaces keep members, project comments, notifications, activity, and chat in sync."
            className="shadow-[var(--app-shadow-1)]"
          >
            <div className="max-w-3xl">
              <h2 className="text-xl font-semibold leading-tight md:text-2xl">
                Team workspaces require an account
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Local mode is available for solo tracking, but invites, shared
                projects, comments, notifications, activity, and chat need Clerk
                sign-in so Convex can sync the right team workspace.
              </p>
              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <OwnedButton type="button" onClick={() => openSignUp()}>
                  Create Account
                </OwnedButton>
                <OwnedButton
                  type="button"
                  variant="outline"
                  onClick={() => openSignIn()}
                >
                  Sign In
                </OwnedButton>
              </div>
            </div>
          </ContentSection>
        ) : isConvexAuthLoading ? (
          <ContentSection
            bodyClassName="flex min-h-28 items-center gap-3 p-6 text-sm text-[var(--app-muted)]"
            role="status"
          >
            <LoaderCircle
              aria-hidden="true"
              className="size-5 animate-spin text-primary"
            />
            Connecting your account to Team sync...
          </ContentSection>
        ) : !isConvexAuthenticated ? (
          <ContentSection
            role="alert"
            className="border-destructive/50 bg-destructive/10 text-destructive"
            bodyClassName="p-6 shadow-sm md:p-8"
          >
            <h2 className="text-xl font-semibold">
              Team sync is not connected
            </h2>
            <p className="mt-2 text-sm leading-relaxed">
              Clerk sign-in is loaded, but Convex did not receive an
              authenticated token. Check `convex/auth.config.ts`, the Clerk JWT
              template audience, and the Clerk issuer environment variables
              before running the two-account Team smoke test.
            </p>
          </ContentSection>
        ) : teamData === undefined ? (
          <ContentSection
            bodyClassName="flex min-h-28 items-center gap-3 p-6 text-sm text-[var(--app-muted)]"
            role="status"
          >
            <LoaderCircle
              aria-hidden="true"
              className="size-5 animate-spin text-primary"
            />
            Loading team workspace...
          </ContentSection>
        ) : !teamData ? (
          <div className="grid gap-4 md:grid-cols-2">
            <ContentSection className="md:col-span-2" bodyMode="flush">
              <EmptyPanel
                title="Invite your team"
                body="Create a shared workspace or join one with an invite code to start collaborating."
                assetKey="team"
              />
            </ContentSection>
            <ContentSection
              title="Create a workspace"
              description="Team includes three editing seats. Viewers are free and do not use an editing seat."
            >
              <FieldLayout
                className="mt-5"
                label="Workspace name"
                description={`${workspaceName.length}/${TEAM_WORKSPACE_NAME_LIMIT} characters`}
              >
                <OwnedInput
                  value={workspaceName}
                  {...{ maxLength: TEAM_WORKSPACE_NAME_LIMIT }}
                  onChange={(event) => setWorkspaceName(event.target.value)}
                />
              </FieldLayout>
              <OwnedButton
                type="button"
                className="mt-4"
                disabled={Boolean(busyAction)}
                onClick={() =>
                  runTeamAction("create", () =>
                    createWorkspace({ name: workspaceName })
                  )
                }
              >
                Create Team Workspace
              </OwnedButton>
            </ContentSection>
            <ContentSection
              title="Join a workspace"
              description="Use the six-character code from your team owner. Your signed-in email must match a pending invite."
            >
              <FieldLayout
                className="mt-5"
                label="Invite code"
                description="Enter the six-character code from your team owner."
                error={
                  inviteCode.trim() && !inviteCodeIsValid
                    ? "Invite code must contain six letters or numbers."
                    : undefined
                }
              >
                <OwnedInput
                  value={inviteCode}
                  maxLength={6}
                  autoCapitalize="characters"
                  onChange={(event) =>
                    setInviteCode(
                      event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "")
                    )
                  }
                />
              </FieldLayout>
              <OwnedButton
                type="button"
                variant="outline"
                className="mt-4"
                disabled={Boolean(busyAction) || !inviteCodeIsValid}
                onClick={() =>
                  runTeamAction("join", () => joinWorkspace({ inviteCode }))
                }
              >
                Join Workspace
              </OwnedButton>
            </ContentSection>
          </div>
        ) : (
          <SplitPane
            data-slot="team-administration"
            ratio="supporting"
            primary={
              <div className="grid min-w-0 content-start gap-4">
                <ContentSection
                  title={teamData.workspace.name}
                  description={
                    canManageTeam ? (
                      <span>
                        Invite code{" "}
                        <span className="font-mono font-bold tracking-widest text-[var(--app-highlight)]">
                          {teamData.workspace.inviteCode}
                        </span>
                      </span>
                    ) : (
                      "Invite code is visible to team owners only."
                    )
                  }
                  actions={
                    <div className="flex flex-wrap items-center gap-2">
                      <OwnedBadge variant="secondary">
                        {displayTeamRole(teamData.currentMember.role)} access
                      </OwnedBadge>
                      {canManageTeam ? (
                        <OwnedButton
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            copyInviteCode(teamData.workspace.inviteCode)
                          }
                        >
                          <Copy aria-hidden="true" />
                          {inviteCopyLabel}
                        </OwnedButton>
                      ) : null}
                      {canLeaveWorkspace ? (
                        <OwnedButton
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={Boolean(busyAction)}
                          onClick={() =>
                            runTeamAction("leave", () =>
                              leaveWorkspace({ teamId: teamData.workspace._id })
                            )
                          }
                          className="border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        >
                          Leave Workspace
                        </OwnedButton>
                      ) : null}
                    </div>
                  }
                  bodyMode="flush"
                >
                  <div className="max-h-[min(560px,calc(100dvh-21rem))] divide-y divide-[var(--app-border)] overflow-y-auto overscroll-contain">
                    {teamData.members.map((member) => (
                      <article
                        key={member._id}
                        className="flex flex-col justify-between gap-3 p-4 md:flex-row md:items-center"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-semibold">
                              {member.name}
                            </h3>
                            <OwnedBadge
                              variant="outline"
                              className="rounded-md text-[10px]"
                            >
                              {displayTeamRole(member.role)}
                            </OwnedBadge>
                            <OwnedBadge
                              variant="secondary"
                              className={cn(
                                "rounded-md",
                                member.status === "active"
                                  ? "bg-[var(--status-success-bg)] text-[var(--status-success)]"
                                  : "bg-[var(--status-warning-bg)] text-[var(--status-warning)]"
                              )}
                            >
                              {member.status}
                            </OwnedBadge>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {member.email || "No email on profile"}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 md:justify-end">
                          {canManageTeam && member.role !== "Owner" ? (
                            <div className="w-full sm:w-40">
                              <ProjectSelect
                                label="Role"
                                value={displayTeamRole(member.role)}
                                options={teamRoleOptions
                                  .filter((role) => role !== "Owner")
                                  .map(displayTeamRole)}
                                onChange={(role) =>
                                  runTeamAction("role", () =>
                                    updateMemberRole({
                                      teamId: teamData.workspace._id,
                                      memberId: member._id,
                                      role: serverTeamRole(role),
                                    })
                                  )
                                }
                                compact
                              />
                            </div>
                          ) : (
                            Object.entries(member.permissions)
                              .filter(([, enabled]) => enabled)
                              .slice(0, 4)
                              .map(([permission]) => (
                                <OwnedBadge
                                  key={permission}
                                  variant="secondary"
                                  className="rounded-md text-[10px]"
                                >
                                  {permission}
                                </OwnedBadge>
                              ))
                          )}
                          {canManageTeam && member.role !== "Owner" ? (
                            <div className="grid w-full gap-2 sm:grid-cols-2">
                              {TEAM_MEMBER_PERMISSION_LABELS.map(
                                ([permission, label]) => (
                                  <label
                                    key={permission}
                                    className="flex items-center gap-2 text-xs text-muted-foreground"
                                  >
                                    <OwnedSwitch
                                      checked={Boolean(
                                        member.permissions[permission]
                                      )}
                                      aria-label={`${label} for ${member.name}`}
                                      onCheckedChange={(checked) =>
                                        runTeamAction("permission", () =>
                                          updateMemberPermissions({
                                            teamId: teamData.workspace._id,
                                            memberId: member._id,
                                            permissions: {
                                              ...member.permissions,
                                              [permission]: checked,
                                            },
                                          })
                                        )
                                      }
                                    />
                                    {label}
                                  </label>
                                )
                              )}
                            </div>
                          ) : null}
                          {canManageTeam &&
                          member.status === "active" &&
                          member.role !== "Owner" ? (
                            <OwnedButton
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={Boolean(busyAction)}
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `Transfer workspace ownership to ${member.name}? Workspace billing will not transfer. The current owner's personal Clerk subscription remains separate; manage or cancel it in Clerk as needed.`
                                  )
                                ) {
                                  void runTeamAction("transfer", () =>
                                    transferOwnership({
                                      teamId: teamData.workspace._id,
                                      memberId: member._id,
                                    })
                                  );
                                }
                              }}
                            >
                              Transfer ownership
                            </OwnedButton>
                          ) : null}
                          {canManageTeam && member.role !== "Owner" ? (
                            <OwnedButton
                              type="button"
                              size="sm"
                              variant="ghost"
                              disabled={Boolean(busyAction)}
                              onClick={() =>
                                runTeamAction("remove", () =>
                                  removeMember({
                                    teamId: teamData.workspace._id,
                                    memberId: member._id,
                                  })
                                )
                              }
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            >
                              {member.status === "invited"
                                ? "Cancel Invite"
                                : "Remove"}
                            </OwnedButton>
                          ) : null}
                        </div>
                      </article>
                    ))}
                  </div>

                  {canManageTeam ? (
                    <div className="border-t border-[var(--app-border)] p-5">
                      <h3 className="text-sm font-semibold">Invite member</h3>
                      <div className="mt-3 grid items-end gap-3 md:grid-cols-[minmax(0,1fr)_160px_120px]">
                        <FieldLayout
                          label="Email"
                          error={
                            inviteForm.email.trim() &&
                            !isValidEmail(inviteForm.email)
                              ? "Enter a valid email address."
                              : undefined
                          }
                        >
                          <OwnedInput
                            type="email"
                            value={inviteForm.email}
                            onChange={(event) =>
                              setInviteForm({
                                ...inviteForm,
                                email: event.target.value,
                              })
                            }
                          />
                        </FieldLayout>
                        <ProjectSelect
                          label="Role"
                          value={inviteForm.role}
                          options={teamRoleOptions
                            .filter((role) => role !== "Owner")
                            .map(displayTeamRole)}
                          onChange={(value) =>
                            setInviteForm({
                              ...inviteForm,
                              role: value,
                            })
                          }
                        />
                        <OwnedButton
                          type="button"
                          variant="outline"
                          disabled={Boolean(busyAction) || !inviteEmailIsValid}
                          onClick={() =>
                            runTeamAction("invite", async () => {
                              await inviteMember({
                                teamId: teamData.workspace._id,
                                email: inviteForm.email,
                                role: serverTeamRole(inviteForm.role),
                              });
                              setInviteForm({ email: "", role: "Editor" });
                            })
                          }
                        >
                          Invite
                        </OwnedButton>
                      </div>
                    </div>
                  ) : null}
                </ContentSection>

                <ContentSection
                  title="Project Comments"
                  description="Leave notes for the team. Use @name or @emailname to notify someone."
                  actions={
                    <div className="w-full md:w-64">
                      <ProjectSelect
                        label="Project"
                        value={selectedProject?.id ?? ""}
                        options={teamProjects.map((project) => project.id)}
                        labels={Object.fromEntries(
                          teamProjects.map((project) => [
                            project.id,
                            project.title,
                          ])
                        )}
                        onChange={setSelectedProjectId}
                      />
                    </div>
                  }
                  bodyClassName="grid gap-4"
                >
                  {selectedProject ? (
                    <div className="grid gap-4">
                      <div className="rounded-md border border-[var(--app-border)] bg-[var(--app-soft-panel)] p-3">
                        <p className="text-sm font-semibold">
                          {selectedProject.title}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {selectedProject.client || "No client"} ·{" "}
                          {selectedProject.status} · Due{" "}
                          {formatDate(
                            selectedProject.dueDate,
                            settings.dateFormat
                          )}
                        </p>
                      </div>
                      <div
                        className="grid max-h-[min(320px,40dvh)] gap-3 overflow-y-auto overscroll-contain"
                        aria-live="polite"
                      >
                        {projectComments === undefined ? (
                          <p className="text-sm text-muted-foreground">
                            Loading comments...
                          </p>
                        ) : projectComments.length ? (
                          projectComments.map((comment) => (
                            <article
                              key={comment._id}
                              className="rounded-md border border-[var(--app-border)] bg-[var(--app-panel)] p-3"
                            >
                              <p className="text-sm font-semibold">
                                {comment.authorName}{" "}
                                <time className="text-xs font-normal text-muted-foreground">
                                  {formatActivityTime(comment.createdAt)}
                                </time>
                              </p>
                              {comment.timecode ? (
                                <span className="mt-2 inline-flex items-center gap-1 rounded-md bg-primary/15 px-2 py-1 text-xs font-semibold text-primary">
                                  <Clock3
                                    aria-hidden="true"
                                    className="size-3.5"
                                  />
                                  {comment.timecode}
                                </span>
                              ) : null}
                              <p className="mt-2 whitespace-pre-wrap text-sm">
                                {comment.body}
                              </p>
                            </article>
                          ))
                        ) : (
                          <EmptyPanel
                            title="No project comments yet"
                            body="Team notes for this project will appear here in real time."
                          />
                        )}
                      </div>
                      {canCommentProjects ? (
                        <div className="grid items-start gap-3 md:grid-cols-[180px_minmax(0,1fr)_112px]">
                          <FieldLayout
                            label="Timecode (optional)"
                            description="MM:SS or HH:MM:SS"
                          >
                            <OwnedInput
                              value={commentTimecode}
                              placeholder="00:12"
                              maxLength={8}
                              inputMode="text"
                              onChange={(event) =>
                                setCommentTimecode(event.target.value)
                              }
                            />
                          </FieldLayout>
                          <FieldLayout
                            label="Project comment"
                            description={`${commentBody.length}/${TEAM_PROJECT_COMMENT_LIMIT} characters`}
                          >
                            <OwnedTextarea
                              value={commentBody}
                              rows={2}
                              {...{ maxLength: TEAM_PROJECT_COMMENT_LIMIT }}
                              onChange={(event) =>
                                setCommentBody(event.target.value)
                              }
                            />
                          </FieldLayout>
                          <OwnedButton
                            type="button"
                            className="md:mt-6"
                            disabled={
                              Boolean(busyAction) || !commentBody.trim()
                            }
                            onClick={() =>
                              runTeamAction("comment", async () => {
                                const normalizedTimecode =
                                  normalizeOptionalTimecode(commentTimecode);
                                await addProjectComment({
                                  teamId: teamData.workspace._id,
                                  projectId: selectedProject.id,
                                  body: commentBody,
                                  ...(normalizedTimecode
                                    ? { timecode: normalizedTimecode }
                                    : {}),
                                });
                                trackOptionalEvent("comment_added", {
                                  surface: "team",
                                });
                                setCommentBody("");
                                setCommentTimecode("");
                              })
                            }
                          >
                            Post
                          </OwnedButton>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <EmptyPanel
                      title="No team projects yet"
                      body="Create a team project to start leaving shared comments."
                    />
                  )}
                </ContentSection>
              </div>
            }
            secondary={
              <aside className="grid min-w-0 content-start gap-4">
                <ContentSection
                  title="Notifications"
                  description="Unread mentions and project updates that need your attention."
                  actions={
                    unreadNotifications ? (
                      <OwnedButton
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={Boolean(busyAction)}
                        onClick={() =>
                          runTeamAction("read-all", () =>
                            markAllNotificationsRead({
                              teamId: teamData.workspace._id,
                            })
                          )
                        }
                      >
                        Mark all read
                      </OwnedButton>
                    ) : null
                  }
                  bodyClassName="grid max-h-[min(460px,50dvh)] gap-2 overflow-y-auto overscroll-contain"
                >
                  {teamData.notifications.length ? (
                    teamData.notifications.map((notification) => (
                      <article
                        key={notification._id}
                        className={
                          notification.read
                            ? "flex justify-between gap-3 rounded-md border border-[var(--app-border)] p-3"
                            : "flex justify-between gap-3 rounded-md border border-[var(--app-accent)] bg-[var(--app-active)] p-3"
                        }
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium">
                            {notification.message}
                          </p>
                          {notification.projectId ? (
                            <p className="mt-1 text-xs font-semibold text-primary">
                              Project:{" "}
                              {teamProjectLabel(notification.projectId)}
                            </p>
                          ) : null}
                          <time className="mt-1 block text-xs text-muted-foreground">
                            {formatActivityTime(notification.createdAt)}
                          </time>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          {notification.projectId &&
                          teamProjectTitles[notification.projectId] ? (
                            <OwnedButton
                              type="button"
                              size="xs"
                              variant="ghost"
                              onClick={() => {
                                showTeamProject(notification.projectId);
                                if (!notification.read) {
                                  void markNotificationRead({
                                    notificationId: notification._id,
                                  });
                                }
                              }}
                            >
                              View
                            </OwnedButton>
                          ) : null}
                          {!notification.read ? (
                            <OwnedButton
                              type="button"
                              size="xs"
                              variant="ghost"
                              onClick={() =>
                                runTeamAction("read", () =>
                                  markNotificationRead({
                                    notificationId: notification._id,
                                  })
                                )
                              }
                            >
                              Mark read
                            </OwnedButton>
                          ) : null}
                        </div>
                      </article>
                    ))
                  ) : (
                    <EmptyPanel
                      title="No notifications"
                      body="Mentions and project notifications will appear here."
                    />
                  )}
                </ContentSection>

                <ContentSection
                  title="Activity Feed"
                  description="Workspace creation, invites, comments, and project updates."
                  bodyClassName="grid max-h-[min(460px,50dvh)] gap-2 overflow-y-auto overscroll-contain"
                >
                  {teamData.activity.length ? (
                    teamData.activity.map((activity) => (
                      <article
                        key={activity._id}
                        className="rounded-md border-l-2 border-[var(--app-accent)] bg-[var(--app-soft-panel)] p-3"
                      >
                        <p className="text-sm font-medium">
                          {activity.message}
                        </p>
                        {activity.projectId ? (
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <p className="text-xs font-semibold text-primary">
                              Project: {teamProjectLabel(activity.projectId)}
                            </p>
                            {teamProjectTitles[activity.projectId] ? (
                              <OwnedButton
                                type="button"
                                size="xs"
                                variant="link"
                                className="h-auto p-0"
                                onClick={() =>
                                  showTeamProject(activity.projectId)
                                }
                              >
                                View
                              </OwnedButton>
                            ) : null}
                          </div>
                        ) : null}
                        <time className="mt-1 block text-xs text-muted-foreground">
                          {formatActivityTime(activity.createdAt)}
                        </time>
                      </article>
                    ))
                  ) : (
                    <EmptyPanel
                      title="No activity yet"
                      body="Workspace creation, invites, comments, and project updates will appear here."
                    />
                  )}
                </ContentSection>
              </aside>
            }
          />
        )}
      </PageContent>
    </WorkspacePage>
  );
}
