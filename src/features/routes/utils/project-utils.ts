import type { WorkItem, WorkTypeConfig } from "@/lib/types";
import { PROJECT_STATUS_VALUES, type ProjectStatus } from "@/lib/domain-values";
import type { IntegrationLinks } from "@/lib/integrations";
import {
  integrationServices,
  isIntegrationServiceId,
  isValidIntegrationUrl,
  normalizeIntegrationLink,
} from "@/lib/integrations";
import { dateTime, isIsoDate, todayDate } from "./date-utils";
import { safeMoneyValue } from "./number-utils";
import { isDoneStatus } from "./status-utils";

const statusOptions: ProjectStatus[] = [...PROJECT_STATUS_VALUES];

export function validateProject(
  item: WorkItem,
  type: WorkTypeConfig,
  workTypeOptions: string[]
) {
  if (!item.title.trim()) return "Project name is required.";
  if (!statusOptions.includes(item.status as ProjectStatus))
    return "Choose a valid project status.";
  if (
    !workTypeOptions.some(
      (option) => option.toLowerCase() === item.workType.trim().toLowerCase()
    )
  )
    return "Choose a valid project tag.";
  if (!item.startDate || !item.dueDate)
    return "Start and due dates are required.";
  if (!isIsoDate(item.startDate) || !isIsoDate(item.dueDate))
    return "Use valid start and due dates.";
  if (dateTime(item.startDate) > dateTime(item.dueDate))
    return "Due date must be on or after start date.";
  if (type.earningsMode !== "batch" && safeMoneyValue(item.earnings) < 0)
    return "Earnings must be zero or higher.";
  const invalidLink = integrationServices.find((service) => {
    const link = item.integrationLinks?.[service.id];
    return link?.url && !isValidIntegrationUrl(link.url);
  });
  if (invalidLink)
    return `${invalidLink.name} needs a valid http or https URL.`;
  return "";
}

export function normalizeProjectIntegrationLinks(
  links: IntegrationLinks | undefined
): IntegrationLinks {
  const normalized: IntegrationLinks = {};
  for (const service of integrationServices) {
    const link = normalizeIntegrationLink(links?.[service.id]);
    if (!link.url && !link.label && !link.notes) continue;
    if (!isIntegrationServiceId(service.id)) continue;
    normalized[service.id] = link;
  }
  return normalized;
}

export function dueBucket(project: WorkItem) {
  if (isDoneStatus(project.status)) return "Delivered";
  const due = new Date(`${project.dueDate}T00:00:00`);
  const today = todayDate();
  if (due.getTime() < today.getTime()) return "Overdue";
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);
  return due.getTime() <= weekEnd.getTime() ? "This Week" : "ALL";
}

function checklistItemKey(item: string, index: number) {
  return `${index}:${item.trim()}`.slice(0, 160);
}

export function normalizeChecklistCompleted(
  items: string[] = [],
  completed: Record<string, boolean> = {}
) {
  const allowedKeys = new Set(
    items.map((item, index) => checklistItemKey(item, index))
  );
  return Object.fromEntries(
    Object.entries(completed).filter(
      ([key, value]) => allowedKeys.has(key) && value === true
    )
  );
}
