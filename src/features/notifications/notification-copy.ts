export function notificationCopy(item: string) {
  const copy: Record<string, string> = {
    "Project updates": "Status changes, notes, and project activity",
    "Feedback received": "When feedback is added to your projects",
    "Upcoming deadlines": "Daily summary of due dates and overdue items",
    Mentions: "When you are mentioned in comments",
    "Weekly summary": "A recap of projects and tasks every Monday",
  };
  return copy[item] ?? "Tracker notification";
}
