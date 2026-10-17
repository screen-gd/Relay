"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export type ConfirmOptions = {
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Styles the confirm button for irreversible actions. */
  destructive?: boolean;
};

type Confirm = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<Confirm>(() => {
  throw new Error("useConfirm must be used within a ConfirmProvider");
});

/**
 * Returns an async replacement for `window.confirm` that shows the app's
 * alert dialog. Resolves `true` only when the user picks the confirm action.
 *
 *   if (!(await confirm({ title: "Delete file?", destructive: true }))) return;
 */
export function useConfirm() {
  return useContext(ConfirmContext);
}

/** Hosts the single app-level confirmation dialog used by `useConfirm`. */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolveRef = useRef<((confirmed: boolean) => void) | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const settle = useCallback((confirmed: boolean) => {
    resolveRef.current?.(confirmed);
    resolveRef.current = null;
    setOptions(null);
  }, []);

  const confirm = useCallback<Confirm>((next) => {
    // A newer request cancels one that is still open.
    resolveRef.current?.(false);
    if (
      typeof document !== "undefined" &&
      document.activeElement instanceof HTMLElement
    ) {
      const active = document.activeElement;
      const menu = active.closest<HTMLElement>(
        "[data-slot=dropdown-menu-content]"
      );
      returnFocusRef.current = menu
        ? (Array.from(
            document.querySelectorAll<HTMLElement>("[aria-controls]")
          ).find(
            (element) => element.getAttribute("aria-controls") === menu.id
          ) ?? active)
        : active;
    }
    setOptions(next);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog
        open={Boolean(options)}
        onOpenChange={(open) => {
          if (!open) settle(false);
        }}
      >
        <AlertDialogContent
          size="sm"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (returnFocusRef.current?.isConnected)
              returnFocusRef.current.focus();
            else document.getElementById("main-content")?.focus();
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>{options?.title}</AlertDialogTitle>
            {options?.description ? (
              <AlertDialogDescription className="whitespace-pre-line">
                {options.description}
              </AlertDialogDescription>
            ) : null}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => settle(false)}>
              {options?.cancelLabel ?? "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction
              variant={options?.destructive ? "destructive" : "default"}
              onClick={() => settle(true)}
            >
              {options?.confirmLabel ?? "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  );
}
