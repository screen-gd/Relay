import type { Client, SettingsState } from "@/lib/types";
import type { ProjectAccess } from "@/features/projects/project-access";
import type { WorkspaceOutput } from "@/features/workspace-discovery/workspace-discovery";
import { projectHref } from "@/features/projects/project-view";
import { settingsNavigation } from "@/features/settings/settings-navigation";
import { isSalaryWorkType } from "@/features/routes/utils/work-type-utils";

export type WorkspaceNavigationData = Pick<
  ProjectAccess,
  "projects" | "activeTeamMembers" | "sample" | "canManageFinance"
> & {
  clients: readonly Client[];
  outputs: readonly WorkspaceOutput[];
};

type NavigationItem = { id: string; label: string; href: string };

export function buildHubNavigation({
  hub,
  data,
  settings,
}: {
  hub: string;
  data: WorkspaceNavigationData;
  settings: SettingsState;
}) {
  const projects = data.projects.filter((project) => !project.archived);
  const projectItem = (
    project: WorkspaceNavigationData["projects"][number]
  ): NavigationItem => ({
    id: project.id,
    label: project.title,
    href: projectHref({ projectId: project.id, sample: data.sample }),
  });
  const recent = [...projects].sort(
    (a, b) =>
      (Date.parse(b.createdAt || "") || 0) -
      (Date.parse(a.createdAt || "") || 0)
  );
  const group = (label: string, items: NavigationItem[]) => ({ label, items });
  switch (hub) {
    case "projects": {
      const inProgress = projects.filter(
        (project) => !["Delivered", "Cancelled"].includes(project.status)
      );
      const ids = new Set(inProgress.map(({ id }) => id));
      return [
        group("In progress", inProgress.map(projectItem)),
        group(
          "Recent",
          recent
            .filter(({ id }) => !ids.has(id))
            .slice(0, 8)
            .map(projectItem)
        ),
      ].filter(({ items }) => items.length);
    }
    case "clients":
      return [
        group(
          "Clients",
          data.clients
            .filter((client) => !client.archived)
            .map((client) => ({
              id: client.id,
              label: client.name,
              href: `/clients#${encodeURIComponent(client.id)}`,
            }))
        ),
      ];
    case "feedback": {
      const openOutputs = data.outputs.filter(
        (output) =>
          !output.archived &&
          ["sent_to_client", "changes_requested"].includes(
            output.reviewState ?? ""
          ) &&
          projects.some(({ id }) => id === output.projectId)
      );
      const covered = new Set(openOutputs.map(({ projectId }) => projectId));
      return [
        group("Open reviews", [
          ...openOutputs.map((output) => ({
            id: output.id,
            label: output.title,
            href: `${projectHref({ projectId: output.projectId, sample: data.sample, view: "outputs" })}#output-${encodeURIComponent(output.id)}`,
          })),
          ...projects
            .filter(
              (project) =>
                !covered.has(project.id) &&
                ["Review", "Revision", "Client Review"].includes(project.status)
            )
            .map((project) => ({
              ...projectItem(project),
              href: projectHref({
                projectId: project.id,
                sample: data.sample,
                view: "review",
              }),
            })),
        ]),
      ];
    }
    case "reports":
      return [
        group(
          "Unpaid invoices",
          data.canManageFinance
            ? projects
                .filter(
                  (project) =>
                    project.status === "Delivered" &&
                    !project.paid &&
                    project.earnings > 0 &&
                    !project.salaryPlanId &&
                    !isSalaryWorkType(project.workType, settings)
                )
                .map(projectItem)
            : []
        ),
      ];
    case "team":
      return [
        group(
          "Members",
          data.activeTeamMembers.map((member) => ({
            id: member.userId,
            label: member.name || member.email,
            href: `/team#member-${encodeURIComponent(member.userId)}`,
          }))
        ),
        group("Team", [
          { id: "team-chat", label: "Team chat", href: "/team-chat" },
        ]),
      ];
    case "settings":
      return [
        group(
          "Settings",
          settingsNavigation.map(({ id, label }) => ({
            id,
            label,
            href: `/settings#${id}`,
          }))
        ),
      ];
    default:
      return [group("Recent projects", recent.slice(0, 8).map(projectItem))];
  }
}
