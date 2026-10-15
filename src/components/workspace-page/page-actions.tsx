import { MoreHorizontal } from "@/components/icons";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type PageAction = {
  label: string;
  onSelect: () => void;
  disabled?: boolean;
  checked?: boolean;
};

type PageActionsProps = {
  primary?: ReactNode;
  more?: PageAction[];
  className?: string;
};

/**
 * Header actions for a workspace page: one primary button, with every other
 * action behind "More" so the page reads as a single job.
 */
export function PageActions({ primary, more, className }: PageActionsProps) {
  return (
    <div
      data-slot="page-actions"
      className={cn("flex shrink-0 flex-wrap items-center gap-2", className)}
    >
      {primary}
      {more?.length ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="h-9 shrink-0 gap-2 rounded-lg !bg-[var(--app-panel)]"
            >
              <MoreHorizontal className="size-3.5" />
              More
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {more.map((item) =>
              item.checked === undefined ? (
                <DropdownMenuItem
                  key={item.label}
                  disabled={item.disabled}
                  onSelect={item.onSelect}
                >
                  {item.label}
                </DropdownMenuItem>
              ) : (
                <DropdownMenuCheckboxItem
                  key={item.label}
                  checked={item.checked}
                  disabled={item.disabled}
                  onSelect={item.onSelect}
                >
                  {item.label}
                </DropdownMenuCheckboxItem>
              )
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
}
