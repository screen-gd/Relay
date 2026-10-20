/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

/** Every shape below is the same YouTube video as this link. */
const YOUTUBE_VIDEO_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

/** Every shape below is the same Vimeo video as this link. */
const VIMEO_VIDEO_URL = "https://vimeo.com/123456789";

const YOUTUBE_SHAPES = [
  YOUTUBE_VIDEO_URL,
  "https://youtube.com/watch?v=dQw4w9WgXcQ",
  "https://m.youtube.com/watch?v=dQw4w9WgXcQ",
  "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s&list=PL1234567890",
  "https://www.youtube.com/watch/?v=dQw4w9WgXcQ",
  "https://youtu.be/dQw4w9WgXcQ",
  "https://www.youtu.be/dQw4w9WgXcQ?si=AbCdEf12",
  "https://www.youtube.com/shorts/dQw4w9WgXcQ",
  "https://www.youtube.com/shorts/dQw4w9WgXcQ?feature=share",
  "https://www.youtube.com/embed/dQw4w9WgXcQ",
  "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
  "https://www.youtube.com/live/dQw4w9WgXcQ",
];

const VIMEO_SHAPES = [
  VIMEO_VIDEO_URL,
  "https://vimeo.com/123456789/",
  "https://www.vimeo.com/123456789",
  "https://vimeo.com/123456789?share=copy",
  "https://player.vimeo.com/video/123456789",
];

/** Each refused link with the plain message the client parser also gives it. */
const REFUSED_LINKS: Array<[string, string]> = [
  [
    "https://www.youtube.com/playlist?list=PL1234567890",
    "That YouTube URL does not contain a valid video.",
  ],
  [
    "https://www.youtube.com/@somechannel",
    "That YouTube URL does not contain a valid video.",
  ],
  [
    "https://www.youtube.com/watch?v=too-short",
    "That YouTube URL does not contain a valid video.",
  ],
  [
    "https://youtu.be/dQw4w9WgXcQ/extra",
    "That YouTube URL does not contain a valid video.",
  ],
  [
    "https://vimeo.com/channels/staffpicks/123456789",
    "That Vimeo URL does not contain a valid video.",
  ],
  [
    "https://vimeo.com/abcdef",
    "That Vimeo URL does not contain a valid video.",
  ],
  ["https://vimeo.com/", "That Vimeo URL does not contain a valid video."],
  [
    "https://youtube.com/embed/dQw4w9WgXcQ extra",
    "Enter a valid HTTP or HTTPS URL.",
  ],
  [
    "<iframe src='https://youtube.com/embed/dQw4w9WgXcQ'></iframe>",
    "Enter a valid HTTP or HTTPS URL.",
  ],
  [
    "https://user:password@www.youtube.com/watch?v=dQw4w9WgXcQ",
    "URLs with embedded credentials are not allowed.",
  ],
  ["ftp://example.com/cut.mp4", "Only HTTP and HTTPS URLs are allowed."],
];

async function seedProject(t: ReturnType<typeof convexTest>) {
  await t.run(async (ctx) => {
    await ctx.db.insert("projects", {
      ownerUserId: "owner",
      id: "project-a",
      assigneeUserIds: [],
      profileId: "video-editing",
      title: "Project A",
      clientId: "client-a",
      archived: false,
      status: "Planned",
      workflowStageId: "planned",
      workflowStages: [
        { id: "planned", label: "Planned", purpose: "planned" },
        { id: "done", label: "Delivered", purpose: "delivered" },
      ],
      workType: "Salary",
      startDate: "2026-08-24",
      dueDate: "2026-09-01",
      earnings: 0,
      paid: false,
      notes: "",
      createdAt: "2026-08-24T00:00:00.000Z",
      updatedAt: "2026-08-24T00:00:00.000Z",
    });
  });
}

test("template Outputs initialize once and remain separate from Project workflow and salary", async () => {
  const t = convexTest(schema, modules);
  await seedProject(t);
  const owner = t.withIdentity({ tokenIdentifier: "owner" });
  const starter = [
    { id: "main", title: "Main video", category: "Deliverable" as const },
  ];

  await owner.mutation(api.projectOutputs.initializeFromTemplate, {
    projectId: "project-a",
    outputs: starter,
  });
  await owner.mutation(api.projectOutputs.initializeFromTemplate, {
    projectId: "project-a",
    outputs: starter,
  });
  await owner.mutation(api.projectOutputs.create, {
    projectId: "project-a",
    output: { id: "short", title: "Short cut", category: "Deliverable" },
  });
  await owner.mutation(api.projectOutputs.update, {
    outputId: "main",
    changes: { title: "Main film", reviewState: "approved" },
  });

  expect(
    await owner.query(api.projectOutputs.listForProject, {
      projectId: "project-a",
    })
  ).toMatchObject([
    { id: "main", title: "Main film", reviewState: "approved" },
    { id: "short" },
  ]);
  const state = await t.run(async (ctx) => ({
    project: await ctx.db
      .query("projects")
      .withIndex("by_projectId", (q) => q.eq("id", "project-a"))
      .unique(),
    salaryBatches: await ctx.db.query("projectSalaryBatches").collect(),
  }));
  expect(state.project).toMatchObject({
    status: "Planned",
    workflowStageId: "planned",
  });
  expect(state.salaryBatches).toEqual([]);
});

test("linked versions normalize providers, retain history, and flag unresolved old comments", async () => {
  const t = convexTest(schema, modules);
  await seedProject(t);
  const owner = t.withIdentity({ tokenIdentifier: "owner" });
  await owner.mutation(api.projectOutputs.initializeFromTemplate, {
    projectId: "project-a",
    outputs: [{ id: "main", title: "Main", category: "Deliverable" }],
  });
  const firstId = await owner.mutation(
    api.projectOutputs.addLinkedMediaVersion,
    {
      outputId: "main",
      version: {
        id: "v1",
        url: "https://youtu.be/dQw4w9WgXcQ?t=5",
        title: "First",
      },
    }
  );
  await t.run(async (ctx) => {
    const output = await ctx.db
      .query("projectOutputs")
      .withIndex("by_outputId", (q) => q.eq("id", "main"))
      .unique();
    if (!output) throw new Error("Output fixture failed");
    const mediaVersionId = ctx.db.normalizeId("projectMediaVersions", firstId);
    if (!mediaVersionId) throw new Error("Version fixture failed");
    await ctx.db.insert("mediaVersionComments", {
      ownerUserId: "owner",
      projectId: "project-a",
      outputId: output._id,
      mediaVersionId,
      authorName: "Client",
      body: "Fix this",
      resolved: false,
      createdAt: "2026-08-24T00:00:00.000Z",
    });
  });
  await owner.mutation(api.projectOutputs.addLinkedMediaVersion, {
    outputId: "main",
    version: {
      id: "v2",
      url: "https://player.vimeo.com/video/76979871?autoplay=1",
      title: "Second",
    },
  });

  const [output] = await owner.query(api.projectOutputs.listForProject, {
    projectId: "project-a",
  });
  expect(output.currentVersion).toMatchObject({
    id: "v2",
    versionNumber: 2,
    source: {
      kind: "vimeo",
      videoId: "76979871",
      url: "https://vimeo.com/76979871",
    },
  });
  expect(output.versions).toHaveLength(2);
  expect(output.versions[1]?.source).toEqual({
    kind: "youtube",
    videoId: "dQw4w9WgXcQ",
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  });
  expect(output.unresolvedOldVersionCommentCount).toBe(1);
  const state = await t.run(async (ctx) => ({
    project: await ctx.db
      .query("projects")
      .withIndex("by_projectId", (q) => q.eq("id", "project-a"))
      .unique(),
    salaryBatches: await ctx.db.query("projectSalaryBatches").collect(),
  }));
  expect(state.project).toMatchObject({
    status: "Planned",
    workflowStageId: "planned",
  });
  expect(state.salaryBatches).toEqual([]);
});

test("invalid providers and unauthorised writes fail while ordinary links stay links", async () => {
  const t = convexTest(schema, modules);
  await seedProject(t);
  const owner = t.withIdentity({ tokenIdentifier: "owner" });
  await owner.mutation(api.projectOutputs.initializeFromTemplate, {
    projectId: "project-a",
    outputs: [{ id: "main", title: "Main", category: "Deliverable" }],
  });

  await expect(
    t
      .withIdentity({ tokenIdentifier: "stranger" })
      .mutation(api.projectOutputs.update, {
        outputId: "main",
        changes: { reviewState: "changes_requested" },
      })
  ).rejects.toThrow("Project access required");
  await expect(
    owner.mutation(api.projectOutputs.addLinkedMediaVersion, {
      outputId: "main",
      version: {
        id: "embed",
        url: "<iframe src='https://youtube.com/embed/x'></iframe>",
        title: "Embed",
      },
    })
  ).rejects.toThrow("Enter a valid HTTP or HTTPS URL.");
  await expect(
    owner.mutation(api.projectOutputs.addLinkedMediaVersion, {
      outputId: "main",
      version: {
        id: "bad-youtube",
        url: "https://youtube.com/watch?v=no",
        title: "Bad",
      },
    })
  ).rejects.toThrow("That YouTube URL does not contain a valid video.");
  await owner.mutation(api.projectOutputs.addLinkedMediaVersion, {
    outputId: "main",
    version: {
      id: "review",
      url: "https://review.example.com/cut/2#private",
      title: "Review",
    },
  });
  const [output] = await owner.query(api.projectOutputs.listForProject, {
    projectId: "project-a",
  });
  expect(output.currentVersion?.source).toEqual({
    kind: "link",
    url: "https://review.example.com/cut/2",
  });

  await owner.mutation(api.projectOutputs.setArchived, {
    outputId: "main",
    archived: true,
  });
  expect(
    await owner.query(api.projectOutputs.listForProject, {
      projectId: "project-a",
    })
  ).toEqual([]);
  expect(
    await owner.query(api.projectOutputs.listForProject, {
      projectId: "project-a",
      includeArchived: true,
    })
  ).toHaveLength(1);
});

/** Adds one version per link and returns the sources the cloud row stores, in order. */
async function storedSourcesFor(urls: readonly string[]) {
  const t = convexTest(schema, modules);
  await seedProject(t);
  const owner = t.withIdentity({ tokenIdentifier: "owner" });
  await owner.mutation(api.projectOutputs.initializeFromTemplate, {
    projectId: "project-a",
    outputs: [{ id: "main", title: "Main", category: "Deliverable" }],
  });
  for (const [index, url] of urls.entries()) {
    await owner.mutation(api.projectOutputs.addLinkedMediaVersion, {
      outputId: "main",
      version: { id: `shape-${index}`, url, title: `Shape ${index}` },
    });
  }
  const [output] = await owner.query(api.projectOutputs.listForProject, {
    projectId: "project-a",
  });
  return [...output.versions].reverse().map(({ source }) => source);
}

test("stores every accepted YouTube link shape as the video it points at", async () => {
  expect(await storedSourcesFor(YOUTUBE_SHAPES)).toEqual(
    YOUTUBE_SHAPES.map(() => ({
      kind: "youtube",
      videoId: "dQw4w9WgXcQ",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    }))
  );
});

test("stores every accepted Vimeo link shape as the video it points at", async () => {
  expect(await storedSourcesFor(VIMEO_SHAPES)).toEqual(
    VIMEO_SHAPES.map(() => ({
      kind: "vimeo",
      videoId: "123456789",
      url: "https://vimeo.com/123456789",
    }))
  );
});

test("keeps the privacy hash that makes an unlisted Vimeo video playable", async () => {
  const unlisted = "https://vimeo.com/123456789/1a2b3c4d5e";
  const pageLink = "https://vimeo.com/123456789?h=1a2b3c4d5e";
  const playerLink = "https://player.vimeo.com/video/123456789?h=1a2b3c4d5e";
  expect(await storedSourcesFor([unlisted, pageLink, playerLink])).toEqual(
    [unlisted, pageLink, playerLink].map(() => ({
      kind: "vimeo",
      videoId: "123456789",
      url: unlisted,
    }))
  );
});

test("refuses the same junk as the client parser with the same plain message", async () => {
  const t = convexTest(schema, modules);
  await seedProject(t);
  const owner = t.withIdentity({ tokenIdentifier: "owner" });
  await owner.mutation(api.projectOutputs.initializeFromTemplate, {
    projectId: "project-a",
    outputs: [{ id: "main", title: "Main", category: "Deliverable" }],
  });

  for (const [index, [url, message]] of REFUSED_LINKS.entries()) {
    await expect(
      owner.mutation(api.projectOutputs.addLinkedMediaVersion, {
        outputId: "main",
        version: { id: `refused-${index}`, url, title: `Refused ${index}` },
      }),
      url
    ).rejects.toThrow(message);
  }
  const [output] = await owner.query(api.projectOutputs.listForProject, {
    projectId: "project-a",
  });
  expect(output.versions).toEqual([]);
});
