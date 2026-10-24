"use client";

import { ContentSection } from "@/components/workspace-page";
import { Button as OwnedButton } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

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
      bodyClassName="grid min-w-0 grid-cols-1 gap-6 p-5"
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
      <ToggleGroup
        type="single"
        value={active}
        aria-label={label}
        onValueChange={(value) => {
          if (value) onChange(value);
        }}
      >
        {options.map((option) => (
          <ToggleGroupItem key={option} value={option}>
            {option}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}
