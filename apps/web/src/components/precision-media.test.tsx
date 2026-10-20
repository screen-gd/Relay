import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PrecisionMedia } from "./precision-media";
import { sampleStudioProjects } from "@/lib/sample-studio";
import type { WorkItem } from "@/lib/types";

const project: WorkItem = {
  id: "custom-workflow",
  profileId: "video-editor",
  title: "Custom workflow film",
  status: "In Progress",
  workType: "Client Work",
  startDate: "2026-10-01",
  dueDate: "2026-10-20",
  earnings: 0,
  notes: "",
  workflowStageId: "mix",
  workflowStages: [
    { id: "brief", label: "Brief", purpose: "planned" },
    { id: "assembly", label: "Assembly", purpose: "editing" },
    { id: "cut", label: "Fine cut", purpose: "editing" },
    { id: "mix", label: "Sound mix", purpose: "editing" },
    { id: "handoff", label: "Handoff", purpose: "delivered" },
  ],
};

function renderMedia(projects: WorkItem[]) {
  return renderToStaticMarkup(
    <PrecisionMedia projects={projects} onViewProject={() => undefined} />
  );
}

describe("Media workflow progress", () => {
  it.each([
    { project: sampleStudioProjects[0], expected: 33 },
    { project, expected: 75 },
    { project: { ...project, status: "Cancelled" }, expected: 0 },
    { project: { ...project, status: "Delivered" }, expected: 100 },
  ] satisfies { project: WorkItem; expected: number }[])(
    "shows $expected% for $project.title ($project.status) on cards and details",
    ({ project, expected }) => {
      const html = renderMedia([project]);
      expect(html).toContain(
        `aria-label="${project.title}, ${project.status}, ${expected}% package progress.`
      );
      const details = html.slice(
        html.indexOf('aria-label="Selected package details"')
      );
      expect(details).toContain(`>${expected}%</span>`);
      expect(details).toContain(`>${expected}%</p>`);
    }
  );
});

describe("Media collections", () => {
  it("counts only Projects in progress while keeping historical packages available", () => {
    const projects: WorkItem[] = [
      project,
      {
        ...project,
        id: "cancelled",
        title: "Cancelled film",
        status: "Cancelled",
      },
      {
        ...project,
        id: "delivered",
        title: "Delivered film",
        status: "Delivered",
      },
      { ...project, id: "archived", title: "Archived film", archived: true },
    ];
    const html = renderMedia(projects);
    const navigation = html.slice(
      html.indexOf('aria-label="Media collections"'),
      html.indexOf("</nav>")
    );
    const activeCollection = navigation
      .split("<button")
      .find((button) => button.includes("Active exports"));
    expect(activeCollection).toContain(">1</span>");
    expect(html).toContain("4 of 4 packages");
    for (const project of projects) {
      expect(html).toContain(
        `aria-label="${project.title}, ${project.status},`
      );
    }
  });
});
