import type { WorkItem } from "@/lib/types";
import { createdTime, dateTime } from "@/features/routes/utils/date-utils";
import { isDoneStatus } from "@/features/routes/utils/status-utils";

export function buildClientSummaries(
  projects: WorkItem[],
  savedClients: string[] = []
) {
  const groups = new Map<string, { name: string; projects: WorkItem[] }>();
  for (const client of savedClients) {
    const clientName = client.trim();
    if (!clientName) continue;
    groups.set(clientName.toLowerCase(), { name: clientName, projects: [] });
  }
  for (const project of projects) {
    const clientName = project.client?.trim();
    if (!clientName) continue;
    const key = clientName.toLowerCase();
    const existing = groups.get(key);
    if (existing) {
      existing.projects.push(project);
    } else {
      groups.set(key, { name: clientName, projects: [project] });
    }
  }

  return [...groups.values()]
    .map(({ name, projects: clientProjects }) => {
      const active = clientProjects.filter(
        (project) => !isDoneStatus(project.status)
      );
      const nextProject = [...active].sort(
        (a, b) => dateTime(a.dueDate) - dateTime(b.dueDate)
      )[0];
      const latestProject = [...clientProjects].sort(
        (a, b) => createdTime(b) - createdTime(a)
      )[0];
      return {
        name,
        projectCount: clientProjects.length,
        activeCount: active.length,
        nextDue: nextProject?.dueDate || "",
        latestProject: latestProject?.title || "",
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
