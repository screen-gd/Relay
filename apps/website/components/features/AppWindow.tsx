import {
  BellIcon,
  CalendarDotsIcon,
  ChartLineUpIcon,
  ChatTextIcon,
  CheckSquareIcon,
  FileTextIcon,
  FlowArrowIcon,
  GearSixIcon,
  ImagesIcon,
  KanbanIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  SquaresFourIcon,
  UsersIcon,
} from "@phosphor-icons/react/ssr";
import Image from "next/image";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import ui from "./app-ui.module.css";

/** Sidebar pages, in the app's order (src/components/workspace-shell.tsx). */
const rail = [
  [
    { id: "dashboard", icon: SquaresFourIcon },
    { id: "calendar", icon: CalendarDotsIcon },
    { id: "timeline", icon: FlowArrowIcon },
  ],
  [
    { id: "projects", icon: KanbanIcon },
    { id: "clients", icon: UsersIcon },
    { id: "reviews", icon: ChatTextIcon },
    { id: "files", icon: FileTextIcon },
    { id: "media", icon: ImagesIcon },
    { id: "templates", icon: CheckSquareIcon },
  ],
  [
    { id: "reports", icon: ChartLineUpIcon },
    { id: "settings", icon: GearSixIcon },
  ],
] as const;

export type AppPage = (typeof rail)[number][number]["id"];

/**
 * A scaled-down Relay workspace used by every sample on /features: the app's
 * top bar (mark, breadcrumb, Quick Search, Quick create), icon sidebar with
 * `page` marked, and the page content. Styles mirror the app's dark theme.
 */
export default function AppWindow({
  crumbs,
  page,
  label,
  className,
  children,
}: {
  /** Breadcrumb after "Relay"; the last item is the current page. */
  crumbs: readonly string[];
  page: AppPage;
  /** Accessible name for the sample. */
  label: string;
  className?: string;
  children: ReactNode;
}) {
  const current = crumbs.at(-1);
  return (
    <div className={cn(ui.window, className)} role="region" aria-label={label}>
      <div className={ui.topbar} aria-hidden="true">
        <Image
          src="/brand/relay/mark-white.svg"
          alt=""
          width={22}
          height={22}
        />
        <span className={ui.crumbs}>
          <span className={ui.crumbHidden}>Relay</span>
          {crumbs.slice(0, -1).map((crumb) => (
            <span key={crumb} className={ui.crumbHidden}>
              <i>/</i> {crumb}
            </span>
          ))}
          <i className={ui.crumbHidden}>/</i>
          <b>{current}</b>
        </span>
        <span className={ui.search}>
          <MagnifyingGlassIcon size={13} />
          Quick Search
          <kbd>Ctrl K</kbd>
        </span>
        <span className={ui.topActions}>
          <span className={`${ui.button} ${ui.primary}`}>
            <PlusIcon size={13} />
            <span className={ui.quickLabel}>Quick create</span>
          </span>
          <BellIcon size={15} />
          <span className={ui.avatar}>MC</span>
        </span>
      </div>
      <div className={ui.shell}>
        <div className={ui.rail} aria-hidden="true">
          {rail.map((group, index) => (
            <div key={index} style={{ display: "contents" }}>
              {index > 0 ? <hr /> : null}
              {group.map(({ id, icon: Icon }) => (
                <span
                  key={id}
                  className={ui.railItem}
                  data-active={id === page}
                >
                  <Icon size={15} />
                </span>
              ))}
            </div>
          ))}
        </div>
        <div className={ui.page}>{children}</div>
      </div>
    </div>
  );
}

/** The project page tab row, with `active` marked. */
export function ProjectTabs({ active }: { active: string }) {
  return (
    <div className={ui.tabs} aria-hidden="true">
      {[
        "Overview",
        "Outputs and Versions",
        "Client Review",
        "Files and Links",
        "Activity",
      ].map((tab) => (
        <span key={tab} className={ui.tab} data-active={tab === active}>
          {tab}
        </span>
      ))}
      <span className={ui.tabsEnd}>← Projects</span>
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
