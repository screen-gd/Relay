"use client";

import { useEffect, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { MessageSquarePlus } from "@/components/icons";
import { Button as OwnedButton } from "@/components/ui/button";
import {
  Dialog as OwnedDialog,
  DialogContent as OwnedDialogContent,
  DialogDescription as OwnedDialogDescription,
  DialogFooter as OwnedDialogFooter,
  DialogHeader as OwnedDialogHeader,
  DialogTitle as OwnedDialogTitle,
  DialogTrigger as OwnedDialogTrigger,
} from "@/components/ui/dialog";
import { Label as OwnedLabel } from "@/components/ui/label";
import { Textarea as OwnedTextarea } from "@/components/ui/textarea";
import { useData } from "@/lib/data-context";
import { supportEmail } from "@/lib/support-contact";

/** The support inbox opens with the note and the page it was written from. */
export function composeFeedbackMailto(note: string, pageUrl: string) {
  const body = `${note.trim()}\n\nPage: ${pageUrl}`;
  return `mailto:${supportEmail}?subject=${encodeURIComponent(
    "Relay feedback"
  )}&body=${encodeURIComponent(body)}`;
}

/** The page URL to attach, known once the browser reports it. */
function usePageUrl() {
  const locationHref = useLocation({ select: (location) => location.href });
  const [pageUrl, setPageUrl] = useState("");
  useEffect(() => {
    if (locationHref) {
      setPageUrl(new URL(locationHref, window.location.origin).toString());
    }
  }, [locationHref]);
  return pageUrl;
}

/**
 * Feedback note dialog. It sends through the support mailto the contact page
 * and onboarding already use, so the reporter's own email app does the
 * sending. Opened from the profile menu; `FeedbackButton` wraps it with its
 * own trigger for places that need one.
 */
export function FeedbackDialog({
  open,
  onOpenChange,
  trigger,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: React.ReactNode;
}) {
  const { setToast } = useData();
  const pageUrl = usePageUrl();
  const [note, setNote] = useState("");
  const setOpen = onOpenChange;

  if (!pageUrl) return null;

  function sendFeedback() {
    window.location.href = composeFeedbackMailto(note, pageUrl);
    // The note stays so it can be sent again if the handoff did not open.
    setOpen(false);
    setToast({
      message: "Opening your email app with the note.",
      tone: "info",
    });
  }

  return (
    <OwnedDialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <OwnedDialogTrigger asChild>{trigger}</OwnedDialogTrigger>
      ) : null}
      <OwnedDialogContent className="sm:max-w-md">
        <OwnedDialogHeader>
          <OwnedDialogTitle>Send feedback</OwnedDialogTitle>
          <OwnedDialogDescription>
            Say what broke or what would help. The page link goes with it.
          </OwnedDialogDescription>
        </OwnedDialogHeader>
        <div className="grid gap-2">
          <OwnedLabel htmlFor="feedback-note">Note</OwnedLabel>
          <OwnedTextarea
            id="feedback-note"
            density="compact"
            value={note}
            placeholder="What happened?"
            onChange={(event) => setNote(event.target.value)}
          />
          <p className="truncate text-xs text-muted-foreground">{pageUrl}</p>
        </div>
        <OwnedDialogFooter>
          <OwnedButton
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
          >
            Cancel
          </OwnedButton>
          <OwnedButton
            type="button"
            disabled={!note.trim()}
            onClick={sendFeedback}
          >
            Send
          </OwnedButton>
        </OwnedDialogFooter>
      </OwnedDialogContent>
    </OwnedDialog>
  );
}

/** Icon button that opens the feedback dialog. */
export function FeedbackButton() {
  const [open, setOpen] = useState(false);
  return (
    <FeedbackDialog
      open={open}
      onOpenChange={setOpen}
      trigger={
        <OwnedButton
          type="button"
          variant="ghost"
          size="icon"
          title="Send feedback"
          aria-label="Send feedback"
          className="text-text-1 data-[state=open]:bg-selected"
        >
          <MessageSquarePlus aria-hidden="true" className="size-[18px]" />
        </OwnedButton>
      }
    />
  );
}
