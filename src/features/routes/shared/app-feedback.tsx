"use client";

import { AnimatePresence, motion } from "motion/react";
import { useHydratedReducedMotion } from "@/lib/motion";
import { Button as OwnedButton } from "@/components/ui/button";
import { X } from "lucide-react";
import type { ToastState } from "./route-types";
import {
  accent,
  activeBg,
  border,
  successColor,
  warningColor,
} from "./route-theme";

export function AppToast({
  toast,
  onClose,
}: {
  toast: ToastState | null;
  onClose: () => void;
}) {
  const reduceMotion = useHydratedReducedMotion();
  const palette =
    toast?.tone === "warning"
      ? {
          bg: "var(--app-warning-bg, rgba(245,166,35,0.14))",
          fg: warningColor,
          border,
        }
      : toast?.tone === "info"
        ? { bg: activeBg, fg: accent, border }
        : {
            bg: "var(--app-success-bg, rgba(35,181,142,0.14))",
            fg: successColor,
            border,
          };

  return (
    <AnimatePresence>
      {toast ? (
        <motion.div
          key={toast.message}
          initial={reduceMotion ? false : { opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={
            reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }
          }
          transition={{
            duration: reduceMotion ? 0 : 0.18,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="app-toast-position fixed right-4 z-50 w-[min(360px,calc(100vw-32px))]"
        >
          <div
            role="status"
            className="flex max-w-[360px] items-center gap-3 rounded-md border px-3 py-2.5 shadow-[var(--app-shadow-2)]"
            style={{
              backgroundColor: palette.bg,
              borderColor: palette.border,
              color: palette.fg,
            }}
          >
            <p className="min-w-0 flex-1 text-[13px] font-semibold">
              {toast.message}
            </p>
            <OwnedButton
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Dismiss notification"
              onClick={onClose}
              className="shrink-0 hover:bg-current/10"
              style={{ color: palette.fg }}
            >
              <X aria-hidden="true" className="size-4" />
            </OwnedButton>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function AppLoadingStatus() {
  return (
    <div
      role="status"
      className="fixed inset-0 z-[1450] grid place-items-center bg-[var(--app-canvas)] text-sm text-[var(--app-muted)]"
    >
      Loading Relay…
    </div>
  );
}
