import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createProjectOutput,
  parseProjectOutputSnapshot,
  setProjectOutputReviewState,
  type ProjectOutput,
  type ProjectOutputSnapshot,
} from "@/features/project-outputs/project-output-domain";
import {
  duplicateLocalProjectOutputs,
  projectOutputCopies,
} from "./project-output-data";

const STORAGE_KEY = "relay:project-outputs:v1";

function stubStorage(initial?: ProjectOutputSnapshot) {
  const entries = new Map<string, string>();
  if (initial) entries.set(STORAGE_KEY, JSON.stringify(initial));
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => entries.get(key) ?? null,
      setItem: (key: string, value: string) => void entries.set(key, value),
    },
  });
  return entries;
}

/** What the Outputs panel has written to browser storage so far. */
function storedOutputs(entries: Map<string, string>) {
  const snapshot = parseProjectOutputSnapshot(
    JSON.parse(entries.get(STORAGE_KEY) ?? "null")
  );
  if (!snapshot) throw new Error("Expected a stored Outputs snapshot.");
  return snapshot.outputs;
}

function output(index: number, overrides: Partial<ProjectOutput> = {}) {
  return {
    ...createProjectOutput({
      id: `project-1:output:${index}`,
      projectId: "project-1",
      title: `Cut ${index}`,
      createdAt: "2026-10-15T08:00:00.000Z",
    }),
    ...overrides,
  };
}

const createdAt = "2026-10-15T09:00:00.000Z";

afterEach(() => vi.unstubAllGlobals());

describe("copying a Project's Outputs", () => {
  it("copies the Outputs the Project holds when Duplicate runs", () => {
    const entries = stubStorage({
      outputs: [output(1)],
      versions: [],
      comments: [],
    });
    // The panel adds another Output after the Project page opened.
    entries.set(
      STORAGE_KEY,
      JSON.stringify({
        outputs: [output(1), output(2, { title: "Cut 2 renamed" })],
        versions: [],
        comments: [],
      })
    );

    expect(
      duplicateLocalProjectOutputs({
        sourceProjectId: "project-1",
        targetProjectId: "project-2",
        createdAt,
      })
    ).toBe(2);

    expect(
      storedOutputs(entries).map(({ id, projectId, title }) => [
        id,
        projectId,
        title,
      ])
    ).toEqual([
      ["project-1:output:1", "project-1", "Cut 1"],
      ["project-1:output:2", "project-1", "Cut 2 renamed"],
      ["project-2:output:1", "project-2", "Cut 1"],
      ["project-2:output:2", "project-2", "Cut 2 renamed"],
    ]);
  });

  it("copies every Output past the twelfth", () => {
    const many = Array.from({ length: 13 }, (_, index) => output(index + 1));
    const entries = stubStorage({ outputs: many, versions: [], comments: [] });

    expect(
      duplicateLocalProjectOutputs({
        sourceProjectId: "project-1",
        targetProjectId: "project-2",
        createdAt,
      })
    ).toBe(13);

    expect(
      storedOutputs(entries)
        .filter(({ projectId }) => projectId === "project-2")
        .map(({ title }) => title)
    ).toEqual(many.map(({ title }) => title));
  });

  it("brings each Output's review state and due date to the copy", () => {
    const approved = setProjectOutputReviewState(
      output(1, { dueDate: "2026-11-01" }),
      "approved",
      "2026-10-15T08:30:00.000Z"
    );
    const copies = projectOutputCopies({
      outputs: [approved, output(2, { archived: true })],
      targetProjectId: "project-2",
      createdAt,
    });

    expect(copies).toEqual([
      {
        id: "project-2:output:1",
        projectId: "project-2",
        title: "Cut 1",
        category: "Deliverable",
        reviewState: "approved",
        dueDate: "2026-11-01",
        createdAt,
      },
    ]);
  });

  it("leaves the source Outputs in place", () => {
    const entries = stubStorage({
      outputs: [output(1), output(2)],
      versions: [],
      comments: [],
    });

    duplicateLocalProjectOutputs({
      sourceProjectId: "project-1",
      targetProjectId: "project-2",
      createdAt,
    });

    expect(
      storedOutputs(entries).filter(
        ({ projectId }) => projectId === "project-1"
      )
    ).toHaveLength(2);
  });

  it("copies nothing when the Project holds no Outputs", () => {
    const entries = stubStorage({ outputs: [], versions: [], comments: [] });

    expect(
      duplicateLocalProjectOutputs({
        sourceProjectId: "project-1",
        targetProjectId: "project-2",
        createdAt,
      })
    ).toBe(0);
    expect(storedOutputs(entries)).toEqual([]);
  });
});
