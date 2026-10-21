/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

async function seed(t: ReturnType<typeof convexTest>) {
  await t.run(async (ctx) => {
    await ctx.db.insert("projects", {
      ownerUserId: "owner",
      id: "comments-project",
      assigneeUserIds: [],
      profileId: "video-editing",
      title: "Comments Project",
      clientId: "client-a",
      archived: false,
      status: "Planned",
      workflowStageId: "planned",
      workflowStages: [
        { id: "planned", label: "Planned", purpose: "planned" },
        { id: "delivered", label: "Delivered", purpose: "delivered" },
      ],
      workType: "Freelance",
      startDate: "2026-08-24",
      dueDate: "2026-09-01",
      earnings: 500,
      paid: false,
      notes: "Internal notes must stay private",
      createdAt: "2026-08-24T00:00:00.000Z",
      updatedAt: "2026-08-24T00:00:00.000Z",
    });
    const outputId = await ctx.db.insert("projectOutputs", {
      ownerUserId: "owner",
      projectId: "comments-project",
      id: "main-output",
      title: "Main cut",
      description: "",
      category: "Deliverable",
      reviewState: "sent_to_client",
      archived: false,
      createdAt: "2026-08-24T00:00:00.000Z",
      updatedAt: "2026-08-24T00:00:00.000Z",
    });
    const versionId = await ctx.db.insert("projectMediaVersions", {
      ownerUserId: "owner",
      projectId: "comments-project",
      outputId,
      id: "current-v1",
      versionNumber: 1,
      source: {
        kind: "youtube",
        url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        videoId: "dQw4w9WgXcQ",
      },
      title: "Current cut",
      notes: "Private editor notes",
      createdByUserId: "owner",
      createdAt: "2026-08-24T00:00:00.000Z",
    });
    await ctx.db.patch(outputId, { currentMediaVersionId: versionId });
  });
}

async function publishOpen(t: ReturnType<typeof convexTest>) {
  const owner = t.withIdentity({ tokenIdentifier: "owner", name: "Owner" });
  const published = await owner.mutation(api.projectPortals.publish, {
    projectId: "comments-project",
    config: {
      publicNotes: "Review the current cut",
      showStartDate: false,
      showDueDate: true,
      selectedOutputIds: ["main-output"],
      expiresAt: null,
    },
  });
  await owner.mutation(api.projectPortals.setStatus, {
    portalId: published.portalId,
    status: "open",
  });
  return { owner, token: published.token };
}

test("public comments require active portal access and attach to the current version", async () => {
  const t = convexTest(schema, modules);
  await seed(t);
  const { owner, token } = await publishOpen(t);

  const comment = await t.mutation(api.mediaVersionComments.addPublicComment, {
    token,
    outputId: "main-output",
    mediaVersionId: "current-v1",
    authorName: " Client reviewer ",
    body: " Please lift the music under the title. ",
    timestampSeconds: 0,
  });
  expect(comment.id).toBeTruthy();
  expect(
    await t.query(api.mediaVersionComments.listForPortal, { token })
  ).toMatchObject({
    access: "active",
    comments: [
      {
        authorName: "Client reviewer",
        body: "Please lift the music under the title.",
        timestampSeconds: 0,
        resolved: false,
      },
    ],
  });
  expect(
    await owner.query(api.mediaVersionComments.listForProject, {
      projectId: "comments-project",
    })
  ).toMatchObject([
    {
      outputId: "main-output",
      mediaVersionId: "current-v1",
      body: "Please lift the music under the title.",
      timestampSeconds: 0,
    },
  ]);
  await expect(
    t.mutation(api.mediaVersionComments.addPublicComment, {
      token,
      outputId: "main-output",
      mediaVersionId: "not-current",
      authorName: "Client",
      body: "Old version",
    })
  ).rejects.toThrow("current shared Media Version");
});

test("team-side resolution and public reopening preserve the comment record", async () => {
  const t = convexTest(schema, modules);
  await seed(t);
  const { owner, token } = await publishOpen(t);
  const comment = await t.mutation(api.mediaVersionComments.addPublicComment, {
    token,
    outputId: "main-output",
    mediaVersionId: "current-v1",
    authorName: "Client",
    body: "Please check the opening frame.",
  });

  const resolved = await owner.mutation(api.mediaVersionComments.setResolved, {
    commentId: comment.id,
    resolved: true,
  });
  expect(resolved.resolved).toBe(true);
  expect(
    (await t.query(api.mediaVersionComments.listForPortal, { token })).comments
  ).toMatchObject([{ id: comment.id, resolved: true }]);
  const reopened = await t.mutation(
    api.mediaVersionComments.reopenPublicComment,
    { token, commentId: comment.id }
  );
  expect(reopened.resolved).toBe(false);
  expect(
    (
      await owner.query(api.mediaVersionComments.listForProject, {
        projectId: "comments-project",
      })
    )[0]?.resolved
  ).toBe(false);
});

test("PIN, closure, expiry, and invalid tokens block public comments without deleting history", async () => {
  const t = convexTest(schema, modules);
  await seed(t);
  const { owner, token } = await publishOpen(t);
  const portal = await t.run(async (ctx) =>
    ctx.db
      .query("projectPortals")
      .withIndex("by_projectId", (q) => q.eq("projectId", "comments-project"))
      .unique()
  );
  if (!portal) throw new Error("Portal fixture failed");
  await owner.mutation(api.projectPortals.setPin, {
    portalId: portal._id,
    pin: "1234",
  });
  expect(
    (await t.query(api.mediaVersionComments.listForPortal, { token })).access
  ).toBe("pin_required");
  expect(
    (
      await t.query(api.mediaVersionComments.listForPortal, {
        token,
        pin: "wrong",
      })
    ).access
  ).toBe("invalid_pin");
  expect(
    (
      await t.query(api.mediaVersionComments.listForPortal, {
        token,
        pin: "1234",
      })
    ).access
  ).toBe("active");

  await t.mutation(api.mediaVersionComments.addPublicComment, {
    token,
    pin: "1234",
    outputId: "main-output",
    mediaVersionId: "current-v1",
    authorName: "Client",
    body: "Keep this history after closing.",
  });

  await owner.mutation(api.projectPortals.setStatus, {
    portalId: portal._id,
    status: "closed",
  });
  expect(
    (
      await t.query(api.mediaVersionComments.listForPortal, {
        token,
        pin: "1234",
      })
    ).access
  ).toBe("closed");
  expect(
    await owner.query(api.mediaVersionComments.listForProject, {
      projectId: "comments-project",
    })
  ).toMatchObject([{ body: "Keep this history after closing." }]);
  await owner.mutation(api.projectPortals.setStatus, {
    portalId: portal._id,
    status: "open",
  });
  await t.run(async (ctx) =>
    ctx.db.patch(portal._id, { expiresAt: "2000-01-01T00:00:00.000Z" })
  );
  expect(
    (
      await t.query(api.mediaVersionComments.listForPortal, {
        token,
        pin: "1234",
      })
    ).access
  ).toBe("expired");
  expect(
    (
      await t.query(api.mediaVersionComments.listForPortal, {
        token: "not-a-token",
      })
    ).access
  ).toBe("invalid_token");
});

test("manual timestamps work for linked videos and invalid timestamps are rejected", async () => {
  const t = convexTest(schema, modules);
  await seed(t);
  const { token } = await publishOpen(t);
  const args = {
    token,
    outputId: "main-output",
    mediaVersionId: "current-v1",
    authorName: "Client",
    body: "Change this cut",
  };
  for (const url of [
    "https://drive.google.com/file/d/review/view",
    "https://www.dropbox.com/s/review/video.mp4",
  ]) {
    await t.run(async (ctx) => {
      const version = await ctx.db.query("projectMediaVersions").first();
      await ctx.db.patch(version!._id, { source: { kind: "link", url } });
    });
    await t.mutation(api.mediaVersionComments.addPublicComment, {
      ...args,
      timestampSeconds: 65,
    });
    await t.mutation(api.mediaVersionComments.addPublicComment, args);
  }
  const result = await t.query(api.mediaVersionComments.listForPortal, {
    token,
  });
  expect(
    result.comments?.filter((comment) => comment.timestampSeconds === 65)
  ).toHaveLength(2);
  expect(
    result.comments?.filter((comment) => comment.timestampSeconds === undefined)
  ).toHaveLength(2);
  for (const timestampSeconds of [-1, 1.5, 604801]) {
    await expect(
      t.mutation(api.mediaVersionComments.addPublicComment, {
        ...args,
        timestampSeconds,
      })
    ).rejects.toThrow("Timestamp must");
  }
});

const annotationArgs = {
  outputId: "main-output",
  mediaVersionId: "current-v1",
  authorName: "Client",
  body: "This frame needs a fix",
};

test("annotated comments store their shapes for the portal and the editor", async () => {
  const t = convexTest(schema, modules);
  await seed(t);
  const { owner, token } = await publishOpen(t);
  const annotations = [
    { type: "pin" as const, x: 0.25, y: 0.5 },
    {
      type: "stroke" as const,
      points: [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ],
    },
  ];

  const comment = await t.mutation(api.mediaVersionComments.addPublicComment, {
    token,
    ...annotationArgs,
    timestampSeconds: 12,
    annotations,
  });
  expect(comment.annotations).toEqual(annotations);

  const portal = await t.query(api.mediaVersionComments.listForPortal, {
    token,
  });
  expect(portal.comments[0]).toMatchObject({
    body: annotationArgs.body,
    timestampSeconds: 12,
    annotations,
  });

  const editor = await owner.query(api.mediaVersionComments.listForProject, {
    projectId: "comments-project",
  });
  expect(editor[0]).toMatchObject({ annotations });
});

test("invalid annotations are rejected before they are stored", async () => {
  const t = convexTest(schema, modules);
  await seed(t);
  const { token } = await publishOpen(t);
  const base = { token, ...annotationArgs };

  await expect(
    t.mutation(api.mediaVersionComments.addPublicComment, {
      ...base,
      annotations: Array.from({ length: 21 }, () => ({
        type: "pin" as const,
        x: 0.5,
        y: 0.5,
      })),
    })
  ).rejects.toThrow("at most 20");
  await expect(
    t.mutation(api.mediaVersionComments.addPublicComment, {
      ...base,
      annotations: [
        {
          type: "stroke",
          points: Array.from({ length: 201 }, () => ({ x: 0.5, y: 0.5 })),
        },
      ],
    })
  ).rejects.toThrow("at most 200");
  await expect(
    t.mutation(api.mediaVersionComments.addPublicComment, {
      ...base,
      annotations: [{ type: "stroke", points: [{ x: 0.5, y: 0.5 }] }],
    })
  ).rejects.toThrow("at least two");
  await expect(
    t.mutation(api.mediaVersionComments.addPublicComment, {
      ...base,
      annotations: [{ type: "pin", x: Number.NaN, y: 0.5 }],
    })
  ).rejects.toThrow("finite");
  await expect(
    t.mutation(api.mediaVersionComments.addPublicComment, {
      ...base,
      annotations: [{ type: "pin", x: 4, y: 0.5 }],
    })
  ).rejects.toThrow("normalized");

  expect(
    (await t.query(api.mediaVersionComments.listForPortal, { token })).comments
  ).toHaveLength(0);
});

test("an approved and locked version rejects annotated comments", async () => {
  const t = convexTest(schema, modules);
  await seed(t);
  const { token } = await publishOpen(t);
  await t.run(async (ctx) => {
    const project = await ctx.db
      .query("projects")
      .withIndex("by_projectId", (q) => q.eq("id", "comments-project"))
      .unique();
    if (!project) throw new Error("Project fixture failed");
    await ctx.db.patch(project._id, {
      workflowStages: [
        ...project.workflowStages,
        { id: "approved", label: "Approved", purpose: "approved" },
      ],
    });
  });
  await t.mutation(api.projectPortals.approve, {
    token,
    outputId: "main-output",
    mediaVersionId: "current-v1",
    displayName: "Client",
  });

  await expect(
    t.mutation(api.mediaVersionComments.addPublicComment, {
      token,
      ...annotationArgs,
      annotations: [{ type: "pin", x: 0.4, y: 0.6 }],
    })
  ).rejects.toThrow("approved and locked");
});
