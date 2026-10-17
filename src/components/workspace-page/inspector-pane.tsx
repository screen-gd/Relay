import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { PageFilters } from "./page-bar";

function subscribeToDesktop(onChange: () => void) {
  const query = window.matchMedia("(min-width: 1024px)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

export function InspectorPane({
  children,
  label = "Details",
  className,
  mobile = "sheet",
  forceSheet = false,
}: {
  children: ReactNode;
  label?: string;
  className?: string;
  mobile?: "sheet" | "external";
  forceSheet?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const asideRef = useRef<HTMLElement>(null);
  const desktop = useSyncExternalStore(
    subscribeToDesktop,
    () => window.matchMedia("(min-width: 1024px)").matches,
    () => true
  );
  useEffect(() => {
    if (!desktop || forceSheet || !open) return;
    setOpen(false);
    asideRef.current?.focus();
  }, [desktop, forceSheet, open]);
  if ((desktop && !forceSheet) || mobile === "external")
    return (
      <aside
        ref={asideRef}
        tabIndex={-1}
        aria-label={label}
        data-slot="inspector-card"
        className={cn(
          "hidden min-h-0 min-w-0 rounded-md border border-[var(--border-panel)] bg-[var(--surface-fill)] p-4 lg:block",
          className
        )}
      >
        {children}
      </aside>
    );
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <PageFilters>
        <SheetTrigger asChild>
          <Button variant="secondary">Show {label.toLowerCase()}</Button>
        </SheetTrigger>
      </PageFilters>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{label}</SheetTitle>
        </SheetHeader>
        <div className="min-h-0 overflow-y-auto p-4">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
