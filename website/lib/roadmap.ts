import { GITHUB_REPO } from "./links";

/** An issue with any of these labels appears on the roadmap. */
export const ROADMAP_LABELS = ["ai-roadmap", "roadmap"] as const;
/** Open roadmap issues with this label (case-insensitive) show as in progress. */
export const IN_PROGRESS_LABEL = "in progress";

const ROADMAP_STATUSES = ["in-progress", "planned", "shipped"] as const;
export type RoadmapStatus = (typeof ROADMAP_STATUSES)[number];

export type RoadmapItem = {
  number: number;
  title: string;
  category: string | null;
  summary: string | null;
  url: string;
  status: RoadmapStatus;
};

export type RoadmapResult =
  { ok: true; items: RoadmapItem[]; fetchedAt: number } | { ok: false };

type RoadmapSuccess = Extract<RoadmapResult, { ok: true }>;

const SHIPPED_LIMIT = 6;
const MEMO_TTL_MS = 10 * 60 * 1000;
const EDGE_CACHE_CONTROL = "public, max-age=900";
const SUMMARY_MAX_LENGTH = 180;
const GRAPHQL_API_URL = "https://api.github.com/graphql";
// Synthetic GET key for the Workers Cache API, which cannot cache POSTs.
const EDGE_CACHE_REQUEST = new Request(
  `https://relay-roadmap.internal/v1?labels=${ROADMAP_LABELS.join(",")}`
);

/** One query covers every roadmap label: the `labels:` argument is a union. */
const ROADMAP_QUERY = `query RoadmapIssues($owner: String!, $name: String!, $labels: [String!]) {
  repository(owner: $owner, name: $name) {
    issues(first: 100, labels: $labels, orderBy: { field: CREATED_AT, direction: ASC }) {
      nodes {
        number
        title
        url
        state
        stateReason
        closedAt
        body
        labels(first: 20) {
          nodes {
            name
          }
        }
      }
    }
  }
}`;

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

type GitHubIssue = {
  number: number;
  title: string;
  url: string;
  state: string;
  stateReason: string | null;
  labels: string[];
  body: string | null;
  closedAt: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Like Array.isArray, but narrows to `unknown[]` instead of `any[]`. */
function isArray(value: unknown): value is readonly unknown[] {
  return Array.isArray(value);
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function labelName(value: unknown): string | null {
  if (typeof value === "string") return value;
  return isRecord(value) ? stringOrNull(value.name) : null;
}

/** Reads one issue node from the GraphQL response. Returns null for malformed entries. */
function readIssue(value: unknown): GitHubIssue | null {
  if (!isRecord(value)) return null;

  const { number, title, url, state } = value;
  if (
    typeof number !== "number" ||
    typeof title !== "string" ||
    typeof url !== "string" ||
    typeof state !== "string"
  ) {
    return null;
  }

  const labels =
    isRecord(value.labels) && isArray(value.labels.nodes)
      ? value.labels.nodes.flatMap((label) => {
          const name = labelName(label);
          return name === null ? [] : [name];
        })
      : [];

  return {
    number,
    title,
    url,
    state,
    stateReason: stringOrNull(value.stateReason),
    labels,
    body: stringOrNull(value.body),
    closedAt: stringOrNull(value.closedAt),
  };
}

function statusOf(issue: GitHubIssue): RoadmapStatus | null {
  if (issue.state.toLowerCase() === "open") {
    const inProgress = issue.labels.some(
      (label) => label.toLowerCase() === IN_PROGRESS_LABEL
    );
    return inProgress ? "in-progress" : "planned";
  }
  if (
    issue.state.toLowerCase() === "closed" &&
    issue.stateReason?.toLowerCase() === "completed"
  ) {
    return "shipped";
  }
  return null;
}

/** Splits "AI infra: aiRuns table" into a category ("AI infra") and title ("aiRuns table"). */
function splitTitle(raw: string): { category: string | null; title: string } {
  const trimmed = raw.trim();
  const match = /^([^:]{1,24}):\s+(.+)$/.exec(trimmed);
  return match
    ? { category: match[1].trim(), title: match[2].trim() }
    : { category: null, title: trimmed };
}

function closedTime(issue: GitHubIssue): number {
  const time = issue.closedAt ? Date.parse(issue.closedAt) : NaN;
  return Number.isNaN(time) ? 0 : time;
}

/**
 * Turns the GraphQL issues `nodes` array into roadmap items: in progress,
 * then planned (both by issue number), then the latest shipped issues.
 * Duplicates are dropped.
 */
export function toRoadmapItems(nodes: unknown): RoadmapItem[] {
  if (!isArray(nodes)) return [];

  const byNumber = new Map<
    number,
    { issue: GitHubIssue; status: RoadmapStatus }
  >();
  for (const entry of nodes) {
    const issue = readIssue(entry);
    if (!issue || byNumber.has(issue.number)) continue;
    const status = statusOf(issue);
    if (status) byNumber.set(issue.number, { issue, status });
  }

  const entries = [...byNumber.values()];
  const byNumberAsc = (a: { issue: GitHubIssue }, b: { issue: GitHubIssue }) =>
    a.issue.number - b.issue.number;

  const ordered = [
    ...entries.filter((e) => e.status === "in-progress").sort(byNumberAsc),
    ...entries.filter((e) => e.status === "planned").sort(byNumberAsc),
    ...entries
      .filter((e) => e.status === "shipped")
      .sort((a, b) => closedTime(b.issue) - closedTime(a.issue))
      .slice(0, SHIPPED_LIMIT),
  ];

  return ordered.map(({ issue, status }) => ({
    number: issue.number,
    ...splitTitle(issue.title),
    summary: summarize(issue.body),
    url: issue.url,
    status,
  }));
}

const SKIPPED_PARAGRAPH = /^(\*\*|- |\* |>|<!--|\||\d+\. )/;

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const slice = text.slice(0, max - 1);
  const lastSpace = slice.lastIndexOf(" ");
  const cut = lastSpace > 0 ? slice.slice(0, lastSpace) : slice;
  return `${cut.replace(/[\s,;:.\u2013\u2014-]+$/, "")}…`;
}

/**
 * Picks a one-line summary from an issue body: the first plain paragraph
 * before any heading, with markdown stripped and capped at 180 characters.
 */
export function summarize(body: string | null): string | null {
  if (!body) return null;

  const lines = body.replace(/\r\n?/g, "\n").split("\n");
  const headingIndex = lines.findIndex((line) => /^ {0,3}#/.test(line));
  const intro = (
    headingIndex === -1 ? lines : lines.slice(0, headingIndex)
  ).join("\n");

  for (const raw of intro.split(/\n\s*\n/)) {
    const paragraph = raw.trim();
    if (!paragraph || SKIPPED_PARAGRAPH.test(paragraph)) continue;

    const text = paragraph
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/\*\*/g, "")
      .replace(/`/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/^_+|_+$/g, "")
      .trim();

    if (text) return truncate(text, SUMMARY_MAX_LENGTH);
  }
  return null;
}

// ---------------------------------------------------------------------------
// Fetching and caching
// ---------------------------------------------------------------------------

class GitHubRequestError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`GitHub responded with ${status}`);
    this.status = status;
  }
}

/** The GraphQL endpoint answered but reported errors or had no issues nodes. */
class GitHubResponseError extends Error {
  constructor() {
    super("GraphQL error");
  }
}

function isCache(value: unknown): value is Cache {
  return (
    isRecord(value) &&
    typeof value.match === "function" &&
    typeof value.put === "function"
  );
}

/** Returns the Cloudflare Workers default cache, or null outside Workers (e.g. Node). */
function getEdgeCache(): Cache | null {
  const storage: unknown = Reflect.get(globalThis, "caches");
  if (typeof storage !== "object" || storage === null) return null;
  const defaultCache: unknown = Reflect.get(storage, "default");
  return isCache(defaultCache) ? defaultCache : null;
}

async function readCachedNodes(
  cache: Cache
): Promise<readonly unknown[] | undefined> {
  try {
    const hit = await cache.match(EDGE_CACHE_REQUEST);
    if (!hit) return undefined;
    const json: unknown = await hit.json();
    return isArray(json) ? json : undefined;
  } catch {
    return undefined;
  }
}

async function writeCachedNodes(
  cache: Cache,
  nodes: readonly unknown[]
): Promise<void> {
  try {
    await cache.put(
      EDGE_CACHE_REQUEST,
      new Response(JSON.stringify(nodes), {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": EDGE_CACHE_CONTROL,
        },
      })
    );
  } catch {
    // A cache write failure should not hide fresh data.
  }
}

/** POSTs the roadmap query to the GitHub GraphQL API and returns the issue nodes. */
async function fetchRoadmapIssues(token: string): Promise<readonly unknown[]> {
  const [owner, name] = GITHUB_REPO.split("/");
  const response = await fetch(GRAPHQL_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "relay-marketing",
    },
    body: JSON.stringify({
      query: ROADMAP_QUERY,
      variables: { owner, name, labels: [...ROADMAP_LABELS] },
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new GitHubRequestError(response.status);

  const json: unknown = await response.json();
  if (!isRecord(json)) throw new GitHubResponseError();
  if (isArray(json.errors) && json.errors.length > 0) {
    throw new GitHubResponseError();
  }

  const repository = isRecord(json.data) ? json.data.repository : undefined;
  const issues = isRecord(repository) ? repository.issues : undefined;
  const nodes = isRecord(issues) ? issues.nodes : undefined;
  if (!isArray(nodes)) throw new GitHubResponseError();
  return nodes;
}

let memo: RoadmapSuccess | null = null;

/**
 * Loads roadmap items from GitHub issues labelled with any ROADMAP_LABELS via
 * the GraphQL API, which requires GITHUB_TOKEN. Successful results are
 * memoized per isolate for 10 minutes and the extracted issue nodes are kept
 * in the Workers cache for 15 minutes. Failures are never cached and return
 * `{ ok: false }`.
 */
export async function getRoadmap(): Promise<RoadmapResult> {
  if (memo && Date.now() - memo.fetchedAt < MEMO_TTL_MS) return memo;

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.warn("Roadmap: GITHUB_TOKEN is not set.");
    return { ok: false };
  }

  try {
    const cache = getEdgeCache();
    let nodes = cache ? await readCachedNodes(cache) : undefined;
    if (nodes === undefined) {
      nodes = await fetchRoadmapIssues(token);
      if (cache) await writeCachedNodes(cache, nodes);
    }
    memo = { ok: true, items: toRoadmapItems(nodes), fetchedAt: Date.now() };
    return memo;
  } catch (error) {
    const reason =
      error instanceof GitHubRequestError
        ? `status ${error.status}`
        : error instanceof Error
          ? error.message
          : "unknown error";
    console.warn(`Roadmap: GitHub request failed (${reason}).`);
    return { ok: false };
  }
}
