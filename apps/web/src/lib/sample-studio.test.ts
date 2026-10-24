import { describe, expect, it } from "vitest";
import type { Client, ResourceLink, SettingsState, WorkItem } from "./types";
import {
  clearSampleWorkspace,
  isSampleRecordId,
  sampleStudioSettings,
  sampleWorkspaceClients,
  sampleWorkspaceResources,
  seedSampleWorkspace,
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

/** Drives the shipped seed and clear helpers, reading back a plain workspace. */
function sampleWrites(workspace: Workspace) {
  let next = workspace;
  return {
    read: () => next,
    ports: {
      clients: workspace.clients,
      setSettings: (updater: (current: SettingsState) => SettingsState) => {
        next = {
          ...next,
          clients: updater({ ...sampleStudioSettings, clients: next.clients })
            .clients,
        };
      },
      setItems: (updater: (current: WorkItem[]) => WorkItem[]) => {
        next = { ...next, projects: updater(next.projects) };
      },
      setResourceLinks: (
        updater: (current: ResourceLink[]) => ResourceLink[]
      ) => {
        next = { ...next, resources: updater(next.resources) };
      },
    },
  };
}

const loadSample = async (workspace: Workspace): Promise<Workspace> => {
  const { read, ports } = sampleWrites(workspace);
  await seedSampleWorkspace(ports);
  return read();
};

const clearSample = (workspace: Workspace): Workspace => {
  const { read, ports } = sampleWrites(workspace);
  clearSampleWorkspace(ports);
  return read();
};

describe("sample workspace", () => {
  it("leaves the workspace as it was after seeding and clearing", async () => {
    expect(clearSample(await loadSample(ownWorkspace))).toEqual(ownWorkspace);
  });

  it("fills an empty workspace and empties it again", async () => {
    const empty: Workspace = { projects: [], clients: [], resources: [] };
    const seeded = await loadSample(empty);

    expect(seeded.clients).toHaveLength(sampleWorkspaceClients.length);
    expect(seeded.projects.length).toBeGreaterThan(1);
    expect(seeded.resources).toHaveLength(sampleWorkspaceResources.length);
    expect(clearSample(seeded)).toEqual(empty);
  });

  it("reuses a client the workspace already holds under the same name", async () => {
    const workspace: Workspace = {
      projects: [],
      clients: [ownClient],
      resources: [],
    };
    const seeded = await loadSample(workspace);
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

  it("seeds the same records when loaded twice", async () => {
    const once = await loadSample(ownWorkspace);
    const twice = await loadSample(once);

    expect(twice.projects).toHaveLength(once.projects.length);
    expect(twice.clients).toHaveLength(once.clients.length);
    expect(twice.resources).toHaveLength(once.resources.length);
  });

  it("marks every seeded record and links projects to the seeded clients", async () => {
    const seeded = await loadSample({
      projects: [],
      clients: [],
      resources: [],
    });
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

  it("reports a failed project write instead of reporting a load", async () => {
    let projectsWereSet = false;

    await expect(
      seedSampleWorkspace({
        clients: [],
        awaitSettings: async () => undefined,
        setSettings: () => undefined,
        setItems: () => {
          projectsWereSet = true;
        },
        setResourceLinks: () => undefined,
        awaitProjects: async () => {
          throw new Error("Project Client must belong to this Workspace");
        },
      })
    ).rejects.toThrow("Project Client must belong to this Workspace");
    expect(projectsWereSet).toBe(true);
  });

  it("saves the sample clients before creating projects that reference them", async () => {
    let savedClients: Client[] = [];
    let serverClientIds = new Set<string>();
    let projects: WorkItem[] = [];
    // The server rejects a Project whose Client it does not hold yet.
    let unknownClientIds: string[] = [];

    await seedSampleWorkspace({
      clients: [],
      // Stands in for the settings write reaching the server: only ids that
      // have landed there may be referenced by a project created after it.
      awaitSettings: async () => {
        await Promise.resolve();
        serverClientIds = new Set(savedClients.map((client) => client.id));
      },
      setSettings: (updater) => {
        savedClients = updater({
          ...sampleStudioSettings,
          clients: [],
        }).clients;
      },
      setItems: (updater) => {
        projects = updater([]);
        unknownClientIds = projects
          .map((project) => project.clientId ?? "")
          .filter((clientId) => !serverClientIds.has(clientId));
      },
      setResourceLinks: () => undefined,
    });

    expect(savedClients.length).toBeGreaterThan(0);
    expect(projects.length).toBeGreaterThan(0);
    expect(unknownClientIds).toEqual([]);
  });
});
