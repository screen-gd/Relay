"use client";

import {
  BellIcon,
  BookOpenIcon,
  CaretDownIcon,
  CaretRightIcon,
  ChatCircleIcon,
  CheckSquareIcon,
  CreditCardIcon,
  DotsThreeIcon,
  FileTextIcon,
  ImagesIcon,
  KanbanIcon,
  MagnifyingGlassIcon,
  NotePencilIcon,
  PlusIcon,
  QuestionIcon,
  SidebarSimpleIcon,
  SparkleIcon,
  SquaresFourIcon,
  UsersIcon,
  UsersThreeIcon,
} from "./AppIcons";
import "@fontsource-variable/geist";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import ui from "./app-ui.module.css";

/** Sidebar pages, in the app's order (src/components/workspace-navigation.ts). */
const primaryNav = [
  { id: "dashboard", label: "Dashboard", icon: SquaresFourIcon },
  { id: "projects", label: "Projects", icon: KanbanIcon },
  { id: "reviews", label: "Reviews", icon: ChatCircleIcon },
] as const;

const workspaceNav = [
  { id: "clients", label: "Clients", icon: UsersIcon },
  { id: "files", label: "Files", icon: FileTextIcon },
  { id: "media", label: "Media", icon: ImagesIcon },
  { id: "templates", label: "Templates", icon: CheckSquareIcon },
  { id: "resources", label: "Resources", icon: BookOpenIcon },
  { id: "reports", label: "Payments", icon: CreditCardIcon },
] as const;

const teamNav = [
  { id: "team", label: "Members", icon: UsersThreeIcon },
  { id: "team-chat", label: "Team chat", icon: ChatCircleIcon },
] as const;

/** The AI actions the sidebar leads with (src/features/ai/ai-tools.ts). */
const aiToolLabels = [
  "Turn feedback into revisions",
  "Draft a client status update",
  "Import a brief",
] as const;

export type AppPage =
  | (typeof primaryNav)[number]["id"]
  | (typeof workspaceNav)[number]["id"]
  | (typeof teamNav)[number]["id"];

/**
 * A scaled-down Relay workspace used by every sample on /features, mirroring
 * the app's Quartz shell in the Linear-style layout as it ships today: a
 * labeled sidebar on the dark canvas (workspace menu, primary pages,
 * Workspace, Team, AI tools, and Recent groups), then the page in a framed
 * viewport whose top bar names the page and holds its actions. Styles copy
 * the running demo, including its workspace name and navigation.
 */
export default function AppWindow({
  crumbs,
  page,
  label,
  action,
  primaryAction,
  onAction,
  onPrimaryAction,
  topbarActions,
  menu,
  className,
  children,
}: {
  /** Top-bar location: the page name, then its trail; the last item is current. */
  crumbs: readonly string[];
  page: AppPage;
  /** Accessible name for the sample. */
  label: string;
  /** The page's secondary action, e.g. Edit on a record page. */
  action?: string;
  /** The page's primary action in the accent color, e.g. New project. */
  primaryAction?: string;
  onAction?: () => void;
  onPrimaryAction?: () => void;
  topbarActions?: ReactNode;
  /** The record page's overflow control (…) beside `action`. */
  menu?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const [pageName, ...trail] = crumbs;
  const current = trail.at(-1) ?? pageName;

  const navItem = ({
    id,
    label: itemLabel,
    icon: Icon,
  }: {
    id: string;
    label: string;
    icon: typeof SquaresFourIcon;
  }) => (
    <span key={id} className={ui.navItem} data-active={id === page}>
      <Icon size={15} />
      <span className={ui.navLabel}>{itemLabel}</span>
    </span>
  );

  const groupLabel = (
    text: string,
    caret: "down" | "right",
    soon?: boolean
  ) => (
    <span className={ui.groupLabel}>
      <span>
        {text} {soon ? <i className={ui.soonTag}>soon</i> : null}
      </span>
      {caret === "down" ? (
        <CaretDownIcon className={ui.groupCaret} size={11} />
      ) : (
        <CaretRightIcon className={ui.groupCaret} size={11} />
      )}
    </span>
  );

  return (
    <div className={ui.frame} data-ui>
      <div
        className={cn(ui.window, className)}
        role="region"
        aria-label={label}
      >
        <aside className={ui.sidebar} aria-hidden="true">
          <div className={ui.sideTop}>
            <span className={ui.wsMenu}>
              <span className={ui.wsAvatar}>NP</span>
              <span className={ui.wsName}>Northstar Post</span>
              <CaretDownIcon className={ui.wsCaret} size={11} />
            </span>
            <span className={ui.sideIcons}>
              <span className={ui.iconBtn}>
                <BellIcon size={14} />
              </span>
              <span className={ui.iconBtn}>
                <MagnifyingGlassIcon size={14} />
              </span>
              <span className={ui.iconBtn}>
                <NotePencilIcon size={14} />
              </span>
            </span>
          </div>
          <nav className={ui.nav}>
            {primaryNav.map(navItem)}
            <div className={ui.group}>
              {groupLabel("Workspace", "down")}
              {workspaceNav.map(navItem)}
            </div>
            <div className={ui.group}>
              {groupLabel("Team", "down")}
              {teamNav.map(navItem)}
            </div>
            <div className={ui.group}>
              {groupLabel("AI tools", "down")}
              {aiToolLabels.map((toolLabel) => (
                <span key={toolLabel} className={ui.navItem}>
                  <SparkleIcon size={15} />
                  <span className={ui.navLabel}>{toolLabel}</span>
                </span>
              ))}
              <span className={ui.navItem}>
                <PlusIcon size={15} />
                <span className={ui.navLabel}>All AI tools</span>
              </span>
            </div>
            <div className={ui.group}>
              {groupLabel("Recent", "down")}
              {[
                "Summer launch film",
                "Founder story cutdown",
                "Field Notes episode 12",
              ].map((title) => (
                <span key={title} className={ui.navItem}>
                  <FileTextIcon size={16} />
                  <span className={ui.navLabel}>{title}</span>
                </span>
              ))}
            </div>
          </nav>
          <div className={ui.sideFoot}>
            <span className={ui.iconBtn}>
              <QuestionIcon size={14} />
            </span>
            <span className={ui.plans}>Plans</span>
            <span className={ui.iconBtn}>
              <SidebarSimpleIcon size={14} />
            </span>
          </div>
        </aside>
        <div className={ui.main}>
          <div className={ui.viewport}>
            <div className={ui.topbar}>
              <span className={ui.crumbs}>
                {trail.length ? (
                  <span className={ui.crumbParent}>{pageName}</span>
                ) : (
                  <span className={ui.crumbCurrent}>{pageName}</span>
                )}
                {trail.slice(0, -1).map((crumb) => (
                  <span key={crumb} className={ui.crumbParent}>
                    <CaretRightIcon size={11} aria-hidden="true" />
                    {crumb}
                  </span>
                ))}
                {trail.length ? (
                  <>
                    <CaretRightIcon size={11} aria-hidden="true" />
                    <span className={ui.crumbCurrent}>{current}</span>
                  </>
                ) : null}
              </span>
              <span className={ui.topActions}>
                {topbarActions}
                {action ? (
                  onAction ? (
                    <button
                      type="button"
                      className={ui.button}
                      onClick={onAction}
                    >
                      {action}
                    </button>
                  ) : (
                    <span className={ui.button}>{action}</span>
                  )
                ) : null}
                {menu ? (
                  <span className={`${ui.button} ${ui.icon} ${ui.kebab}`}>
                    <DotsThreeIcon size={16} />
                  </span>
                ) : null}
                {primaryAction ? (
                  onPrimaryAction ? (
                    <button
                      type="button"
                      className={`${ui.button} ${ui.primary}`}
                      onClick={onPrimaryAction}
                    >
                      <PlusIcon size={13} />
                      {primaryAction}
                    </button>
                  ) : (
                    <span className={`${ui.button} ${ui.primary}`}>
                      <PlusIcon size={13} />
                      {primaryAction}
                    </span>
                  )
                ) : null}
              </span>
            </div>
            <div className={ui.page}>{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * The project page's view switcher (a segmented control in the app), with
 * `active` marked. Labels follow the app's project workspace views.
 */
const projectTabs = [
  "Overview",
  "Outputs",
  "Client review",
  "Files",
  "Assets",
  "Activity",
] as const;
export type ProjectTab = (typeof projectTabs)[number];

export function ProjectTabs({
  active,
  onChange,
}: {
  active: ProjectTab;
  onChange?: (tab: ProjectTab) => void;
}) {
  return (
    <div className={ui.tabs} role="group" aria-label="Project workspace views">
      {projectTabs.map((tab) =>
        onChange ? (
          <button
            key={tab}
            type="button"
            className={ui.tab}
            data-active={tab === active}
            aria-pressed={tab === active}
            onClick={() => onChange(tab)}
          >
            {tab}
          </button>
        ) : (
          <span key={tab} className={ui.tab} data-active={tab === active}>
            {tab}
          </span>
        )
      )}
    </div>
  );
}

/** Four-segment stage bar from the project Overview; stages up to `current` are filled. */
export function StageBar({
  stages,
  current,
}: {
  stages: readonly string[];
  current: number;
}) {
  return (
    <ol className={ui.stages}>
      {stages.map((stage, index) => (
        <li
          key={stage}
          data-reached={index <= current}
          aria-current={index === current ? "step" : undefined}
        >
          <span aria-hidden="true" />
          <small>{stage}</small>
        </li>
      ))}
    </ol>
  );
}
