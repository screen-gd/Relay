"use client";

import { X } from "@/components/icons";
import { Button as OwnedButton } from "@/components/ui/button";
import { useEffect, useId, useRef, useState } from "react";
import { Toaster, toast as sonnerToast } from "sonner";
import type { ToastState } from "./route-types";

export function AppToast({
  toast,
  onClose,
}: {
  toast: ToastState | null;
  onClose: () => void;
}) {
  const toasterId = useId();
  const latest = useRef({ toast, onClose });

  useEffect(() => {
    latest.current = { toast, onClose };
  }, [toast, onClose]);

  useEffect(() => {
    if (!toast) return;
    let active = true;
    const close = () => {
      if (active && latest.current.toast === toast) latest.current.onClose();
    };
    const id = sonnerToast.custom(
      () => <ToastContent toast={toast} onClose={close} />,
      {
        toasterId,
        // The data provider owns expiry and keeps failures until dismissed.
        duration: Infinity,
        onDismiss: close,
      }
    );

    return () => {
      active = false;
      sonnerToast.dismiss(id);
    };
  }, [toast, toasterId]);

  return (
    <Toaster
      id={toasterId}
      className="app-toaster"
      position="bottom-right"
      visibleToasts={1}
      swipeDirections={[]}
      offset={16}
      mobileOffset={16}
      toastOptions={{ unstyled: true }}
    />
  );
}

function ToastContent({
  toast,
  onClose,
}: {
  toast: ToastState;
  onClose: () => void;
}) {
  const dotColor =
    toast.tone === "error"
      ? "bg-[var(--status-danger)]"
      : toast.tone === "warning"
        ? "bg-[var(--status-warning)]"
        : toast.tone === "info"
          ? "bg-[var(--status-info)]"
          : "bg-[var(--status-success)]";

  return (
    <div
      role={toast.tone === "error" ? "alert" : "status"}
      className="flex w-full items-center gap-3 rounded-md border border-[var(--border-control)] bg-[var(--surface-overlay)] px-3 py-3 text-[var(--text-primary)] shadow-[var(--shadow-overlay)]"
    >
      <span
        aria-hidden="true"
        className={`size-1.5 shrink-0 rounded-full ${dotColor}`}
      />
      <p
        className={
          toast.tone === "error"
            ? "min-w-0 flex-1 text-body text-[var(--status-danger)]"
            : "min-w-0 flex-1 text-body"
        }
      >
        {toast.message}
      </p>
      {toast.tone === "error" ? (
        <OwnedButton
          variant="secondary"
          size="sm"
          onClick={() => {
            onClose();
            (toast.retry ?? (() => window.location.reload()))();
          }}
        >
          Retry
        </OwnedButton>
      ) : null}
      <OwnedButton
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Dismiss notification"
        onClick={onClose}
        className="shrink-0"
      >
        <X aria-hidden="true" className="size-4" />
      </OwnedButton>
    </div>
  );
}

/** How long account sign-in may load before the gate offers a way out. */
export const AUTH_LOADING_DEADLINE_MS = 8000;

type ClerkLoadStatus = "degraded" | "error" | "loading" | "ready";

/**
 * Covers the workspace while account sign-in loads. Mount it only while auth
 * is unresolved: a late load unmounts it, so slow sign-in never gets blocked.
 * After the deadline, or as soon as Clerk reports an error, it becomes an
 * alert with Retry and a Local Mode path for this device's projects.
 */
export function AuthLoadingGate({
  clerkStatus,
  onContinueLocally,
}: {
  clerkStatus: ClerkLoadStatus;
  onContinueLocally: () => void;
}) {
  const [deadlinePassed, setDeadlinePassed] = useState(false);
  const retryRef = useRef<HTMLButtonElement>(null);
  const failed = clerkStatus === "error" || deadlinePassed;

  useEffect(() => {
    const timer = window.setTimeout(
      () => setDeadlinePassed(true),
      AUTH_LOADING_DEADLINE_MS
    );
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (failed) retryRef.current?.focus();
  }, [failed]);

  if (!failed) {
    return (
      <div
        role="status"
        className="fixed inset-0 z-[1450] grid place-items-center bg-[var(--surface-page)] text-body text-[var(--text-meta)]"
      >
        Loading Relay…
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[1450] grid place-items-center bg-[var(--surface-page)] p-6">
      <div
        role="alert"
        aria-labelledby="auth-gate-title"
        className="grid max-w-md gap-4"
      >
        <h2
          id="auth-gate-title"
          className="text-title font-semibold text-[var(--text-primary)]"
        >
          Sign-in is unavailable
        </h2>
        <p className="text-body text-[var(--text-meta)]">
          {clerkStatus === "error"
            ? "Relay could not start account sign-in."
            : "Account sign-in is taking too long."}{" "}
          Retry, or open Local Mode to use projects saved on this device.
        </p>
        <div className="flex flex-wrap gap-2">
          <OwnedButton
            ref={retryRef}
            type="button"
            className=""
            onClick={() => window.location.reload()}
          >
            Retry
          </OwnedButton>
          <OwnedButton
            type="button"
            variant="secondary"
            className=""
            onClick={onContinueLocally}
          >
            Use Local Mode
          </OwnedButton>
        </div>
      </div>
    </div>
  );
}
