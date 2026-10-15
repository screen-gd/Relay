import { describe, expect, it } from "vitest";
import {
  aiToolHref,
  aiTools,
  aiToolsForPage,
  featuredAiToolIds,
  projectIdFromPath,
} from "./ai-tools";

describe("AI tools", () => {
  it("names every feature once, with one home each", () => {
    expect(new Set(aiTools.map((tool) => tool.id)).size).toBe(aiTools.length);
    expect(aiTools).toHaveLength(8);
    for (const tool of aiTools) {
      expect(tool.label.trim()).not.toBe("");
      expect(tool.home.trim()).not.toBe("");
      expect(Boolean(tool.projectView) !== Boolean(tool.href)).toBe(true);
    }
    for (const id of featuredAiToolIds)
      expect(aiTools.map((tool) => tool.id)).toContain(id);
  });

  it("leads a project action to the open project's own view", () => {
    const revisionList = aiTools.find(
      (tool) => tool.id === "feedback-revision-list"
    );
    const statusDraft = aiTools.find(
      (tool) => tool.id === "client-status-draft"
    );
    expect(revisionList).toBeDefined();
    expect(statusDraft).toBeDefined();
    expect(aiToolHref(revisionList!, "/projects/relay-launch")).toBe(
      "/projects/relay-launch?view=outputs"
    );
    expect(
      aiToolHref(statusDraft!, "/projects/relay-launch?view=overview")
    ).toBe("/projects/relay-launch?view=review");
  });

  it("keeps a sample studio action inside the sample studio", () => {
    const changeOrder = aiTools.find(
      (tool) => tool.id === "change-order-draft"
    )!;
    expect(aiToolHref(changeOrder, "/sample-studio/projects/demo")).toBe(
      "/sample-studio/projects/demo?view=overview"
    );
  });

  it("falls back to the Projects hub when no project is open", () => {
    const revisionList = aiTools.find(
      (tool) => tool.id === "feedback-revision-list"
    )!;
    expect(aiToolHref(revisionList, "/")).toBe("/projects");
    expect(aiToolHref(revisionList, "/projects")).toBe("/projects");
  });

  it("sends the page-level actions to their own page", () => {
    const earnings = aiTools.find((tool) => tool.id === "earnings-qa")!;
    const risk = aiTools.find((tool) => tool.id === "risk-digest")!;
    expect(aiToolHref(earnings, "/clients")).toBe("/reports");
    expect(aiToolHref(risk, "/")).toBe("/");
  });

  it("reads a project id out of the route, and nothing else", () => {
    expect(projectIdFromPath("/projects/relay%20launch")).toBe("relay launch");
    expect(projectIdFromPath("/projects/relay-launch?view=review")).toBe(
      "relay-launch"
    );
    expect(projectIdFromPath("/sample-studio/projects/demo")).toBe("demo");
    expect(projectIdFromPath("/projects")).toBeUndefined();
    expect(projectIdFromPath("/clients/relay")).toBeUndefined();
  });

  it("reports which pages have AI, for the nav badge", () => {
    expect(aiToolsForPage("projects").map((tool) => tool.id)).toEqual([
      "feedback-revision-list",
      "client-status-draft",
      "transcript-review",
      "version-changelog",
      "change-order-draft",
    ]);
    expect(aiToolsForPage("reports").map((tool) => tool.id)).toEqual([
      "earnings-qa",
    ]);
    expect(aiToolsForPage("dashboard").map((tool) => tool.id)).toEqual([
      "risk-digest",
    ]);
    expect(aiToolsForPage("clients")).toEqual([]);
  });
});
