"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { useData } from "@/lib/data-context";
import { useOptionalAuth } from "@/lib/optional-auth";
import { api } from "../../../convex/_generated/api";

export function useSubscriptionController() {
  const { isAuthEnabled } = useData();
  const { isSignedIn, isLoaded, openSignIn, openSignUp } = useOptionalAuth();
  const {
    isAuthenticated: isConvexAuthenticated,
    isLoading: isConvexAuthLoading,
  } = useConvexAuth();
  const subscription = useQuery(
    api.workspaceSubscriptions.getCurrent,
    isSignedIn && isConvexAuthenticated ? {} : "skip"
  );
  const trial = useQuery(
    api.creatorTrials.getAvailability,
    isSignedIn && isConvexAuthenticated ? {} : "skip"
  );
  const startCreatorTrial = useMutation(api.creatorTrials.start);
  const [startingTrial, setStartingTrial] = useState(false);
  const [trialError, setTrialError] = useState("");
  const setTestPlan = useMutation(api.workspaceSubscriptions.setTestPlan);
  const [switchingTestPlan, setSwitchingTestPlan] = useState(false);
  const [testPlanError, setTestPlanError] = useState("");

  async function changeTestPlan(
    plan: NonNullable<typeof subscription>["testPlan"]
  ) {
    if (switchingTestPlan || !subscription?.canTestPlans) return;
    setSwitchingTestPlan(true);
    setTestPlanError("");
    try {
      await setTestPlan({ plan });
    } catch (error) {
      setTestPlanError(
        error instanceof Error
          ? error.message
          : "The test plan could not be changed."
      );
    } finally {
      setSwitchingTestPlan(false);
    }
  }

  async function startTrial() {
    if (startingTrial || !trial?.canStart) return;
    setStartingTrial(true);
    setTrialError("");
    try {
      await startCreatorTrial({});
    } catch (error) {
      setTrialError(
        error instanceof Error
          ? error.message
          : "Your Creator trial could not be started."
      );
    } finally {
      setStartingTrial(false);
    }
  }
  return {
    isAuthEnabled,
    isSignedIn,
    isLoaded,
    openSignIn,
    openSignUp,
    isConvexAuthenticated,
    isConvexAuthLoading,
    subscription,
    trial,
    startingTrial,
    trialError,
    startTrial,
    switchingTestPlan,
    testPlanError,
    changeTestPlan,
  };
}
