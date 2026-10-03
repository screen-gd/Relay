import { describe, expect, it } from "vitest";
import type {
  Client,
  SalaryPlan,
  SavedProjectTemplate,
  WorkItem,
  WorkflowStage,
} from "@/lib/types";
import {
  createProjectStageBoard,
  deriveProjectGroupSummary,
  getProjectStageMenuChoices,
  getProjectWorkflowStage,
  groupProjectsByStage,
  dueDateAfterDelivery,
  moveProjectToStage,
  normalizeProjectGroup,
  normalizeProjectGroups,
  projectStatusUpdate,
  validateNewProjectInput,
  type ProjectGroup,
} from "./project-domain";
import { DEFAULT_WORKFLOW_STAGES } from "@/lib/workflow-templates";

const clients: Client[] = [
  {
    id: "client-a",
    name: "A",
    company: "",
    contactName: "",
    email: "",
    phone: "",
    notes: "",
    archived: false,
  },
  {
    id: "client-b",
    name: "B",
    company: "",
    contactName: "",
    email: "",
    phone: "",
    notes: "",
    archived: false,
  },
];

const template: SavedProjectTemplate = {
  id: "template-a",
  name: "Standard",
  description: "",
  projectType: "video",
  workType: "freelance",
  durationDays: 7,
  workflowStages: [
    { id: "planned", label: "Planned", purpose: "planned" },
    { id: "delivered", label: "Delivered", purpose: "delivered" },
  ],
  deliverables: [],
  checklistItems: [],
};

function project(overrides: Partial<WorkItem>): WorkItem {
  const base: WorkItem = {
    id: "project",
    profileId: "profile",
    title: "Project",
    clientId: "client-a",
    status: "Planned",
    workType: "freelance",
    startDate: "2026-08-01",
    dueDate: "2026-08-31",
    earnings: 0,
    notes: "",
  };
  return { ...base, ...overrides };
}

describe("Project Group domain", () => {
  it("normalizes a valid group and rejects a missing Client", () => {
    const result = normalizeProjectGroup(
      {
        id: " group-a ",
        name: " Campaign ",
        clientId: " client-a ",
        archived: false,
        createdAt: "2026-08-24T00:00:00.000Z",
      },
      clients
    );
    expect(result).toEqual({
      ok: true,
      value: {
        id: "group-a",
        name: "Campaign",
        clientId: "client-a",
        notes: "",
        archived: false,
        createdAt: "2026-08-24T00:00:00.000Z",
      },
    });
    expect(
      normalizeProjectGroup(
        { id: "group-b", name: "Run", clientId: "missing", archived: false },
        clients
      )
    ).toEqual({
      ok: false,
      errors: ["Client does not exist."],
    });
  });

  it("drops invalid stored Project Groups at the persistence boundary", () => {
    expect(
      normalizeProjectGroups(
        [
          {
            id: "group-a",
            name: "Campaign",
            clientId: "client-a",
            archived: false,
            createdAt: "2026-08-24T00:00:00.000Z",
          },
          {
            id: "group-b",
            name: "Missing",
            clientId: "missing",
            archived: false,
          },
        ],
        clients
      )
    ).toHaveLength(1);
  });

  it("derives progress and delivered money from the group's Projects", () => {
    const group: ProjectGroup = {
      id: "group-a",
      name: "Campaign",
      clientId: "client-a",
      notes: "",
      archived: false,
      createdAt: "2026-08-24T00:00:00.000Z",
    };
    const projects = [
      project({
        id: "paid",
        projectGroupId: "group-a",
        status: "Delivered",
        earnings: 400,
        paid: true,
      }),
      project({
        id: "unpaid",
        projectGroupId: "group-a",
        status: "Delivered",
        earnings: 250,
        paid: false,
      }),
      project({
        id: "active",
        projectGroupId: "group-a",
        status: "In Progress",
        earnings: 900,
      }),
      project({
        id: "other",
        projectGroupId: "group-b",
        status: "Delivered",
        earnings: 999,
        paid: true,
      }),
    ];

    expect(deriveProjectGroupSummary(group, projects)).toEqual({
      projectCount: 3,
      deliveredCount: 2,
      progress: 2 / 3,
      earned: 650,
      collected: 400,
      outstanding: 250,
    });
  });
});

describe("new Project input", () => {
  const groups: ProjectGroup[] = [
    {
      id: "group-a",
      name: "Campaign",
      clientId: "client-a",
      notes: "",
      archived: false,
      createdAt: "2026-08-24T00:00:00.000Z",
    },
    {
      id: "group-b",
      name: "Other",
      clientId: "client-b",
      notes: "",
      archived: false,
      createdAt: "2026-08-24T00:00:00.000Z",
    },
  ];
  const salaryPlan: SalaryPlan = {
    id: "plan-a",
    clientId: "client-a",
    requiredProjectCount: 5,
    amount: 1000,
    startDate: "2026-08-24",
    notes: "",
    archived: false,
  };

  it("accepts and normalizes the short form", () => {
    expect(
      validateNewProjectInput(
        {
          name: " Launch film ",
          clientId: " client-a ",
          projectGroupId: " group-a ",
          workflowTemplateId: " template-a ",
          dueDate: "2026-09-01",
          financialType: "client",
        },
        { clients, projectGroups: groups, workflowTemplates: [template] }
      )
    ).toEqual({
      ok: true,
      value: {
        name: "Launch film",
        clientId: "client-a",
        projectGroupId: "group-a",
        workflowTemplateId: "template-a",
        dueDate: "2026-09-01",
        financialType: "client",
      },
    });
  });

  it("rejects extra fields and a Project Group owned by another Client", () => {
    expect(
      validateNewProjectInput(
        {
          name: "Launch film",
          clientId: "client-a",
          projectGroupId: "group-b",
          dueDate: "2026-09-01",
          financialType: "client",
          notes: "not part of the short form",
        },
        { clients, projectGroups: groups, workflowTemplates: [template] }
      )
    ).toEqual({
      ok: false,
      errors: [
        "Unexpected field: notes.",
        "Project Group must belong to the selected Client.",
      ],
    });
  });

  it("requires an active Payment plan and keeps it tied to its Client", () => {
    const references = {
      clients,
      projectGroups: groups,
      workflowTemplates: [template],
      salaryPlans: [salaryPlan],
    };
    expect(
      validateNewProjectInput(
        {
          name: "Salary edit",
          clientId: "client-a",
          dueDate: "2026-09-01",
          financialType: "salary-plan",
        },
        references
      )
    ).toMatchObject({ ok: false, errors: ["Payment plan is required."] });
    expect(
      validateNewProjectInput(
        {
          name: "Salary edit",
          clientId: "client-b",
          dueDate: "2026-09-01",
          financialType: "salary-plan",
          salaryPlanId: "plan-a",
        },
        references
      )
    ).toMatchObject({
      ok: false,
      errors: ["Payment plan Client must match the selected Client."],
    });
    expect(
      validateNewProjectInput(
        {
          name: "Salary edit",
          clientId: "client-a",
          dueDate: "2026-09-01",
          financialType: "salary-plan",
          salaryPlanId: "plan-a",
        },
        references
      )
    ).toEqual({
      ok: true,
      value: {
        name: "Salary edit",
        clientId: "client-a",
        dueDate: "2026-09-01",
        financialType: "salary-plan",
        salaryPlanId: "plan-a",
      },
    });
  });
});

describe("Project delivery", () => {
  it("records the delivery time, then clears current delivery state when reopened", () => {
    const source = project({ status: "In Progress" });
    const delivered = projectStatusUpdate(
      source,
      "Delivered",
      "2026-08-24T12:00:00.000Z"
    );
    expect(delivered).toEqual({
      status: "Delivered",
      completedAt: "2026-08-24T12:00:00.000Z",
      dueDate: "2026-08-24",
    });
    expect(
      projectStatusUpdate(
        { ...source, ...delivered },
        "Revision",
        "2026-08-25T12:00:00.000Z"
      )
    ).toEqual({
      status: "Revision",
      completedAt: undefined,
      dueDate: "2026-08-24",
    });
    expect(
      moveProjectToStage(
        { ...source, ...delivered },
        "Revision",
        "2026-08-25T12:00:00.000Z"
      )
    ).toMatchObject({ status: "Revision", completedAt: undefined });
  });

  it("does not replace an existing delivery time on a repeated Delivered update", () => {
    expect(
      projectStatusUpdate(
        project({
          status: "Delivered",
          completedAt: "2026-08-24T12:00:00.000Z",
        }),
        "Delivered",
        "2026-08-25T12:00:00.000Z"
      )
    ).toEqual({
      status: "Delivered",
      completedAt: "2026-08-24T12:00:00.000Z",
      dueDate: "2026-08-31",
    });
  });

  it("pulls the due date back to an early delivery and keeps it for a late one", () => {
    expect(dueDateAfterDelivery("2026-09-10", "2026-09-07")).toBe("2026-09-07");
    expect(dueDateAfterDelivery("2026-09-10", "2026-09-12")).toBe("2026-09-10");
    expect(dueDateAfterDelivery("", "2026-09-07")).toBe("");
  });
});

describe("Project workflow board", () => {
  it("never places an active project with a stale stage in a delivered stage", () => {
    const stale = project({
      status: "In Progress",
      workflowStageId: "missing",
      workflowStages: [
        { id: "plan", label: "Planned", purpose: "planned" },
        { id: "done", label: "Delivered", purpose: "delivered" },
      ],
    });
    expect(getProjectWorkflowStage(stale).id).toBe("plan");
  });

  it("merges trimmed case-insensitive labels and resolves each workflow's own stage ID", () => {
    const first = project({
      id: "one",
      workflowStageId: "edit-a",
      workflowStages: [
        { id: "edit-a", label: "Editing", purpose: "editing" },
        { id: "done-a", label: "Delivered", purpose: "delivered" },
      ],
    });
    const second = project({
      id: "two",
      workflowStageId: "edit-b",
      workflowStages: [
        { id: "edit-b", label: " editing ", purpose: "editing" },
        { id: "done-b", label: " delivered ", purpose: "delivered" },
      ],
    });
    const { board, resolveMoveStage } = createProjectStageBoard([
      second,
      first,
    ]);
    expect(board.map(({ projects }) => projects.map(({ id }) => id))).toEqual([
      ["two", "one"],
      [],
    ]);
    expect(new Set(board.map(({ key }) => key)).size).toBe(2);
    expect(resolveMoveStage(first, board[1].key)).toBe("done-a");
    expect(resolveMoveStage(second, board[1].key)).toBe("done-b");
    expect(resolveMoveStage(second, "missing")).toBeUndefined();
    expect(
      groupProjectsByStage([first, second]).map(({ key, stage }) => ({
        key,
        stage,
      }))
    ).toEqual(board.map(({ key, stage }) => ({ key, stage })));
  });

  it("places custom stages between their default neighbours", () => {
    const custom = project({
      id: "custom",
      workflowStageId: "sound",
      workflowStages: [
        ...DEFAULT_WORKFLOW_STAGES.slice(0, 2),
        { id: "sound", label: "Sound mix", purpose: "editing" },
        ...DEFAULT_WORKFLOW_STAGES.slice(2),
      ],
    });
    const standard = project({ id: "standard", workflowStageId: "editing" });
    const board = groupProjectsByStage([standard, custom]);
    expect(board.map(({ stage }) => stage.label)).toEqual([
      "Planned",
      "Editing",
      "Sound mix",
      "Client Review",
      "Revisions",
      "Approved",
      "Delivered",
    ]);
    expect(
      board.flatMap(({ projects }) => projects.map(({ id }) => id)).sort()
    ).toEqual(["custom", "standard"]);
    expect(
      groupProjectsByStage([custom, standard]).map(({ key }) => key)
    ).toEqual(board.map(({ key }) => key));
  });

  it("keeps delivered-purpose and cancelled columns after active work", () => {
    const custom = project({
      id: "custom",
      workflowStageId: "work",
      workflowStages: [
        { id: "published", label: "Published", purpose: "delivered" },
        { id: "work", label: "Work", purpose: "editing" },
      ],
    });
    const cancelled = project({ id: "cancelled-project", status: "Cancelled" });
    const board = groupProjectsByStage([custom, cancelled]);
    expect(board.slice(-3).map(({ stage }) => stage.label)).toEqual([
      "Delivered",
      "Cancelled",
      "Published",
    ]);
    expect(board.find(({ key }) => key === "cancelled")?.projects).toEqual([
      cancelled,
    ]);
  });

  it("merges transitive ID and label matches without losing current stages", () => {
    const projects = [
      project({
        id: "one",
        workflowStageId: "shared",
        workflowStages: [{ id: "shared", label: "Edit", purpose: "editing" }],
      }),
      project({
        id: "two",
        workflowStageId: "shared",
        workflowStages: [{ id: "shared", label: "Cut", purpose: "editing" }],
      }),
      project({
        id: "three",
        workflowStageId: "other",
        workflowStages: [{ id: "other", label: " cut ", purpose: "editing" }],
      }),
    ];
    const { board, resolveMoveStage } = createProjectStageBoard(projects);
    expect(board).toHaveLength(1);
    expect(board[0].projects).toEqual(projects);
    expect(resolveMoveStage(projects[2], board[0].key)).toBe("other");
  });

  it("keeps default order when custom workflows disagree", () => {
    const custom = project({
      workflowStages: [...DEFAULT_WORKFLOW_STAGES].reverse(),
    });
    expect(groupProjectsByStage([custom]).map(({ key }) => key)).toEqual(
      DEFAULT_WORKFLOW_STAGES.map(({ id }) => id)
    );
  });

  it("groups projects in copied stage order and keeps empty stages", () => {
    const projects = [
      project({
        id: "one",
        status: "Review",
        workflowStages: [
          { id: "planned", label: "Planned", purpose: "planned" },
          { id: "review", label: "Review", purpose: "client_review" },
          { id: "delivered", label: "Delivered", purpose: "delivered" },
        ],
      }),
      project({
        id: "two",
        status: "Delivered",
        workflowStages: [
          { id: "planned", label: "Planned", purpose: "planned" },
          { id: "review", label: "Review", purpose: "client_review" },
          { id: "delivered", label: "Delivered", purpose: "delivered" },
        ],
      }),
    ];
    const stages: WorkflowStage[] = [
      { id: "planned", label: "Planned", purpose: "planned" },
      { id: "review", label: "Review", purpose: "client_review" },
      { id: "delivered", label: "Delivered", purpose: "delivered" },
    ];
    expect(
      groupProjectsByStage(projects, stages).map(
        ({ stage, projects: items }) => [stage.id, items.map(({ id }) => id)]
      )
    ).toEqual([
      ["planned", []],
      ["review", ["one"]],
      ["delivered", ["two"]],
    ]);
  });

  it("offers an accessible normal move menu with the current stage disabled", () => {
    expect(
      getProjectStageMenuChoices({ title: "Launch Film", status: "Review" }, [
        { id: "planned", label: "Planned", purpose: "planned" },
        { id: "review", label: "Review", purpose: "client_review" },
        { id: "delivered", label: "Delivered", purpose: "delivered" },
      ])
    ).toEqual([
      {
        stage: { id: "planned", label: "Planned", purpose: "planned" },
        label: "Planned",
        current: false,
        disabled: false,
        ariaLabel: "Move Launch Film to Planned",
      },
      {
        stage: { id: "review", label: "Review", purpose: "client_review" },
        label: "Review",
        current: true,
        disabled: true,
        ariaLabel: "Launch Film, current stage Review",
      },
      {
        stage: { id: "delivered", label: "Delivered", purpose: "delivered" },
        label: "Delivered",
        current: false,
        disabled: false,
        ariaLabel: "Move Launch Film to Delivered",
      },
    ]);
  });
});
