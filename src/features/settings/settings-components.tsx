"use client";

import { Button as OwnedButton } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ContentSection } from "@/components/workspace-page";

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
      className="scroll-mt-12"
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
      variant="ghost"
      size="sm"
      onClick={onClick}
      className="justify-self-start"
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
      <p className="mb-2 text-meta font-medium text-[var(--text-meta)]">
        {label}
      </p>
      <Tabs value={active} onValueChange={onChange}>
        <TabsList aria-label={label}>
          {options.map((option) => (
            <TabsTrigger key={option} value={option}>
              {option}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
}
