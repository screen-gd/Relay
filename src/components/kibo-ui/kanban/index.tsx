"use client";

// Adapted from Kibo UI's MIT-licensed Kanban: https://www.kibo-ui.com/r/kanban.json
import { cn } from "@/lib/utils";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import type { ComponentProps, ReactNode } from "react";

export function KanbanBoard({
  id,
  className,
  children,
  ...props
}: ComponentProps<"section"> & { id: string }) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <section
      ref={setNodeRef}
      className={cn("flex h-full min-h-40 flex-col text-body", className)}
      {...props}
    >
      {children}
    </section>
  );
}

export function KanbanHeader({ className, ...props }: ComponentProps<"h3">) {
  return <h3 className={cn("m-0 p-3 text-section", className)} {...props} />;
}

export function KanbanCard({
  id,
  disabled,
  className,
  children,
}: {
  id: string;
  disabled: boolean;
  className?: string;
  children: (handle: ReturnType<typeof useDraggable>) => ReactNode;
}) {
  // Relay persists stage changes; its existing sort controls determine card order.
  const drag = useDraggable({ id, disabled });
  return (
    <div
      ref={drag.setNodeRef}
      data-board-card
      className={cn(
        "relative flex w-full min-w-0 flex-row items-start gap-2 rounded-md border border-[var(--border-panel)] bg-[var(--surface-page)] p-3 text-[var(--text-primary)] hover:bg-[var(--surface-active)]",
        drag.isDragging && "z-20 opacity-30",
        className
      )}
    >
      {children(drag)}
    </div>
  );
}
