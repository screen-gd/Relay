"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useData } from "@/lib/data-context";

export function useWorkspaceDiscovery() {
  const { isSignedIn } = useData();
  const { isAuthenticated } = useConvexAuth();
  return useQuery(
    api.workspaceDiscovery.list,
    isSignedIn && isAuthenticated ? {} : "skip"
  );
}
