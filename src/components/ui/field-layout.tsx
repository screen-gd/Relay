"use client";

import * as React from "react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type FieldControlProps = {
  id?: string;
  disabled?: boolean;
  required?: boolean;
  "aria-describedby"?: string;
  "aria-errormessage"?: string;
  "aria-invalid"?: React.AriaAttributes["aria-invalid"];
  "aria-required"?: React.AriaAttributes["aria-required"];
};

type FieldLayoutProps = Omit<React.ComponentProps<"div">, "children"> & {
  children: React.ReactElement<FieldControlProps>;
  controlId?: string;
  description?: React.ReactNode;
  disabled?: boolean;
  error?: React.ReactNode;
  label: React.ReactNode;
  required?: boolean;
};

function joinIds(...values: Array<string | undefined>) {
  const ids = values.flatMap(
    (value) => value?.split(/\s+/).filter(Boolean) ?? []
  );
  return ids.length > 0 ? Array.from(new Set(ids)).join(" ") : undefined;
}

function FieldLayout({
  children,
  className,
  controlId,
  description,
  disabled = false,
  error,
  label,
  required = false,
  ...props
}: FieldLayoutProps) {
  const generatedId = React.useId();
  const resolvedControlId = children.props.id ?? controlId ?? generatedId;
  const hasError = error !== undefined && error !== null && error !== false;
  const descriptionId = description
    ? `${resolvedControlId}-description`
    : undefined;
  const errorId = hasError ? `${resolvedControlId}-error` : undefined;
  const isDisabled = children.props.disabled ?? disabled;
  const isRequired = children.props.required ?? required;
  const describedBy = joinIds(
    children.props["aria-describedby"],
    descriptionId,
    errorId
  );

  const control = React.cloneElement(children, {
    id: resolvedControlId,
    disabled: isDisabled,
    required: isRequired,
    "aria-describedby": describedBy,
    "aria-errormessage": children.props["aria-errormessage"] ?? errorId,
    "aria-invalid": hasError ? true : children.props["aria-invalid"],
    "aria-required":
      children.props["aria-required"] ?? (isRequired || undefined),
  });

  return (
    <div
      data-slot="field-layout"
      data-disabled={isDisabled || undefined}
      data-invalid={hasError || undefined}
      className={cn(
        "group grid min-w-0 max-w-full grid-cols-1 gap-2 [&>*]:min-w-0 [&>*]:max-w-full",
        className
      )}
      {...props}
    >
      <Label
        htmlFor={resolvedControlId}
        data-disabled={isDisabled || undefined}
      >
        {label}
        {isRequired && (
          <span aria-hidden="true" className="text-[var(--text-primary)]">
            *
          </span>
        )}
      </Label>
      {control}
      {description && (
        <p
          id={descriptionId}
          data-slot="field-description"
          className="text-body text-muted-foreground"
        >
          {description}
        </p>
      )}
      {hasError && (
        <p
          id={errorId}
          data-slot="field-error"
          role="alert"
          className="text-meta text-destructive"
        >
          {error}
        </p>
      )}
    </div>
  );
}

export { FieldLayout };
export type { FieldLayoutProps };
