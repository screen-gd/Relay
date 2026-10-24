"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Rows and columns. Rows split by row rules, the header is quiet label text,
 * and a hovered body row takes the hover wash.
 */
function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div
      data-slot="table-container"
      className="relative w-full overflow-x-auto overflow-y-hidden"
    >
      <table
        data-slot="table"
        className={cn("w-full caption-bottom type-label", className)}
        {...props}
      />
    </div>
  );
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn(
        "[&_tr]:shadow-[inset_0_-1px_0_var(--line-row)] [&_tr]:hover:bg-transparent",
        className
      )}
      {...props}
    />
  );
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:shadow-none", className)}
      {...props}
    />
  );
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "shadow-[inset_0_-1px_0_var(--line-row)] transition-colors duration-(--dur-fast) ease-(--ease-step) hover:bg-hover data-[state=selected]:bg-selected",
        className
      )}
      {...props}
    />
  );
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "h-(--row-sm) px-3 text-start align-middle type-label-sm whitespace-nowrap text-text-3",
        className
      )}
      {...props}
    />
  );
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn("h-(--row) px-3 py-2 align-middle text-text-1", className)}
      {...props}
    />
  );
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-3 type-body-sm text-text-2", className)}
      {...props}
    />
  );
}

export {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
};
