"use client";

// Adapted from Kibo UI's MIT-licensed Kanban: https://www.kibo-ui.com/r/kanban.json
import { useDraggable, useDroppable } from "@dnd-kit/core";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

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
      className={cn(
        "flex h-full min-h-40 flex-col overflow-hidden rounded-frame bg-well type-label-sm",
        className
      )}
      {...props}
    >
      {children}
    </section>
  );
}

export function KanbanHeader({ className, ...props }: ComponentProps<"h3">) {
  return <h3 className={cn("m-0 p-3 type-label", className)} {...props} />;
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
        "relative flex w-full min-w-0 flex-row items-start gap-2 rounded-soft bg-page p-3 text-text-1 shadow-[0_0_0_1px_var(--line-frame)] transition-shadow duration-(--dur-fast) ease-(--ease-step) hover:shadow-[0_0_0_1px_var(--line-control-hover)]",
        drag.isDragging && "z-20 opacity-30",
        className
      )}
    >
      {children(drag)}
    </div>
  );
}
