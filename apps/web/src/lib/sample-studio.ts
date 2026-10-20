import type { Client, ResourceLink, SettingsState, WorkItem } from "./types";
import { workflowStagesFromLabels } from "./workflow-templates";

export const sampleStudioSettings: SettingsState = {
  studioName: "Northstar Post",
  profileName: "Maya Chen",
  profileUsername: "mayacuts",
  profileTitle: "Lead Editor",
  profileBio: "Editorial and post-production for creator-led brands.",
  profileLocation: "Dubai, UAE",
  profileImageUrl: "",
  publicActiveProjects: 2,
  publicDeliveredEdits: 18,
  publicTurnaroundDays: 3,
  timeZone: "Asia/Dubai",
  dateFormat: "Month Day, Year",
  weekStart: "Mon",
  currencyCode: "USD",
  customClients: ["Aperture Coffee", "Field Notes", "Orbit Labs"],
  clients: [
    {
      id: "client-aperture-coffee",
      name: "Aperture Coffee",
      company: "Aperture Coffee",
      contactName: "",
      email: "",
      phone: "",
      notes: "",
      archived: false,
    },
    {
      id: "client-field-notes",
      name: "Field Notes",
      company: "Field Notes",
      contactName: "",
      email: "",
      phone: "",
      notes: "",
      archived: false,
    },
    {
      id: "client-orbit-labs",
      name: "Orbit Labs",
      company: "Orbit Labs",
      contactName: "",
      email: "",
      phone: "",
      notes: "",
      archived: false,
    },
  ],
  customProjectTemplates: [],
  projectTags: ["Client Work", "Retainer", "Personal Channel"],
  salaryWorkType: "Retainer",
  salaryBatchSize: 20,
  salaryBatchAmount: 10000,
  projectStages: ["Planned", "In Progress", "Client Review", "Delivered"],
  notifications: {},
  integrationConfigs: {},
  integrationLinks: {},
  teamRole: "Owner",
  teamMembers: [],
  rolePermissions: {},
  theme: "Dark",
  accentColor: "#14B8A6",
};

export const sampleStudioProjects: WorkItem[] = [
  {
    id: "sample-launch-film",
    profileId: "video-editor",
    createdAt: "2026-07-18T08:30:00.000Z",
    title: "Summer launch film",
    client: "Aperture Coffee",
    status: "In Progress",
    workType: "Client Work",
    startDate: "2026-07-18",
    dueDate: "2026-07-24",
    earnings: 1800,
    notes:
      "Picture lock is due next. Sound mix and final captions follow after approval.",
    workflowStages: workflowStagesFromLabels([
      "Assembly",
      "Fine cut",
      "Client Review",
      "Delivered",
    ]),
    checklistItems: [
      "Organize selects",
      "Complete fine cut",
      "Send review link",
      "Export masters",
    ],
    checklistCompleted: { "Organize selects": true, "Complete fine cut": true },
  },
  {
    id: "sample-founder-story",
    profileId: "video-editor",
    createdAt: "2026-07-14T10:15:00.000Z",
    title: "Founder story cutdown",
    client: "Orbit Labs",
    status: "Client Review",
    workType: "Client Work",
    startDate: "2026-07-14",
    dueDate: "2026-07-23",
    earnings: 950,
    notes:
      "Review link sent. Client requested a tighter opening and one lower-third correction.",
    workflowStages: workflowStagesFromLabels([
      "Assembly",
      "Fine cut",
      "Client Review",
      "Delivered",
    ]),
    checklistItems: [
      "Build first cut",
      "Internal review",
      "Send client review",
      "Address notes",
    ],
    checklistCompleted: {
      "Build first cut": true,
      "Internal review": true,
      "Send client review": true,
    },
  },
  {
    id: "sample-field-notes",
    profileId: "video-editor",
    createdAt: "2026-07-04T07:45:00.000Z",
    title: "Field Notes episode 12",
    client: "Field Notes",
    status: "Delivered",
    workType: "Client Work",
    startDate: "2026-07-04",
    dueDate: "2026-07-11",
    earnings: 1200,
    paid: true,
    paidDate: "2026-07-15T12:00:00.000Z",
    notes:
      "Approved on the second review round. Master and social cutdowns delivered.",
    checklistItems: [
      "Edit episode",
      "Client approval",
      "Deliver master",
      "Confirm payment",
    ],
    checklistCompleted: {
      "Edit episode": true,
      "Client approval": true,
      "Deliver master": true,
      "Confirm payment": true,
    },
  },
];

export const sampleStudioResources: ResourceLink[] = [
  {
    id: "sample-review-link",
    title: "Client review example",
    url: "/client-portal",
    category: "Review",
    projectId: "sample-founder-story",
    notes:
      "Clients open a private editor-provided link and do not need a Relay account.",
    createdAt: "2026-07-21T09:00:00.000Z",
    updatedAt: "2026-07-21T09:00:00.000Z",
  },
];

/** Seeded sample records carry this id prefix, so clearing finds exactly them. */
const SAMPLE_RECORD_PREFIX = "sample-";

export function isSampleRecordId(id: string) {
  return id.startsWith(SAMPLE_RECORD_PREFIX);
}

/** Adds the sample records to a workspace list without disturbing the rest. */
export function withSampleRecords<RecordType extends { id: string }>(
  current: readonly RecordType[],
  sample: readonly RecordType[]
): RecordType[] {
  const sampleIds = new Set(sample.map((record) => record.id));
  return [...current.filter((record) => !sampleIds.has(record.id)), ...sample];
}

/** Removes the sample records and leaves everything else in place. */
export function withoutSampleRecords<RecordType extends { id: string }>(
  records: readonly RecordType[]
): RecordType[] {
  return records.filter((record) => !isSampleRecordId(record.id));
}

function sampleRecordId(fixtureId: string) {
  return `${SAMPLE_RECORD_PREFIX}${fixtureId}`;
}

/** The demo clients a new workspace loads. */
export const sampleWorkspaceClients: Client[] =
  sampleStudioSettings.clients.map((client) => ({
    ...client,
    id: sampleRecordId(client.id),
  }));

/** The demo clients a workspace loads, skipping names it already holds. */
export function sampleWorkspaceClientsFor(
  existing: readonly Client[]
): Client[] {
  const names = new Set(
    existing.map((client) => client.name.trim().toLowerCase())
  );
  return sampleWorkspaceClients.filter(
    (client) => !names.has(client.name.trim().toLowerCase())
  );
}

/** Outputs for the demo projects, drawn from what each fixture project notes. */
const sampleProjectOutputs: Record<
  string,
  NonNullable<WorkItem["templateDeliverables"]>
> = {
  "sample-launch-film": [
    { title: "Fine cut", category: "Deliverable", initialStatus: "approved" },
    { title: "Picture lock", category: "Deliverable", initialStatus: "draft" },
    { title: "Sound mix", category: "Deliverable", initialStatus: "draft" },
    { title: "Captions", category: "Deliverable", initialStatus: "draft" },
  ],
  "sample-founder-story": [
    {
      title: "Opening cut",
      category: "Deliverable",
      initialStatus: "changes_requested",
    },
    {
      title: "Lower thirds",
      category: "Asset",
      initialStatus: "changes_requested",
    },
  ],
  "sample-field-notes": [
    {
      title: "Master",
      category: "Deliverable",
      initialStatus: "final_delivered",
    },
    {
      title: "Social cutdown",
      category: "Deliverable",
      initialStatus: "final_delivered",
    },
  ],
};

/**
 * The demo projects a workspace loads, linked to the demo clients. A project
 * whose client name already exists points at that record instead, because
 * clients are stored one per name.
 */
export function sampleWorkspaceProjectsFor(
  existingClients: readonly Client[]
): WorkItem[] {
  const clientIdByName = new Map(
    existingClients.map((client) => [
      client.name.trim().toLowerCase(),
      client.id,
    ])
  );
  return sampleStudioProjects.map((project) => ({
    ...project,
    clientId:
      clientIdByName.get((project.client ?? "").trim().toLowerCase()) ??
      sampleWorkspaceClients.find((client) => client.name === project.client)
        ?.id,
    templateDeliverables: sampleProjectOutputs[project.id],
  }));
}

/** The review link a new workspace loads with the demo projects. */
export const sampleWorkspaceResources: ResourceLink[] = sampleStudioResources;

/** Setters the sample records are written through, matching the data context's. */
type SampleWorkspaceWrites = {
  setItems: (updater: (current: WorkItem[]) => WorkItem[]) => void;
  setSettings: (updater: (current: SettingsState) => SettingsState) => void;
  setResourceLinks: (
    updater: (current: ResourceLink[]) => ResourceLink[]
  ) => void;
};

type SampleWorkspacePorts = SampleWorkspaceWrites & {
  clients: readonly Client[];
  /** Resolves once a pending settings write has reached the server. */
  awaitSettings?: () => Promise<void>;
  /** Resolves once the projects `setItems` started have reached the server. */
  awaitProjects?: () => Promise<void>;
};

/**
 * Adds the demo records. The Clients are written first and awaited, because a
 * synced Project may only reference a Client the Workspace already holds, so a
 * project created while that write is still in flight is rejected.
 */
export async function seedSampleWorkspace({
  clients,
  awaitSettings,
  awaitProjects,
  setItems,
  setSettings,
  setResourceLinks,
}: SampleWorkspacePorts) {
  const seededClients = sampleWorkspaceClientsFor(clients);
  setSettings((current) => ({
    ...current,
    clients: withSampleRecords(current.clients, seededClients),
  }));
  if (awaitSettings) await awaitSettings();
  setItems((current) =>
    withSampleRecords(
      current,
      sampleWorkspaceProjectsFor([...clients, ...seededClients])
    )
  );
  setResourceLinks((current) =>
    withSampleRecords(current, sampleWorkspaceResources)
  );
  // Rejecting here is what lets the first-run screen report the failure.
  if (awaitProjects) await awaitProjects();
}

/** Removes the seeded records and leaves everything else in place. */
export function clearSampleWorkspace({
  setItems,
  setSettings,
  setResourceLinks,
}: SampleWorkspaceWrites) {
  setSettings((current) => ({
    ...current,
    clients: withoutSampleRecords(current.clients),
  }));
  setItems((current) => withoutSampleRecords(current));
  setResourceLinks((current) => withoutSampleRecords(current));
}
