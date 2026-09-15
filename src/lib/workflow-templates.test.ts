import { describe, expect, it } from "vitest";
import { validateWorkflowStages } from "./workflow-templates";
import type { WorkflowStage } from "./types";

describe("workflow template stages", () => {
  it("requires one delivered stage and keeps cancelled outside the ordered path", () => {
    const stages: WorkflowStage[] = [
      { id: "planned", label: "Planned", purpose: "planned" },
      { id: "editing", label: "Editing", purpose: "editing" },
      { id: "review", label: "Client Review", purpose: "client_review" },
      { id: "revisions", label: "Revisions", purpose: "revisions" },
      { id: "approved", label: "Approved", purpose: "approved" },
      { id: "delivery", label: "Delivered", purpose: "delivered" },
    ];
    expect(validateWorkflowStages(stages)).toBe("");
    expect(validateWorkflowStages(stages.filter((stage) => stage.purpose !== "delivered"))).toMatch(/delivered/i);
    expect(validateWorkflowStages([...stages, { id: "delivery-2", label: "Published", purpose: "delivered" }])).toMatch(/one delivered/i);
    expect(validateWorkflowStages([...stages.slice(0, 1), { id: "cancelled", label: "Cancelled", purpose: "editing" }, stages.at(-1)!])).toMatch(/cancelled/i);
  });

});
