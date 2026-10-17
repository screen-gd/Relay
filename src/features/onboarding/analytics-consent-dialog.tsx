"use client";

import { Button as OwnedButton } from "@/components/ui/button";
import {
  Dialog as OwnedDialog,
  DialogContent as OwnedDialogContent,
  DialogDescription as OwnedDialogDescription,
  DialogFooter as OwnedDialogFooter,
  DialogHeader as OwnedDialogHeader,
  DialogTitle as OwnedDialogTitle,
} from "@/components/ui/dialog";
import type { AnalyticsConsent } from "@/lib/telemetry";

export function AnalyticsConsentDialog({
  open,
  onChoose,
}: {
  open: boolean;
  onChoose: (consent: Exclude<AnalyticsConsent, "unknown">) => void;
}) {
  return (
    <OwnedDialog open={open} onOpenChange={() => {}}>
      <OwnedDialogContent
        showCloseButton={false}
        className="sm:max-w-md"
        onEscapeKeyDown={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
      >
        <OwnedDialogHeader>
          <OwnedDialogTitle>Optional product analytics</OwnedDialogTitle>
          <OwnedDialogDescription>
            Share anonymous feature-use events to help improve the private beta.
            Relay never sends client names, project names, comments, files,
            links, portal tokens, or money.
          </OwnedDialogDescription>
        </OwnedDialogHeader>
        <OwnedDialogFooter>
          <OwnedButton
            type="button"
            variant="secondary"
            onClick={() => onChoose("denied")}
          >
            No thanks
          </OwnedButton>
          <OwnedButton type="button" onClick={() => onChoose("granted")}>
            Allow analytics
          </OwnedButton>
        </OwnedDialogFooter>
      </OwnedDialogContent>
    </OwnedDialog>
  );
}
