"use client";

import { Dialog } from "radix-ui";
import type { ReactNode } from "react";
import ui from "./app-ui.module.css";

/** Local demo forms use the same focus trapping and dismissal as app dialogs. */
export default function DemoDialog({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={ui.dialogOverlay} />
        <Dialog.Content className={ui.dialog}>
          <Dialog.Title className={ui.panelTitle}>{title}</Dialog.Title>
          <Dialog.Description className={ui.demoDescription}>
            Try it with sample data. Changes last until you reload this page.
          </Dialog.Description>
          {children}
          <Dialog.Close className={ui.button}>Cancel</Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
