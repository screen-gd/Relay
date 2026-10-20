"use client";

import { useMutation } from "convex/react";
import { useData } from "@/lib/data-context";
import { api } from "../../../convex/_generated/api";

export function useProfileController() {
  const { isSignedIn } = useData();
  const publishPublicProfile = useMutation(api.publicProfiles.publish);
  return { isSignedIn, publishPublicProfile };
}
