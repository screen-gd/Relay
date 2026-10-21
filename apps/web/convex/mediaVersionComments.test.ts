/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { expect, test, vi } from "vitest";
import { api } from "./_generated/api";
import type { AnnotationShape } from "./mediaVersionAnnotations";
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

test("annotations keep 20 shapes but allow only 600 total points, including pins", async () => {
  const t = convexTest(schema, modules);
  await seed(t);
  const { token } = await publishOpen(t);
  const shapes: AnnotationShape[] = [
    ...Array.from({ length: 17 }, () => ({
      type: "pin" as const,
      x: 0.5,
      y: 0.5,
    })),
    ...[200, 200, 183].map((length) => ({
      type: "stroke" as const,
      points: Array.from({ length }, () => ({ x: 0.5, y: 0.5 })),
    })),
  ];
  const comment = await t.mutation(api.mediaVersionComments.addPublicComment, {
    token,
    ...annotationArgs,
    annotations: shapes,
  });
  expect(comment.annotations).toEqual(shapes);
  const last = shapes[19];
  if (!last || last.type !== "stroke") throw new Error("Stroke missing");
  last.points.push({ x: 0.5, y: 0.5 });
  await expect(
    t.mutation(api.mediaVersionComments.addPublicComment, {
      token,
      ...annotationArgs,
      annotations: shapes,
    })
  ).rejects.toThrow("at most 600 annotation points");
});

test("a portal accepts ten public comments per minute and recovers after the window", async () => {
  const t = convexTest(schema, modules);
  await seed(t);
  const { token } = await publishOpen(t);
  vi.useFakeTimers();
  try {
    vi.setSystemTime(Date.UTC(2026, 9, 21, 12));
    const args = { token, ...annotationArgs };
    for (let i = 0; i < 10; i++)
      await t.mutation(api.mediaVersionComments.addPublicComment, args);
    await expect(
      t.mutation(api.mediaVersionComments.addPublicComment, args)
    ).rejects.toThrow("at most 10 comments per minute");
    vi.setSystemTime(Date.now() + 60_001);
    await t.mutation(api.mediaVersionComments.addPublicComment, args);
    expect(
      (await t.query(api.mediaVersionComments.listForPortal, { token }))
        .comments
    ).toHaveLength(11);
  } finally {
    vi.useRealTimers();
  }
});

test("comment lists stay below the read limit with 20 outputs and legacy maximum annotations", async () => {
  const t = convexTest({ schema, modules, transactionLimits: true });
  await seed(t);
  const { owner, token } = await publishOpen(t);
  const versions = await t.run(async (ctx) => {
    const originalOutput = await ctx.db.query("projectOutputs").first();
    const originalVersion = await ctx.db.query("projectMediaVersions").first();
    const portal = await ctx.db.query("projectPortals").first();
    if (!originalOutput || !originalVersion || !portal)
      throw new Error("Fixture missing");
    const {
      _id: outputId,
      _creationTime: outputTime,
      ...outputFields
    } = originalOutput;
    const {
      _id: versionId,
      _creationTime: versionTime,
      ...versionFields
    } = originalVersion;
    const rows = [
      {
        outputId,
        versionId,
        outputName: "main-output",
        versionName: "current-v1",
      },
    ];
    for (let i = 1; i < 20; i++) {
      const outputId = await ctx.db.insert("projectOutputs", {
        ...outputFields,
        id: `output-${i}`,
      });
      const versionId = await ctx.db.insert("projectMediaVersions", {
        ...versionFields,
        outputId,
        id: `version-${i}`,
      });
      await ctx.db.patch(outputId, { currentMediaVersionId: versionId });
      rows.push({
        outputId,
        versionId,
        outputName: `output-${i}`,
        versionName: `version-${i}`,
      });
    }
    await ctx.db.patch(portal._id, {
      selectedOutputIds: rows.map((row) => row.outputName),
    });
    return rows;
  });
  const annotations: AnnotationShape[] = Array.from({ length: 20 }, () => ({
    type: "stroke",
    points: Array.from({ length: 200 }, () => ({ x: 0.5, y: 0.5 })),
  }));
  for (const [index, version] of versions.entries()) {
    await t.run(async (ctx) => {
      for (let i = 0; i < (index === 0 ? 60 : 9); i++) {
        await ctx.db.insert("mediaVersionComments", {
          ownerUserId: "owner",
          projectId: "comments-project",
          outputId: version.outputId,
          mediaVersionId: version.versionId,
          authorName: "Client",
          body: `${index}:${i}`,
          annotations,
          resolved: false,
          createdAt: new Date(
            Date.UTC(2026, 9, 21) + index * 60_000 + i * 1000
          ).toISOString(),
        });
      }
    });
  }
  // The previous per-output scan exceeded Convex's 16 MiB transaction budget.
  await expect(
    t.query(async (ctx) => {
      for (const version of versions)
        await ctx.db
          .query("mediaVersionComments")
          .withIndex("by_mediaVersionId", (q) =>
            q.eq("mediaVersionId", version.versionId)
          )
          .order("desc")
          .take(100);
    })
  ).rejects.toThrow("Read too much data");
  const aggregate = await t.query(async (ctx) => {
    const result = await ctx.runQuery(api.mediaVersionComments.listForPortal, {
      token,
    });
    return { result, metrics: await ctx.meta.getTransactionMetrics() };
  });
  expect(aggregate.result.comments).toHaveLength(50);
  expect(aggregate.result.comments[0]?.body).toBe("19:8");
  expect(aggregate.result.comments[49]?.body).toBe("14:4");
  expect(aggregate.metrics.bytesRead.used).toBeLessThan(8 * 1024 * 1024);
  const selected = await t.query(api.mediaVersionComments.listForPortal, {
    token,
    outputId: "main-output",
    mediaVersionId: "current-v1",
  });
  expect(selected.comments).toHaveLength(50);
  expect(
    selected.comments.every(
      (comment) => comment.mediaVersionId === "current-v1"
    )
  ).toBe(true);
  const project = await owner.query(api.mediaVersionComments.listForProject, {
    projectId: "comments-project",
  });
  expect(project).toHaveLength(50);
  expect(project.map((comment) => comment.body)).toEqual(
    aggregate.result.comments.map((comment) => comment.body)
  );
}, 30_000);

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
