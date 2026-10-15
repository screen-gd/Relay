import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
const settings = {
  studioName: "Free Studio",
  profileName: "Owner",
  profileUsername: "owner",
  profileTitle: "",
  profileBio: "",
  profileLocation: "",
  profileImageUrl: "",
  timeZone: "UTC",
  dateFormat: "YYYY-MM-DD",
  weekStart: "Mon",
  currencyCode: "USD",
  clients: [
    {
      id: "client",
      name: "Client",
      company: "",
      contactName: "",
      email: "",
      phone: "",
      notes: "",
      archived: false,
    },
  ],
  projectTags: [],
  salaryWorkType: "Salary",
  salaryBatchSize: 1,
  salaryBatchAmount: 100,
  projectStages: [],
  notifications: {},
  teamRole: "" as const,
  teamMembers: [],
  rolePermissions: {},
  integrationConfigs: {},
  theme: "dark",
  accentColor: "#ffffff",
  density: "compact",
};

test("a Creator owner completes a batch and retains payment history after returning to Free", async () => {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({
    subject: "owner",
    tokenIdentifier: "test|owner",
  });
  const other = t.withIdentity({
    subject: "other",
    tokenIdentifier: "test|other",
  });
  await owner.mutation(api.team.createWorkspace, { name: "Free Studio" });
  await t.run(async (ctx) => {
    const subscription = await ctx.db.query("workspaceSubscriptions").unique();
    if (!subscription) throw new Error("Subscription missing");
    await ctx.db.patch(subscription._id, {
      plan: "creator",
      subscriptionStatus: "active",
      billingPeriod: "monthly",
    });
  });
  await owner.mutation(api.settings.upsert, settings);
  const planId = await owner.mutation(api.salaryPlans.create, {
    clientId: "client",
    requiredProjectCount: 1,
    amount: 250,
    startDate: "2026-09-17",
    notes: "Original terms",
  });
  await owner.mutation(api.projects.create, {
    project: {
      id: "salary-project",
      assigneeUserIds: [],
      profileId: "video-editing",
      title: "Salary Project",
      clientId: "client",
      salaryPlanId: planId,
      workflowStages: [
        { id: "edit", label: "Edit", purpose: "editing" },
        { id: "done", label: "Delivered", purpose: "delivered" },
      ],
      workType: "Salary",
      startDate: "2026-09-17",
      dueDate: "2026-09-18",
      earnings: 0,
      notes: "",
    },
  });
  expect(
    await owner.mutation(api.projects.transitionStage, {
      projectId: "salary-project",
      stageId: "done",
    })
  ).toMatchObject({ kind: "salary", batchCreated: true });
  const batches = await owner.query(api.salaryPlans.listBatches, {});
  expect(batches).toHaveLength(1);
  const batch = batches[0];
  expect(batch).toMatchObject({
    salaryPlanId: planId,
    clientId: "client",
    requiredProjectCount: 1,
    amount: 250,
    planStartDate: "2026-09-17",
    planNotes: "Original terms",
    projectIds: ["salary-project"],
    paid: false,
    received: false,
  });
  await t.run(async (ctx) => {
    const subscription = await ctx.db.query("workspaceSubscriptions").unique();
    if (!subscription) throw new Error("Subscription missing");
    await ctx.db.patch(subscription._id, {
      plan: "free",
      subscriptionStatus: "free",
      billingPeriod: null,
    });
  });
  await owner.mutation(api.salaryPlans.update, {
    planId,
    changes: {
      clientId: "client",
      requiredProjectCount: 2,
      amount: 500,
      startDate: "2026-09-18",
      notes: "New terms",
    },
  });
  expect(await other.query(api.salaryPlans.listBatches, {})).toEqual([]);
  await expect(
    other.mutation(api.salaryPlans.setReceived, {
      batchId: batch._id,
      received: true,
    })
  ).rejects.toThrow("Salary Batch not found");
  await expect(
    t.mutation(api.salaryPlans.setReceived, {
      batchId: batch._id,
      received: true,
    })
  ).rejects.toThrow("Not authenticated");
  await owner.mutation(api.salaryPlans.setReceived, {
    batchId: batch._id,
    received: true,
    correctionNote: "Bank transfer",
  });
  expect(await owner.query(api.salaryPlans.listBatches, {})).toMatchObject([
    {
      _id: batch._id,
      requiredProjectCount: 1,
      amount: 250,
      planStartDate: "2026-09-17",
      planNotes: "Original terms",
      paid: true,
      received: true,
      correctionNote: "Bank transfer",
    },
  ]);
  expect(
    await owner.query(api.workspaceSubscriptions.getCurrent, {})
  ).toMatchObject({ plan: "free" });
});

test("Free supports clients, projects, external review, delivery and payments but blocks new payment plans", async () => {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({
    subject: "owner",
    tokenIdentifier: "test|owner",
  });
  const other = t.withIdentity({
    subject: "other",
    tokenIdentifier: "test|other",
  });
  await owner.mutation(api.team.createWorkspace, { name: "Free Studio" });
  await owner.mutation(api.settings.upsert, settings);
  expect(
    await owner.query(api.workspaceSubscriptions.getCurrent, {})
  ).toMatchObject({
    plan: "free",
    storageQuotaBytes: 0,
    editorSeatAllowance: 1,
    capabilities: {
      fileUploads: false,
      customWorkflowTemplates: false,
      advancedReports: false,
      salaryPlans: false,
      customPortalBranding: false,
      clientHub: false,
      teamFeatures: false,
    },
  });
  await expect(
    owner.mutation(api.salaryPlans.create, {
      clientId: "client",
      requiredProjectCount: 1,
      amount: 100,
      startDate: "2026-09-17",
      notes: "Owner contract",
    })
  ).rejects.toThrow("Creator or Team");
  await owner.mutation(api.projects.create, {
    project: {
      id: "free-project",
      assigneeUserIds: [],
      profileId: "video-editing",
      title: "Free Project",
      clientId: "client",
      workflowStages: [
        { id: "review", label: "Review", purpose: "client_review" },
        { id: "done", label: "Delivered", purpose: "delivered" },
      ],
      workType: "Freelance",
      startDate: "2026-09-17",
      dueDate: "2026-09-18",
      earnings: 100,
      notes: "Private",
    },
  });
  await owner.mutation(api.projectOutputs.create, {
    projectId: "free-project",
    output: { id: "video", title: "Video", category: "Deliverable" },
  });
  await owner.mutation(api.projectOutputs.addLinkedMediaVersion, {
    outputId: "video",
    version: {
      id: "v1",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      title: "Review cut",
    },
  });
  await owner.mutation(api.projectOutputs.update, {
    outputId: "video",
    changes: { reviewState: "approved" },
  });
  const portal = await owner.mutation(api.projectPortals.publish, {
    projectId: "free-project",
    config: {
      publicNotes: "Ready for review",
      showStartDate: false,
      showDueDate: true,
      selectedOutputIds: ["video"],
      expiresAt: null,
    },
  });
  await owner.mutation(api.projectPortals.setStatus, {
    portalId: portal.portalId,
    status: "open",
  });
  expect(
    await t.query(api.projectPortals.getByToken, { token: portal.token })
  ).toMatchObject({
    access: "active",
    outputs: [{ id: "video", currentVersion: { id: "v1" } }],
  });
  const comment = await t.mutation(api.mediaVersionComments.addPublicComment, {
    token: portal.token,
    outputId: "video",
    mediaVersionId: "v1",
    authorName: "Client",
    body: "Please check the final frame",
  });
  await owner.mutation(api.mediaVersionComments.setResolved, {
    commentId: comment.id,
    resolved: true,
  });
  expect(
    await owner.query(api.mediaVersionComments.listForProject, {
      projectId: "free-project",
    })
  ).toMatchObject([{ id: comment.id, resolved: true }]);
  await owner.mutation(api.projects.transitionStage, {
    projectId: "free-project",
    stageId: "done",
  });
  expect(await owner.query(api.projects.list, {})).toMatchObject([
    { id: "free-project", status: "Delivered" },
  ]);
  expect(await other.query(api.projects.list, {})).toEqual([]);
  await owner.mutation(api.projects.setPayment, {
    projectId: "free-project",
    paid: true,
  });
  // Paid delivered work leaves the live list and stays readable in history.
  expect(await owner.query(api.projects.list, {})).toEqual([]);
  expect(
    (
      await owner.query(api.projects.historyPage, {
        scope: "personal",
        paginationOpts: { numItems: 10, cursor: null },
      })
    ).page
  ).toMatchObject([{ id: "free-project", paid: true, lifecycle: "history" }]);
  await expect(
    other.mutation(api.projects.transitionStage, {
      projectId: "free-project",
      stageId: "review",
    })
  ).rejects.toThrow();
});

test("Free rejects paid public mutations without changing stored settings or entitlements", async () => {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({
    subject: "owner",
    tokenIdentifier: "test|owner",
    pla: "u:team",
  });
  const teamId = await owner.mutation(api.team.createWorkspace, {
    name: "Free Studio",
  });
  await owner.mutation(api.settings.upsert, settings);
  const customProjectTemplates = [
    {
      id: "custom",
      name: "Custom",
      description: "",
      projectType: "Video",
      workType: "freelance" as const,
      durationDays: 1,
      workflowStages: [],
      deliverables: [],
      checklistItems: [],
    },
  ];
  await expect(
    owner.mutation(api.settings.patch, { changes: { customProjectTemplates } })
  ).rejects.toThrow("Creator or Team");
  await expect(
    owner.mutation(api.settings.upsert, { ...settings, customProjectTemplates })
  ).rejects.toThrow("Creator or Team");
  await expect(
    owner.mutation(api.clientHub.setBranding, {
      brandName: "Custom",
      accentColor: "#ffffff",
    })
  ).rejects.toThrow("Creator or Team");
  await expect(
    owner.mutation(api.clientHub.addContact, {
      clientId: "client",
      email: "client@example.com",
      name: "Client",
    })
  ).rejects.toThrow("Creator or Team");
  await expect(
    owner.mutation(api.clientHub.setProjectPublished, {
      projectId: "free-project",
      published: true,
    })
  ).rejects.toThrow("Creator or Team");
  for (const role of ["Editor", "Reviewer"] as const) {
    await expect(
      owner.mutation(api.team.inviteMember, {
        teamId,
        email: `${role}@example.com`,
        role,
      })
    ).rejects.toThrow("Team plan");
  }
  expect(await owner.query(api.clientHub.getOwnerSettings, {})).toMatchObject({
    available: false,
  });
  expect(
    await owner.query(api.workspaceSubscriptions.getCurrent, {})
  ).toMatchObject({ plan: "free", storageQuotaBytes: 0 });
  expect(
    await t.run((ctx) => ctx.db.query("clientContacts").collect())
  ).toEqual([]);
  expect(
    await t.run((ctx) => ctx.db.query("settings").unique())
  ).not.toHaveProperty("customProjectTemplates");
});

test("retained Free members and Client Contacts cannot claim owner or paid access", async () => {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({
    subject: "owner",
    tokenIdentifier: "test|owner",
  });
  await owner.mutation(api.team.createWorkspace, { name: "Free Studio" });
  await owner.mutation(api.settings.upsert, settings);
  const planId = await t.run((ctx) =>
    ctx.db.insert("salaryPlans", {
      ownerUserId: "test|owner",
      clientId: "client",
      requiredProjectCount: 1,
      amount: 100,
      startDate: "2026-09-17",
      notes: "Private",
      archived: false,
      createdAt: "2026-09-17T00:00:00.000Z",
      updatedAt: "2026-09-17T00:00:00.000Z",
    })
  );
  await owner.mutation(api.projects.create, {
    project: {
      id: "retained-publication",
      assigneeUserIds: [],
      profileId: "video-editing",
      title: "Retained",
      clientId: "client",
      workflowStages: [
        { id: "edit", label: "Edit", purpose: "editing" },
        { id: "done", label: "Delivered", purpose: "delivered" },
      ],
      workType: "Freelance",
      startDate: "2026-09-17",
      dueDate: "2026-09-18",
      earnings: 100,
      notes: "",
    },
  });
  await t.run(async (ctx) => {
    const workspace = await ctx.db.query("teamWorkspaces").unique();
    if (!workspace) throw new Error("Workspace missing");
    for (const role of ["Editor", "Reviewer"] as const) {
      await ctx.db.insert("teamMembers", {
        teamId: workspace._id,
        userId: `test|${role}`,
        email: `${role}@example.com`,
        name: role,
        role,
        status: "active",
        permissions: { viewProjects: true },
        createdAt: "2026-09-17",
      });
    }
    await ctx.db.insert("clientContacts", {
      workspaceId: workspace._id,
      clientId: "client",
      email: "contact@example.com",
      name: "Contact",
      active: true,
      createdAt: "2026-09-17",
    });
    await ctx.db.insert("clientHubProjects", {
      workspaceId: workspace._id,
      clientId: "client",
      projectId: "retained-publication",
      publishedAt: "2026-09-17",
    });
  });
  for (const role of ["Editor", "Reviewer"] as const) {
    const member = t.withIdentity({
      subject: role,
      tokenIdentifier: `test|${role}`,
    });
    expect(
      await member.query(api.workspaceSubscriptions.getCurrent, {})
    ).toMatchObject({ plan: "free", canManageBilling: false });
    expect(await member.query(api.salaryPlans.list, {})).toEqual([]);
    await expect(
      member.mutation(api.salaryPlans.setArchived, { planId, archived: true })
    ).rejects.toThrow("Salary Plan not found");
    await expect(
      member.mutation(api.clientHub.setBranding, {
        brandName: "Wrong owner",
        accentColor: "#ffffff",
      })
    ).rejects.toThrow("Workspace Owner required");
  }
  const contact = t.withIdentity({
    subject: "contact",
    tokenIdentifier: "test|contact",
    email: "contact@example.com",
  });
  expect(await contact.query(api.clientHub.getMine, {})).toMatchObject({
    projects: [],
  });
  expect(await contact.query(api.salaryPlans.list, {})).toEqual([]);
  await expect(
    contact.mutation(api.clientHub.setBranding, {
      brandName: "Wrong owner",
      accentColor: "#ffffff",
    })
  ).rejects.toThrow("Workspace Owner required");
  expect(
    await t.run((ctx) => ctx.db.query("teamMembers").collect())
  ).toHaveLength(3);
  expect(
    await t.run((ctx) => ctx.db.query("clientContacts").collect())
  ).toHaveLength(1);
});

/** A Free owner's Project with a two-stage workflow. */
function freeProject(id: string) {
  return {
    id,
    assigneeUserIds: [],
    profileId: "video-editing",
    title: id,
    clientId: "client",
    workflowStages: [
      { id: "edit", label: "Edit", purpose: "editing" as const },
      { id: "done", label: "Delivered", purpose: "delivered" as const },
    ],
    workType: "Freelance",
    startDate: "2026-10-01",
    dueDate: "2026-10-20",
    earnings: 100,
    notes: "",
  };
}

test("Free allows 10 Projects in progress; delivering one frees a slot and reopening needs one", async () => {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({
    subject: "owner",
    tokenIdentifier: "test|owner",
  });
  await owner.mutation(api.team.createWorkspace, { name: "Free Studio" });
  await owner.mutation(api.settings.upsert, settings);
  expect(
    await owner.query(api.workspaceSubscriptions.getCurrent, {})
  ).toMatchObject({ openProjectLimit: 10 });
  for (let index = 1; index <= 10; index += 1)
    await owner.mutation(api.projects.create, {
      project: freeProject(`p${index}`),
    });
  await expect(
    owner.mutation(api.projects.create, { project: freeProject("p11") })
  ).rejects.toThrow("10 Projects in progress");

  await owner.mutation(api.projects.transitionStage, {
    projectId: "p1",
    stageId: "done",
  });
  await owner.mutation(api.projects.create, { project: freeProject("p11") });
  await expect(
    owner.mutation(api.projects.transitionStage, {
      projectId: "p1",
      stageId: "edit",
    })
  ).rejects.toThrow("10 Projects in progress");
  expect(
    await owner.query(api.projects.get, { projectId: "p1" })
  ).toMatchObject({ status: "Delivered", lifecycle: "awaiting_payment" });

  await owner.mutation(api.projects.setArchived, {
    projectId: "p2",
    archived: true,
  });
  await owner.mutation(api.projects.transitionStage, {
    projectId: "p1",
    stageId: "edit",
  });
  await expect(
    owner.mutation(api.projects.setArchived, {
      projectId: "p2",
      archived: false,
    })
  ).rejects.toThrow("10 Projects in progress");
});

test("paid plans have no Project limit, and history pages only completed work", async () => {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({
    subject: "owner",
    tokenIdentifier: "test|owner",
  });
  await owner.mutation(api.team.createWorkspace, { name: "Creator Studio" });
  await t.run(async (ctx) => {
    const subscription = await ctx.db.query("workspaceSubscriptions").unique();
    if (!subscription) throw new Error("Subscription missing");
    await ctx.db.patch(subscription._id, {
      plan: "creator",
      subscriptionStatus: "active",
      billingPeriod: "monthly",
    });
  });
  await owner.mutation(api.settings.upsert, settings);
  for (let index = 1; index <= 12; index += 1)
    await owner.mutation(api.projects.create, {
      project: freeProject(`p${index}`),
    });
  for (const projectId of ["p1", "p2"]) {
    await owner.mutation(api.projects.transitionStage, {
      projectId,
      stageId: "done",
    });
    await owner.mutation(api.projects.setPayment, { projectId, paid: true });
  }

  const live = await owner.query(api.projects.list, {});
  expect(live).toHaveLength(10);
  expect(live.map(({ id }) => id)).not.toContain("p1");
  const history = await owner.query(api.projects.historyPage, {
    scope: "personal",
    paginationOpts: { numItems: 1, cursor: null },
  });
  expect(history.page).toHaveLength(1);
  expect(history.isDone).toBe(false);
  const rest = await owner.query(api.projects.historyPage, {
    scope: "personal",
    paginationOpts: { numItems: 10, cursor: history.continueCursor },
  });
  expect([...history.page, ...rest.page].map(({ id }) => id).sort()).toEqual([
    "p1",
    "p2",
  ]);
});
