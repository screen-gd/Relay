import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";

const failure = "Project Client must belong to this Workspace";
const writes: string[] = [];

vi.mock("@clerk/tanstack-react-start", () => ({
  useAuth: () => ({
    isLoaded: true,
    isSignedIn: true,
    getToken: async () => "token",
  }),
  useUser: () => ({
    isLoaded: true,
    isSignedIn: true,
    user: { id: "user_1" },
  }),
}));

vi.mock("convex/react", () => ({
  useConvex: () => ({ query: async () => undefined }),
  useConvexAuth: () => ({ isLoading: false, isAuthenticated: true }),
  useQuery: () => undefined,
  usePaginatedQuery: () => ({
    results: [],
    status: "Exhausted",
    loadMore: () => undefined,
  }),
  useAction: () => async () => undefined,
  // `api.projects.create` is called with the project it writes, so the failing
  // write is recognisable here without comparing Convex's proxy references.
  useMutation: () => async (args: unknown) => {
    if (args && !Array.isArray(args) && "project" in (args as object)) {
      writes.push("createProject");
      throw new Error(failure);
    }
    return undefined;
  },
}));

const { DataProvider, useData } = await import("./data-context");

function Probe({ onReady }: { onReady: (data: unknown) => void }) {
  const data = useData();
  onReady(data);
  return null;
}

/**
 * The provider starts its project writes as the setter runs, so a sample load
 * whose project write fails is reported. The Convex hooks are stubbed and the
 * seed's own ports run, which is the closest this node-only suite gets to the
 * signed-in screens.
 */
describe("CloudDataProvider sample load", () => {
  test("reports a failed project write from the sample seed", async () => {
    let data: ReturnType<typeof useData> | undefined;
    renderToStaticMarkup(
      <DataProvider mode="cloud">
        <Probe
          onReady={(value) => (data = value as ReturnType<typeof useData>)}
        />
      </DataProvider>
    );
    expect(data).toBeDefined();

    await expect(data!.sampleWorkspace.load()).rejects.toThrow(failure);
    // One write per seeded project: every one of them starts as the setter runs.
    expect(writes).toEqual(["createProject", "createProject", "createProject"]);
  });
});
