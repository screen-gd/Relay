"use client";

import { motion } from "motion/react";
import { useHydratedReducedMotion } from "@/lib/motion";
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
  const reduceMotion = useHydratedReducedMotion();
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: reduceMotion ? 0 : 0.24,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      <ContentSection
        id={id}
        title={title}
        description={subtitle}
        className="scroll-mt-[76px] border-0 shadow-none"
        bodyClassName="grid min-w-0 gap-3.5 p-4 sm:p-5"
      >
        {children}
      </ContentSection>
    </motion.div>
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
      <p className="mb-2 text-xs font-medium text-muted-foreground">{label}</p>
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
            className={`rounded-none text-xs ${option === options[options.length - 1] ? "" : "border-r"} ${option === active ? "bg-primary/15 text-primary hover:bg-primary/20 hover:text-primary" : "bg-card text-card-foreground hover:bg-muted"}`}
          >
            {option}
          </OwnedButton>
        ))}
      </div>
    </div>
  );
}
