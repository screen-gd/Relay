import { describe, expect, it } from "vitest";
import type { Client, ResourceLink, WorkItem } from "./types";
import {
  isSampleRecordId,
  sampleWorkspaceClients,
  sampleWorkspaceClientsFor,
  sampleWorkspaceProjectsFor,
  sampleWorkspaceResources,
  withSampleRecords,
  withoutSampleRecords,
} from "./sample-studio";

type Workspace = {
  projects: WorkItem[];
  clients: Client[];
  resources: ResourceLink[];
};

const ownProject: WorkItem = {
  id: "project-harbour-reel",
  profileId: "video-editor",
  title: "Harbour reel",
  client: "Aperture Coffee",
  clientId: "client-aperture-coffee",
  status: "In Progress",
  workType: "Client Work",
  startDate: "2026-08-01",
  dueDate: "2026-08-09",
  earnings: 400,
  notes: "Own work.",
};

// The id a person's own "Aperture Coffee" client gets from the Client form.
const ownClient: Client = {
  id: "client-aperture-coffee",
  name: "Aperture Coffee",
  company: "Aperture Coffee",
  contactName: "",
  email: "",
  phone: "",
  notes: "",
  archived: false,
};

const ownResource: ResourceLink = {
  id: "resource-brand-kit",
  title: "Brand kit",
  url: "https://example.com/brand",
  category: "Reference",
  projectId: "project-harbour-reel",
  notes: "",
  createdAt: "2026-08-01T09:00:00.000Z",
  updatedAt: "2026-08-01T09:00:00.000Z",
};

const ownWorkspace: Workspace = {
  projects: [ownProject],
  clients: [ownClient],
  resources: [ownResource],
};

const loadSample = (workspace: Workspace): Workspace => ({
  projects: withSampleRecords(
    workspace.projects,
    sampleWorkspaceProjectsFor(workspace.clients)
  ),
  clients: withSampleRecords(
    workspace.clients,
    sampleWorkspaceClientsFor(workspace.clients)
  ),
  resources: withSampleRecords(workspace.resources, sampleWorkspaceResources),
});

const clearSample = (workspace: Workspace): Workspace => ({
  projects: withoutSampleRecords(workspace.projects),
  clients: withoutSampleRecords(workspace.clients),
  resources: withoutSampleRecords(workspace.resources),
});

describe("sample workspace", () => {
  it("leaves the workspace as it was after seeding and clearing", () => {
    expect(clearSample(loadSample(ownWorkspace))).toEqual(ownWorkspace);
  });

  it("fills an empty workspace and empties it again", () => {
    const empty: Workspace = { projects: [], clients: [], resources: [] };
    const seeded = loadSample(empty);

    expect(seeded.clients).toHaveLength(sampleWorkspaceClients.length);
    expect(seeded.projects.length).toBeGreaterThan(1);
    expect(seeded.resources).toHaveLength(sampleWorkspaceResources.length);
    expect(clearSample(seeded)).toEqual(empty);
  });

  it("reuses a client the workspace already holds under the same name", () => {
    const workspace: Workspace = {
      projects: [],
      clients: [ownClient],
      resources: [],
    };
    const seeded = loadSample(workspace);
    const aperture = seeded.clients.filter(
      (client) => client.name === "Aperture Coffee"
    );

    expect(aperture).toEqual([ownClient]);
    for (const project of seeded.projects.filter(
      (project) => project.client === "Aperture Coffee"
    ))
      expect(project.clientId).toBe(ownClient.id);

    expect(clearSample(seeded).clients).toEqual([ownClient]);
  });

  it("seeds the same records when loaded twice", () => {
    const once = loadSample(ownWorkspace);
    const twice = loadSample(once);

    expect(twice.projects).toHaveLength(once.projects.length);
    expect(twice.clients).toHaveLength(once.clients.length);
    expect(twice.resources).toHaveLength(once.resources.length);
  });

  it("marks every seeded record and links projects to the seeded clients", () => {
    const seeded = loadSample({ projects: [], clients: [], resources: [] });
    const clientIds = new Set(seeded.clients.map((client) => client.id));

    for (const record of [
      ...seeded.projects,
      ...seeded.clients,
      ...seeded.resources,
    ])
      expect(isSampleRecordId(record.id)).toBe(true);

    for (const project of seeded.projects) {
      expect(project.clientId && clientIds.has(project.clientId)).toBe(true);
      expect(project.templateDeliverables?.length ?? 0).toBeGreaterThan(0);
    }
  });
});
