export function projectStageIssues(stages: string[]) {
  if (stages.some((stage) => !stage.trim()))
    return "Workflow stages cannot be blank.";
  const normalized = stages.map((stage) => stage.trim().toLowerCase());
  if (new Set(normalized).size !== normalized.length)
    return "Workflow stages must be unique.";
  return "";
}

export function projectTagIssues(tags: string[]) {
  if (!tags.length) return "At least one project tag is required.";
  if (tags.some((tag) => !tag.trim())) return "Project tags cannot be blank.";
  const normalized = tags.map((tag) => tag.trim().toLowerCase());
  if (new Set(normalized).size !== normalized.length)
    return "Project tags must be unique.";
  return "";
}

export function nextStageName(stages: string[]) {
  const names = new Set(stages.map((stage) => stage.trim().toLowerCase()));
  let index = 1;
  while (names.has(`new stage ${index}`)) index += 1;
  return `New Stage ${index}`;
}

export function nextProjectTagName(tags: string[]) {
  const names = new Set(tags.map((tag) => tag.trim().toLowerCase()));
  let index = 1;
  while (names.has(`custom tag ${index}`)) index += 1;
  return `Custom Tag ${index}`;
}
