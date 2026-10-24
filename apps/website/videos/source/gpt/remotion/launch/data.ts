import type { StageName } from "./theme";

// Fictional sample workspace, matching the names used on Relay's marketing site.
export type SampleProject = {
  name: string;
  client: string;
  stage: StageName;
  due: string;
  value: number;
  progress: number;
  owner: string;
};

export const projects: readonly SampleProject[] = [
  {
    name: "Podcast episode 31",
    client: "Northwind Audio",
    stage: "Editing",
    due: "May 10",
    value: 700,
    progress: 46,
    owner: "SK",
  },
  {
    name: "Founder story cutdown",
    client: "Orbit Labs",
    stage: "Client Review",
    due: "May 7",
    value: 950,
    progress: 72,
    owner: "SK",
  },
  {
    name: "Field Notes episode 12",
    client: "Field Notes",
    stage: "Revisions",
    due: "May 8",
    value: 1200,
    progress: 81,
    owner: "AR",
  },
  {
    name: "Spring menu reels",
    client: "Aperture Coffee",
    stage: "Approved",
    due: "May 9",
    value: 640,
    progress: 94,
    owner: "AR",
  },
  {
    name: "Product ad 30s",
    client: "Northwind Audio",
    stage: "Planned",
    due: "May 14",
    value: 2200,
    progress: 12,
    owner: "SK",
  },
  {
    name: "Brand film v3",
    client: "Aperture Coffee",
    stage: "Delivered",
    due: "Apr 28",
    value: 1250,
    progress: 100,
    owner: "AR",
  },
  {
    name: "Campaign cutdowns",
    client: "Orbit Labs",
    stage: "Delivered",
    due: "May 2",
    value: 1500,
    progress: 100,
    owner: "SK",
  },
];

export const createdProject: SampleProject = {
  name: "Summer launch film",
  client: "Aperture Coffee",
  stage: "Planned",
  due: "May 5",
  value: 1800,
  progress: 0,
  owner: "AR",
};

export const reviewComments = [
  {
    author: "Maya Chen",
    initials: "MC",
    time: "00:04",
    at: 0.18,
    text: "Hold this shot half a second longer.",
  },
  {
    author: "Jordan Patel",
    initials: "JP",
    time: "00:09",
    at: 0.4,
    text: "Love the pace here.",
  },
] as const;
