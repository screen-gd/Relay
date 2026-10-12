"use client";

// Adapted from Kibo UI's MIT-licensed Kanban: https://www.kibo-ui.com/r/kanban.json
import { useDraggable, useDroppable } from "@dnd-kit/core";
import type { ComponentProps, ReactNode } from "react";
import { Card } from "@/components/ui/card";
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
        "flex h-full min-h-40 flex-col overflow-hidden bg-[var(--surface-inset)] text-xs",
        className
      )}
      {...props}
    >
      {children}
    </section>
  );
}

export function KanbanHeader({ className, ...props }: ComponentProps<"h3">) {
  return (
    <h3 className={cn("m-0 p-3 text-sm font-semibold", className)} {...props} />
  );
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
    <Card
      ref={drag.setNodeRef}
      data-board-card
      className={cn(
        "relative flex w-full min-w-0 flex-row items-start gap-2 rounded-md p-3 text-card-foreground shadow-none",
        drag.isDragging && "z-20 opacity-30",
        className
      )}
    >
      {children(drag)}
    </Card>
  );
}
