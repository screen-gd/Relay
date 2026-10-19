"use client";

import { ContentSection } from "@/components/workspace-page";
import { Button as OwnedButton } from "@/components/ui/button";

export function SettingsPanel({
  id,
  title,
  subtitle,
  children,
}: {
  id?: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <ContentSection
      id={id}
      title={title}
      description={subtitle}
      className="scroll-mt-16"
      bodyClassName="grid min-w-0 grid-cols-1 gap-4"
    >
      {children}
    </ContentSection>
  );
}

export function SettingsLink({
  label,
  onClick,
}: {
  label: string;
  onClick?: () => void;
}) {
  return (
    <OwnedButton
      type="button"
      variant="link"
      size="sm"
      onClick={onClick}
      className="h-auto justify-self-start px-0 py-0 text-primary"
    >
      {label}
    </OwnedButton>
  );
}

export function SegmentedSetting({
  label,
  options,
  active,
  onChange,
}: {
  label: string;
  options: string[];
  active: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-muted-foreground type-label-sm">{label}</p>
      <div
        role="group"
        aria-label={label}
        className="grid max-w-[330px] overflow-hidden rounded-md border"
        style={{
          gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`,
        }}
      >
        {options.map((option) => (
          <OwnedButton
            key={option}
            type="button"
            variant="ghost"
            size="sm"
            aria-pressed={option === active}
            onClick={() => onChange(option)}
            className={`rounded-none text-xs ${option === options[options.length - 1] ? "" : "border-r"} ${option === active ? "bg-selected text-text-1 hover:text-text-1" : "text-text-2 hover:text-text-1"}`}
          >
            {option}
          </OwnedButton>
        ))}
      </div>
    </div>
  );
}
