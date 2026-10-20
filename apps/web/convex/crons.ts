import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Hourly so each Workspace's local day boundary is picked up within an hour.
crons.interval(
  "deadline risk scan",
  { hours: 1 },
  internal.deadlineRisk.scanAll,
  { cursor: null }
);

export default crons;
