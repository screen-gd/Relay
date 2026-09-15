import {
  type WorkflowStage,
  type WorkflowStagePurpose,
} from "./types";

export const DEFAULT_WORKFLOW_STAGES: WorkflowStage[] = [
  { id: "planned", label: "Planned", purpose: "planned" },
  { id: "editing", label: "Editing", purpose: "editing" },
  { id: "client-review", label: "Client Review", purpose: "client_review" },
  { id: "revisions", label: "Revisions", purpose: "revisions" },
  { id: "approved", label: "Approved", purpose: "approved" },
  { id: "delivered", label: "Delivered", purpose: "delivered" },
];

export function workflowStagesFromLabels(
  labels: readonly string[],
  existing: readonly WorkflowStage[] = DEFAULT_WORKFLOW_STAGES
): WorkflowStage[] {
  const normalizedLabels = labels.map((label) => label.trim()).filter(Boolean);
  const unused = new Set(existing.map((stage) => stage.id));
  return normalizedLabels.map((label, index) => {
    const exact = existing.find(
      (stage) =>
        unused.has(stage.id) &&
        stage.label.toLowerCase() === label.toLowerCase()
    );
    const positional =
      existing[index] && unused.has(existing[index].id)
        ? existing[index]
        : undefined;
    const source = exact ?? positional;
    if (source) {
      unused.delete(source.id);
      return { ...source, label };
    }
    const purpose: WorkflowStagePurpose =
      index === 0
        ? "planned"
        : index === normalizedLabels.length - 1
          ? "delivered"
          : "editing";
    return { id: `stage-${crypto.randomUUID()}`, label, purpose };
  });
}

export function validateWorkflowStages(
  stages: readonly WorkflowStage[]
) {
  if (stages.length < 2) return "Add at least two workflow stages.";
  if (
    stages.some(
      (stage) =>
        stage.label.toLowerCase() === "cancelled" ||
        stage.label.toLowerCase() === "canceled"
    )
  ) {
    return "Cancelled stays outside the ordered workflow.";
  }
  if (new Set(stages.map((stage) => stage.id)).size !== stages.length) {
    return "Workflow stage IDs must be unique.";
  }
  if (
    new Set(stages.map((stage) => stage.label.toLowerCase())).size !==
    stages.length
  ) {
    return "Workflow stage labels must be unique.";
  }
  if (
    stages.filter((stage) => stage.purpose === "delivered").length !== 1
  ) {
    return "Keep exactly one Delivered-purpose stage.";
  }
  return "";
}
