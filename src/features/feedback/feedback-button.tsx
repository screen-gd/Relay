"use client";

import { useEffect, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { MessageSquarePlus } from "lucide-react";
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

/**
 * Top-bar feedback note. It sends through the support mailto the contact page
 * and onboarding already use, so the reporter's own email app does the sending.
 * The button stays out of the bar until the browser reports a page URL to
 * attach, which is also what keeps it off the server render.
 */
export function FeedbackButton() {
  const { setToast } = useData();
  const locationHref = useLocation({ select: (location) => location.href });
  const [pageUrl, setPageUrl] = useState("");
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (locationHref) {
      setPageUrl(new URL(locationHref, window.location.origin).toString());
    }
  }, [locationHref]);

  if (!pageUrl) return null;

  function sendFeedback() {
    window.location.href = composeFeedbackMailto(note, pageUrl);
    setNote("");
    setOpen(false);
    setToast({ message: "Note opened in your email app.", tone: "success" });
  }

  return (
    <OwnedDialog open={open} onOpenChange={setOpen}>
      <OwnedDialogTrigger asChild>
        <OwnedButton
          type="button"
          variant="ghost"
          size="icon"
          title="Send feedback"
          aria-label="Send feedback"
          className="text-[var(--app-ink)] transition-colors data-[state=open]:bg-[var(--app-active)]"
        >
          <MessageSquarePlus aria-hidden="true" className="size-[18px]" />
        </OwnedButton>
      </OwnedDialogTrigger>
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
