import type { FileCategory, FileStatus } from "./domain-values";
import type {
  SavedProjectTemplate,
  WorkItem,
  WorkflowStage,
  WorkflowStagePurpose,
} from "./types";

export type ProjectTemplateDeliverable = {
  title: string;
  category: FileCategory;
  initialStatus: FileStatus;
};

export type ProjectTemplate = SavedProjectTemplate;

const stage = (
  id: string,
  label: string,
  purpose: WorkflowStagePurpose
): WorkflowStage => ({ id, label, purpose });

const deliverable = (
  title: string,
  category: FileCategory = "Deliverable"
): ProjectTemplateDeliverable => ({
  title,
  category,
  initialStatus: "draft",
});

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: "relay-default-workflow",
    name: "Relay Default Workflow",
    description: "A clear production path from planning through delivery.",
    projectType: "Video production",
    workType: "freelance",
    durationDays: 10,
    workflowStages: [
      stage("planned", "Planned", "planned"),
      stage("editing", "Editing", "editing"),
      stage("client-review", "Client Review", "client_review"),
      stage("revisions", "Revisions", "revisions"),
      stage("approved", "Approved", "approved"),
      stage("delivered", "Delivered", "delivered"),
    ],
    deliverables: [deliverable("Final master")],
    checklistItems: [
      "Confirm brief",
      "Check export settings",
      "Confirm client approval",
    ],
  },
  {
    id: "youtube-video",
    name: "YouTube Video",
    description:
      "Long-form creator edit with review, packaging, and publishing.",
    projectType: "Long-form video",
    workType: "channel",
    durationDays: 10,
    workflowStages: [
      stage("brief", "Brief", "planned"),
      stage("assembly", "Assembly", "editing"),
      stage("rough-cut", "Rough Cut", "editing"),
      stage("review", "Review", "client_review"),
      stage("final-cut", "Final Cut", "approved"),
      stage("published", "Published", "delivered"),
    ],
    deliverables: [
      deliverable("16:9 master"),
      deliverable("Thumbnail source", "Asset"),
      deliverable("Captions"),
    ],
    checklistItems: [
      "Confirm runtime and audience",
      "Add chapters or markers",
      "Check music licensing",
      "Run final QC",
    ],
  },
  {
    id: "instagram-reel",
    name: "Instagram Reel",
    description:
      "Fast vertical edit with hook, captions, sound design, and social export.",
    projectType: "Short-form social",
    workType: "freelance",
    durationDays: 4,
    workflowStages: [
      stage("concept", "Concept", "planned"),
      stage("selects", "Selects", "editing"),
      stage("first-cut", "First Cut", "editing"),
      stage("caption-pass", "Caption Pass", "editing"),
      stage("review", "Review", "client_review"),
      stage("export", "Export", "delivered"),
    ],
    deliverables: [
      deliverable("9:16 master"),
      deliverable("Captioned version"),
      deliverable("Cover frame", "Asset"),
    ],
    checklistItems: [
      "Hook lands in first three seconds",
      "Keep text inside safe zones",
      "Check loop point",
      "Export platform-ready codec",
    ],
  },
  {
    id: "corporate-event-video",
    name: "Corporate Event Video",
    description:
      "Event coverage workflow for selects, interviews, highlight film, and archive.",
    projectType: "Event coverage",
    workType: "freelance",
    durationDays: 14,
    workflowStages: [
      stage("ingest", "Ingest", "planned"),
      stage("sync", "Sync", "editing"),
      stage("selects", "Selects", "editing"),
      stage("assembly", "Assembly", "editing"),
      stage("client-review", "Client Review", "client_review"),
      stage("finishing", "Finishing", "approved"),
      stage("delivery", "Delivery", "delivered"),
    ],
    deliverables: [
      deliverable("Event highlight"),
      deliverable("Speaker cutdowns"),
      deliverable("Clean interview selects", "Reference"),
    ],
    checklistItems: [
      "Back up all camera cards",
      "Sync external audio",
      "Verify names and titles",
      "Archive project and masters",
    ],
  },
  {
    id: "podcast-edit",
    name: "Podcast Edit",
    description:
      "Multi-camera episode workflow with audio cleanup, full episode, and clips.",
    projectType: "Podcast",
    workType: "freelance",
    durationDays: 7,
    workflowStages: [
      stage("ingest", "Ingest", "planned"),
      stage("sync", "Sync", "editing"),
      stage("dialogue-edit", "Dialogue Edit", "editing"),
      stage("multicam-cut", "Multicam Cut", "editing"),
      stage("review", "Review", "client_review"),
      stage("clips", "Clips", "approved"),
      stage("publish", "Publish", "delivered"),
    ],
    deliverables: [
      deliverable("Full video episode"),
      deliverable("Audio episode"),
      deliverable("Social clips"),
      deliverable("Show notes", "Reference"),
    ],
    checklistItems: [
      "Remove false starts and long pauses",
      "Normalize dialogue loudness",
      "Add intro and sponsor reads",
      "Create chapter markers",
    ],
  },
  {
    id: "client-retainer-package",
    name: "Client Retainer Package",
    description:
      "Repeatable monthly package for a batch of planned edits and approvals.",
    projectType: "Retainer package",
    workType: "freelance",
    durationDays: 30,
    workflowStages: [
      stage("monthly-planning", "Monthly Planning", "planned"),
      stage("asset-intake", "Asset Intake", "editing"),
      stage("batch-production", "Batch Production", "editing"),
      stage("client-review", "Client Review", "client_review"),
      stage("revisions", "Revisions", "revisions"),
      stage("delivery", "Delivery", "delivered"),
      stage("monthly-wrap", "Monthly Wrap", "approved"),
    ],
    deliverables: [
      deliverable("Monthly content batch"),
      deliverable("Platform variants"),
      deliverable("Source asset register", "Reference"),
      deliverable("Reusable brand assets", "Asset"),
    ],
    checklistItems: [
      "Confirm monthly quantity",
      "Lock content calendar",
      "Track revision allowance",
      "Prepare monthly delivery summary",
    ],
  },
];

export function templateNotes(template: ProjectTemplate) {
  return [
    `Project type: ${template.projectType}`,
    `Workflow: ${template.workflowStages.map((item) => item.label).join(" -> ")}`,
    `Suggested deliverables:\n${template.deliverables.map((item) => `- ${item.title} [${item.category}]`).join("\n")}`,
    `Checklist:\n${template.checklistItems.map((item) => `- [ ] ${item}`).join("\n")}`,
  ].join("\n\n");
}

export function applyProjectTemplate(
  template: ProjectTemplate,
  options: {
    profileId: string;
    startDate: string;
    dueDate: string;
    workType: string;
    baseNotes?: string;
    teamId?: string;
  }
): Omit<WorkItem, "id"> {
  return {
    profileId: options.profileId,
    title: template.name,
    client: "",
    status: "Planned",
    workflowStageId: template.workflowStages[0]?.id ?? "planned",
    workType: options.workType,
    startDate: options.startDate,
    dueDate: options.dueDate,
    earnings: 0,
    notes: [templateNotes(template), options.baseNotes]
      .filter(Boolean)
      .join("\n\n"),
    integrationLinks: {},
    teamId: options.teamId,
    assigneeUserIds: [],
    templateId: template.id,
    templateProjectType: template.projectType,
    workflowStages: template.workflowStages.map((stage) => ({ ...stage })),
    templateDeliverables: template.deliverables.map((item) => ({ ...item })),
    checklistItems: [...template.checklistItems],
  };
}
