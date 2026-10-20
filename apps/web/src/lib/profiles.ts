export const DEFAULT_PROFILE_ID = "video-editor";

export const defaultProfile = {
  id: DEFAULT_PROFILE_ID,
  typeOptions: [
    { label: "Job / Salary", earningsMode: "batch" },
    { label: "Freelance", earningsMode: "manual" },
    { label: "Personal Channel", earningsMode: "optional" },
  ],
} as const;
