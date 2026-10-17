"use client";

import type { ReactNode } from "react";
import { getProjectProgress } from "@/features/projects/project-domain";

import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock3,
  Download,
  Milestone,
} from "@/components/icons";
import { motion } from "motion/react";
import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { calendarDateForKey } from "@/features/schedule/calendar-keyboard";
import type { SettingsState, WorkItem } from "@/lib/types";
import { useHydratedReducedMotion } from "@/lib/motion";
import {
  projectStatusColor,
  projectStatusTone,
} from "@/lib/project-status-style";
import { cn } from "@/lib/utils";
import {
  calendarFeedIcs,
  deriveCalendarEvents,
  type WorkspaceOutput,
} from "@/features/workspace-discovery/workspace-discovery";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ContentSection,
  FillViewport,
  PageActions,
  PageContent,
  PageHeader,
  PageToolbar,
  PageEmptyState,
  SplitPane,
  sectionListClassName,
  sectionRowClassName,
  WorkspacePage,
} from "@/components/workspace-page";

function parseDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(
  value: string,
  format: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  }
) {
  const date = parseDate(value);
  return date ? new Intl.DateTimeFormat("en", format).format(date) : "No date";
}

function isDelivered(project: WorkItem) {
  return project.status === "Delivered";
}

function daysUntil(value: string) {
  const date = parseDate(value);
  if (!date) return Number.POSITIVE_INFINITY;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((date.getTime() - today.getTime()) / 86_400_000);
}

const revealTransition = { duration: 0.22, ease: [0.22, 1, 0.36, 1] } as const;
const MotionButton = motion.create(Button);

function weekdayIndex(day: string) {
  const index = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(day);
  return index >= 0 ? index : 1;
}

function calendarMonthDays(month: Date, weekStart: string) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(first);
  const offset = (first.getDay() - weekdayIndex(weekStart) + 7) % 7;
  start.setDate(first.getDate() - offset);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return { date };
  });
}

function orderedWeekdays(weekStart: string) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const start = weekdayIndex(weekStart);
  return [...days.slice(start), ...days.slice(0, start)];
}

function iso(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function todayDate() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatLongDate(value: string) {
  const date = parseDate(value);
  return date
    ? new Intl.DateTimeFormat("en", {
        weekday: "long",
        month: "long",
        day: "numeric",
      }).format(date)
    : "Select a date";
}

/** "Sep 28 – Oct 4, 2026", or "Dec 28, 2026 – Jan 3, 2027" across years. */
function formatWeekRange(start: Date, end: Date) {
  const sameYear = start.getFullYear() === end.getFullYear();
  const startLabel = new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  }).format(start);
  const endLabel = new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(end);
  return `${startLabel} – ${endLabel}`;
}

/** Trims the 42-day grid to the weeks that contain days from `month`. */
function monthWeeks(month: Date, weekStart: string) {
  const days = calendarMonthDays(month, weekStart);
  return Array.from({ length: 6 }, (_, week) =>
    days.slice(week * 7, week * 7 + 7)
  ).filter((week) =>
    week.some((day) => day.date.getMonth() === month.getMonth())
  );
}

function inMonth(value: string, month: Date) {
  const date = parseDate(value);
  return (
    date?.getFullYear() === month.getFullYear() &&
    date.getMonth() === month.getMonth()
  );
}

export function PrecisionCalendar({
  projects,
  outputs = [],
  settings,
  onViewProject,
}: {
  projects: WorkItem[];
  outputs?: readonly WorkspaceOutput[];
  settings: SettingsState;
  onViewProject: (project: WorkItem) => void;
}) {
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const today = todayDate();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(iso(todayDate()));
  const [focusedDate, setFocusedDate] = useState(selectedDate);
  const focusedDay = useRef<HTMLButtonElement>(null);
  const moveFocus = useRef(false);
  const [viewMode, setViewMode] = useState<"month" | "week" | "agenda">(
    "month"
  );
  const reduceMotion = useHydratedReducedMotion();
  useLayoutEffect(() => {
    if (moveFocus.current) {
      focusedDay.current?.focus();
      moveFocus.current = false;
    }
  }, [focusedDate, visibleMonth, viewMode]);
  const todayKey = iso(todayDate());
  const events = useMemo(
    () =>
      deriveCalendarEvents(projects, outputs, {
        salaryWorkType: settings.salaryWorkType,
      }),
    [outputs, projects, settings.salaryWorkType]
  );
  const eventsByDate = useMemo(() => {
    const map = new Map<string, typeof events>();
    for (const event of events) {
      const list = map.get(event.date);
      if (list) list.push(event);
      else map.set(event.date, [event]);
    }
    return map;
  }, [events]);
  const projectsById = useMemo(
    () => new Map(projects.map((project) => [project.id, project])),
    [projects]
  );

  const weeks = useMemo(
    () => monthWeeks(visibleMonth, settings.weekStart),
    [visibleMonth, settings.weekStart]
  );
  const weekdays = useMemo(
    () => orderedWeekdays(settings.weekStart),
    [settings.weekStart]
  );
  const monthLabel = new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
  }).format(visibleMonth);
  const selectedEvents = eventsByDate.get(selectedDate) ?? [];
  const monthEventCount = useMemo(
    () => events.filter((event) => inMonth(event.date, visibleMonth)).length,
    [events, visibleMonth]
  );
  const visibleMonthProjects = useMemo(
    () =>
      projects
        .filter((project) => inMonth(project.dueDate, visibleMonth))
        .sort(
          (a, b) =>
            a.dueDate.localeCompare(b.dueDate) || a.title.localeCompare(b.title)
        ),
    [projects, visibleMonth]
  );
  /** Keep the focused day visible when keyboard navigation crosses a week. */
  const selectedWeekDays = useMemo(() => {
    const selected = parseDate(focusedDate) ?? todayDate();
    const weekOffset =
      (selected.getDay() - weekdayIndex(settings.weekStart) + 7) % 7;
    return Array.from(
      { length: 7 },
      (_, index) =>
        new Date(
          selected.getFullYear(),
          selected.getMonth(),
          selected.getDate() - weekOffset + index
        )
    );
  }, [focusedDate, settings.weekStart]);
  const weekKeys = selectedWeekDays.map(iso);
  const weekEventCount = weekKeys.reduce(
    (count, key) => count + (eventsByDate.get(key)?.length ?? 0),
    0
  );
  const weekLabel = formatWeekRange(selectedWeekDays[0], selectedWeekDays[6]);
  const monthFocusKey = weeks
    .flat()
    .some((day) => iso(day.date) === focusedDate)
    ? focusedDate
    : iso(visibleMonth);

  function selectDay(key: string) {
    setSelectedDate(key);
    setFocusedDate(key);
  }

  function navigateDay(event: KeyboardEvent<HTMLButtonElement>, date: Date) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const next = calendarDateForKey(date, event.key, settings.weekStart);
    if (!next) return;
    event.preventDefault();
    moveFocus.current = true;
    setFocusedDate(iso(next));
    setVisibleMonth(new Date(next.getFullYear(), next.getMonth(), 1));
  }

  function eventStatusLabel(dayEvents: typeof events) {
    return dayEvents.length
      ? `; ${dayEvents.map((event) => `${event.title}, ${projectsById.get(event.projectId)?.status ?? "Planned"}`).join("; ")}`
      : "";
  }

  /** Week view pages by week; month and agenda page by month. */
  function shiftPeriod(offset: number) {
    if (viewMode === "week") shiftWeek(offset);
    else shiftMonth(offset);
  }

  /** Moves the selection by whole weeks, keeping the visible month in sync. */
  function shiftWeek(offset: number) {
    const selected = parseDate(focusedDate) ?? todayDate();
    const next = new Date(
      selected.getFullYear(),
      selected.getMonth(),
      selected.getDate() + offset * 7
    );
    selectDay(iso(next));
    setVisibleMonth(new Date(next.getFullYear(), next.getMonth(), 1));
  }

  /** Moves the month and selects today, the first scheduled day, or the 1st. */
  function shiftMonth(offset: number) {
    const next = new Date(
      visibleMonth.getFullYear(),
      visibleMonth.getMonth() + offset,
      1
    );
    const firstScheduled = events
      .filter((event) => inMonth(event.date, next))
      .map((event) => event.date)
      .sort()[0];
    setVisibleMonth(next);
    selectDay(
      inMonth(todayKey, next) ? todayKey : (firstScheduled ?? iso(next))
    );
  }

  function jumpToToday() {
    const today = todayDate();
    setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    selectDay(iso(today));
  }

  function downloadFeed() {
    const url = URL.createObjectURL(
      new Blob([calendarFeedIcs(events)], {
        type: "text/calendar;charset=utf-8",
      })
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "relay-workspace-calendar.ics";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <WorkspacePage family="canvas" mode="fill">
      <PageHeader
        title="Calendar"
        description="A delivery-date calendar for planned, active, and delivered work."
        actions={
          <PageActions
            primary={
              <Button
                variant="outline"
                onClick={downloadFeed}
                disabled={!events.length}
              >
                <Download className="size-4" /> Export calendar
              </Button>
            }
            more={[{ label: "Go to today", onSelect: jumpToToday }]}
          />
        }
      />

      <PageContent mode="fill">
        <PageToolbar
          data-family-toolbar="calendar"
          primary={
            <>
              <h2 className="min-w-[9.5rem] text-base font-semibold text-text-1">
                {viewMode === "week" ? weekLabel : monthLabel}
              </h2>
              <div className="flex items-center">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Previous ${viewMode === "week" ? "week" : "month"}`}
                  onClick={() => shiftPeriod(-1)}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Next ${viewMode === "week" ? "week" : "month"}`}
                  onClick={() => shiftPeriod(1)}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
              <span className="text-xs text-text-2">
                {viewMode === "week" ? weekEventCount : monthEventCount}{" "}
                scheduled
              </span>
            </>
          }
          secondary={
            <Tabs
              value={viewMode}
              onValueChange={(value) =>
                setViewMode(
                  value === "week" || value === "agenda" ? value : "month"
                )
              }
              className="block"
            >
              <TabsList aria-label="Calendar view" className="p-0.5">
                {(["month", "week", "agenda"] as const).map((mode) => (
                  <TabsTrigger
                    key={mode}
                    id={`calendar-${mode}-tab`}
                    aria-controls="calendar-view-panel"
                    value={mode}
                    className="capitalize"
                  >
                    {mode}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          }
        />
        <FillViewport
          id="calendar-view-panel"
          role="tabpanel"
          aria-labelledby={`calendar-${viewMode}-tab`}
          bodyLabel="Calendar workspace"
          className="min-h-0"
          bodyClassName="overflow-auto"
        >
          <SplitPane
            ratio="inspector"
            primary={
              viewMode === "month" ? (
                <ContentSection
                  bodyMode="flush"
                  className="h-full"
                  bodyClassName="flex min-h-0 flex-1 flex-col"
                >
                  <div
                    role="grid"
                    aria-label={monthLabel}
                    className="flex min-h-0 flex-1 flex-col"
                  >
                    <div
                      role="row"
                      className="grid grid-cols-7 border-b border-line-row"
                    >
                      {weekdays.map((day) => (
                        <div
                          role="columnheader"
                          key={day}
                          className="px-3 py-2 text-xs font-medium text-text-2"
                        >
                          {day}
                        </div>
                      ))}
                    </div>
                    <div
                      role="rowgroup"
                      className="grid min-h-0 flex-1 gap-px bg-line-row"
                      style={{
                        gridTemplateRows: `repeat(${weeks.length}, minmax(6.5rem, 1fr))`,
                      }}
                    >
                      {weeks.map((week) => (
                        <div
                          key={iso(week[0].date)}
                          role="row"
                          className="grid min-h-0 grid-cols-7 gap-px"
                        >
                          {week.map((day) => {
                            const key = iso(day.date);
                            const dayEvents = eventsByDate.get(key) ?? [];
                            const isCurrentMonth =
                              day.date.getMonth() === visibleMonth.getMonth();
                            const isSelected = selectedDate === key;
                            const isToday = key === todayKey;

                            return (
                              <div
                                key={key}
                                role="gridcell"
                                aria-selected={isSelected}
                                className="min-h-0 min-w-0"
                              >
                                <Button
                                  ref={
                                    key === monthFocusKey
                                      ? focusedDay
                                      : undefined
                                  }
                                  type="button"
                                  variant="ghost"
                                  aria-label={`${formatDate(key, { month: "long", day: "numeric", year: "numeric" })}, ${dayEvents.length} scheduled${eventStatusLabel(dayEvents)}`}
                                  aria-pressed={isSelected}
                                  aria-current={isToday ? "date" : undefined}
                                  tabIndex={key === monthFocusKey ? 0 : -1}
                                  onFocus={() => setFocusedDate(key)}
                                  onKeyDown={(event) =>
                                    navigateDay(event, day.date)
                                  }
                                  onClick={() => selectDay(key)}
                                  className={cn(
                                    "h-full min-h-0 w-full min-w-0 flex-col items-stretch justify-start overflow-hidden p-2 text-left whitespace-normal focus-visible:focus-ring-inset",
                                    isSelected
                                      ? "bg-selected hover:bg-selected"
                                      : "hover:bg-hover"
                                  )}
                                >
                                  <span
                                    className={cn(
                                      "grid size-6 place-items-center rounded-full text-xs font-semibold tabular-nums",
                                      isToday
                                        ? "bg-foreground text-background"
                                        : isCurrentMonth
                                          ? "text-text-1"
                                          : "text-text-2"
                                    )}
                                  >
                                    {day.date.getDate()}
                                  </span>
                                  {dayEvents.slice(0, 3).map((event) => (
                                    <span
                                      key={event.id}
                                      className="flex min-w-0 items-center gap-1.5 text-xs text-text-1"
                                    >
                                      <span
                                        aria-hidden="true"
                                        className="size-1.5 shrink-0 rounded-full"
                                        style={{
                                          background: projectStatusColor(
                                            projectsById.get(event.projectId)
                                              ?.status ?? "Planned"
                                          ),
                                        }}
                                      />
                                      <span className="truncate">
                                        {event.title}
                                      </span>
                                    </span>
                                  ))}
                                  {dayEvents.length > 3 ? (
                                    <span className="text-xs text-text-2">
                                      +{dayEvents.length - 3} more
                                    </span>
                                  ) : null}
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                </ContentSection>
              ) : viewMode === "week" ? (
                <ContentSection
                  bodyMode="flush"
                  className="h-full"
                  bodyClassName="flex min-h-0 flex-1 flex-col"
                >
                  <div
                    role="grid"
                    aria-label={weekLabel}
                    className="flex min-h-0 flex-1"
                  >
                    <div
                      role="row"
                      className="grid min-h-0 flex-1 grid-cols-7 gap-px bg-line-row"
                    >
                      {selectedWeekDays.map((date) => {
                        const key = iso(date);
                        const dayEvents = eventsByDate.get(key) ?? [];
                        const isSelected = selectedDate === key;
                        const isToday = key === todayKey;
                        return (
                          <div
                            key={key}
                            role="gridcell"
                            aria-selected={isSelected}
                            onClick={() => selectDay(key)}
                            className={cn(
                              "flex min-h-[18rem] min-w-0 flex-col gap-1 p-2",
                              isSelected ? "bg-selected" : "bg-well"
                            )}
                          >
                            <Button
                              ref={key === focusedDate ? focusedDay : undefined}
                              type="button"
                              variant="ghost"
                              aria-label={`${formatDate(key, { weekday: "long", month: "long", day: "numeric" })}, ${dayEvents.length} scheduled${eventStatusLabel(dayEvents)}`}
                              aria-pressed={isSelected}
                              aria-current={isToday ? "date" : undefined}
                              tabIndex={key === focusedDate ? 0 : -1}
                              onFocus={() => setFocusedDate(key)}
                              onKeyDown={(event) => navigateDay(event, date)}
                              onClick={() => selectDay(key)}
                              className="h-auto justify-start px-1 py-1 hover:bg-transparent focus-visible:focus-ring-inset"
                            >
                              <span className="text-xs text-text-2">
                                {formatDate(key, { weekday: "short" })}
                              </span>
                              <span
                                className={cn(
                                  "grid size-7 place-items-center rounded-full text-sm font-semibold tabular-nums",
                                  isToday
                                    ? "bg-foreground text-background"
                                    : "text-text-1"
                                )}
                              >
                                {date.getDate()}
                              </span>
                            </Button>
                            {dayEvents.map((event) => {
                              const project = projectsById.get(event.projectId);
                              return (
                                <Button
                                  key={event.id}
                                  type="button"
                                  variant="ghost"
                                  aria-label={`${event.title}, ${project?.status ?? "Planned"}, ${event.detail ?? event.kind}`}
                                  disabled={!project}
                                  onClick={(clickEvent) => {
                                    clickEvent.stopPropagation();
                                    selectDay(key);
                                    if (project) onViewProject(project);
                                  }}
                                  className="h-auto w-full min-w-0 flex-col items-stretch gap-0.5 px-2 py-1.5 text-left whitespace-normal hover:bg-hover"
                                >
                                  <span className="flex min-w-0 items-center gap-1.5">
                                    <span
                                      aria-hidden="true"
                                      className="size-1.5 shrink-0 rounded-full"
                                      style={{
                                        background: projectStatusColor(
                                          project?.status ?? "Planned"
                                        ),
                                      }}
                                    />
                                    <span className="truncate text-xs font-semibold text-text-1">
                                      {event.title}
                                    </span>
                                  </span>
                                  <span className="truncate pl-3 text-[11px] text-text-2 capitalize">
                                    {event.detail ?? event.kind}
                                  </span>
                                </Button>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </ContentSection>
              ) : (
                <ContentSection
                  bodyMode="flush"
                  className="h-full"
                  bodyClassName="min-h-0 flex-1 overflow-y-auto pt-1.5"
                >
                  <div className={sectionListClassName}>
                    {visibleMonthProjects.map((project) => (
                      <Button
                        key={project.id}
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          selectDay(project.dueDate);
                          onViewProject(project);
                        }}
                        className={cn(
                          sectionRowClassName,
                          "h-auto w-full grid justify-start gap-3 text-left whitespace-normal focus-visible:focus-ring-inset sm:grid-cols-[120px_minmax(0,1fr)_120px] sm:items-center"
                        )}
                      >
                        <span className="text-xs font-medium text-text-2">
                          {formatDate(project.dueDate, {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold">
                            {project.title}
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-text-2">
                            {project.client || project.workType}
                          </span>
                        </span>
                        <span
                          className="flex items-center gap-1.5 text-xs"
                          style={{ color: projectStatusColor(project.status) }}
                        >
                          <span
                            aria-hidden="true"
                            className="size-1.5 rounded-full bg-current"
                          />
                          {project.status}
                        </span>
                      </Button>
                    ))}
                    {!visibleMonthProjects.length ? (
                      <p className="px-3 py-2 text-sm text-text-2">
                        Nothing due this month. Give a project a due date to
                        schedule it.
                      </p>
                    ) : null}
                  </div>
                </ContentSection>
              )
            }
            secondary={
              <ContentSection
                title={formatLongDate(selectedDate)}
                bodyMode="flush"
                className="h-full"
                bodyClassName="min-h-0 flex-1 overflow-y-auto"
              >
                {selectedEvents.length ? (
                  <div className={sectionListClassName}>
                    {selectedEvents.map((event) => {
                      const project = projectsById.get(event.projectId);
                      if (!project) return null;
                      return (
                        <MotionButton
                          key={event.id}
                          type="button"
                          variant="ghost"
                          initial={reduceMotion ? false : { opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={
                            reduceMotion ? { duration: 0 } : revealTransition
                          }
                          onClick={() => onViewProject(project)}
                          className={cn(
                            sectionRowClassName,
                            "h-auto w-full flex-col items-stretch gap-2 text-left font-normal whitespace-normal dark:hover:bg-hover focus-visible:focus-ring-inset active:translate-y-0 active:scale-100"
                          )}
                        >
                          <span className="flex items-center gap-2">
                            <span
                              aria-hidden="true"
                              className="size-2 shrink-0 rounded-full"
                              style={{
                                background: projectStatusColor(project.status),
                              }}
                            />
                            <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                              {event.title}
                            </span>
                            <ArrowRight className="size-3.5 shrink-0 text-text-2" />
                          </span>
                          <span className="truncate pl-4 text-xs text-text-2 capitalize">
                            {event.detail ?? event.kind}
                          </span>
                          <Progress
                            value={getProjectProgress(project)}
                            aria-hidden="true"
                            className="ml-4 h-1 w-auto rounded-full bg-tile [&_[data-slot=progress-indicator]]:rounded-full [&_[data-slot=progress-indicator]]:bg-ink"
                          />
                        </MotionButton>
                      );
                    })}
                  </div>
                ) : (
                  <p className="px-4 pb-4 text-sm text-text-2">
                    Nothing due on this day. Pick another day, or give a project
                    this due date.
                  </p>
                )}
              </ContentSection>
            }
          />
        </FillViewport>
      </PageContent>
    </WorkspacePage>
  );
}

type MonthGroup = {
  key: string;
  label: string;
  projects: WorkItem[];
};

export function PrecisionTimeline({
  projects,
  onViewProject,
  notice,
}: {
  projects: WorkItem[];
  onViewProject: (project: WorkItem) => void;
  /** Shown above the timeline, such as an upgrade prompt. */
  notice?: ReactNode;
}) {
  const [filter, setFilter] = useState<
    "All" | "Active" | "Review" | "Delivered"
  >("All");
  const reduceMotion = useHydratedReducedMotion();
  const visibleProjects = useMemo(
    () =>
      projects.filter((project) => {
        if (filter === "Active")
          return !isDelivered(project) && project.status !== "Cancelled";
        if (filter === "Review")
          return ["Review", "Revision", "Client Review"].includes(
            project.status
          );
        if (filter === "Delivered") return isDelivered(project);
        return true;
      }),
    [filter, projects]
  );
  const groups = useMemo(() => {
    const sorted = visibleProjects
      .filter((project) => parseDate(project.dueDate))
      .slice()
      .sort(
        (a, b) =>
          (parseDate(a.dueDate)?.getTime() ?? 0) -
          (parseDate(b.dueDate)?.getTime() ?? 0)
      );
    const map = new Map<string, MonthGroup>();
    for (const project of sorted) {
      const date = parseDate(project.dueDate)!;
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      const existing = map.get(key);
      if (existing) {
        existing.projects.push(project);
      } else {
        map.set(key, {
          key,
          label: new Intl.DateTimeFormat("en", {
            month: "long",
            year: "numeric",
          }).format(date),
          projects: [project],
        });
      }
    }
    return Array.from(map.values());
  }, [visibleProjects]);
  const active = projects.filter(
    (project) => !isDelivered(project) && project.status !== "Cancelled"
  ).length;
  const review = projects.filter((project) =>
    ["Review", "Revision", "Client Review"].includes(project.status)
  ).length;
  const delivered = projects.filter(isDelivered).length;
  const emptyTimeline =
    filter === "All"
      ? {
          title: "No timeline milestones yet",
          description: "Give a project a due date to place its milestone here.",
        }
      : {
          title: `No ${filter.toLowerCase()} milestones`,
          description: `${
            filter === "Delivered"
              ? "Deliver a project"
              : filter === "Review"
                ? "Request review on a project"
                : "Start a project"
          } to see it here, or switch back to All.`,
        };

  return (
    <WorkspacePage family="data-index">
      <PageHeader
        title="Delivery timeline"
        description="A chronological view of project milestones, reviews, and completed deliveries."
        actions={
          <div
            className="flex flex-wrap items-center gap-2 text-xs"
            aria-label="Timeline summary"
          >
            <span className="rounded-md bg-well px-2.5 py-1.5">
              <strong className="text-base tabular-nums text-text-1">
                {active}
              </strong>
              <span className="ml-1 text-text-2">active</span>
            </span>
            <span className="rounded-md bg-well px-2.5 py-1.5">
              <strong className="text-base tabular-nums text-warn-text">
                {review}
              </strong>
              <span className="ml-1 text-text-2">in review</span>
            </span>
            <span className="rounded-md bg-well px-2.5 py-1.5">
              <strong className="text-base tabular-nums text-text-1">
                {delivered}
              </strong>
              <span className="ml-1 text-text-2">delivered</span>
            </span>
          </div>
        }
      />

      <PageContent>
        {notice}
        <PageToolbar
          primary={
            <ButtonGroup
              className="flex w-fit flex-wrap items-center gap-1 [&>*:not(:first-child)]:!rounded-l-md [&>*:not(:last-child)]:!rounded-r-md"
              aria-label="Filter timeline"
            >
              {(["All", "Active", "Review", "Delivered"] as const).map(
                (option) => (
                  <Button
                    key={option}
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-pressed={filter === option}
                    onClick={() => setFilter(option)}
                    className={cn(
                      "gap-0 px-3 text-text-2 hover:bg-hover hover:text-text-1",
                      filter === option && "bg-selected text-text-1"
                    )}
                  >
                    <span>{option}</span>
                    <span className="ml-1 text-[10px] tabular-nums opacity-70">
                      {option === "All"
                        ? projects.length
                        : option === "Active"
                          ? active
                          : option === "Review"
                            ? review
                            : delivered}
                    </span>
                  </Button>
                )
              )}
            </ButtonGroup>
          }
          secondary={
            <span className="text-[10px] text-text-2" aria-live="polite">
              {visibleProjects.length} milestones shown
            </span>
          }
        />

        {groups.length ? (
          <motion.div
            key={filter}
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.18 }}
            className="mt-6 space-y-8"
          >
            {groups.map((group, groupIndex) => (
              <motion.section
                key={group.key}
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : { ...revealTransition, delay: groupIndex * 0.035 }
                }
                className="grid gap-4"
              >
                <div className="relative border-l border-strong pl-6">
                  <ContentSection
                    title={group.label}
                    description={`${group.projects.length} milestone${group.projects.length === 1 ? "" : "s"}`}
                    bodyMode="flush"
                    className="overflow-visible"
                  >
                    <div className="divide-y divide-line-row">
                      {group.projects.map((project, projectIndex) => (
                        <MotionButton
                          key={project.id}
                          type="button"
                          variant="ghost"
                          initial={reduceMotion ? false : { opacity: 0, x: -5 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={
                            reduceMotion
                              ? { duration: 0 }
                              : {
                                  ...revealTransition,
                                  delay:
                                    groupIndex * 0.035 + projectIndex * 0.025,
                                }
                          }
                          aria-label={`${project.title}, ${project.status}, due ${formatDate(project.dueDate, { month: "long", day: "numeric", year: "numeric" })}`}
                          className="relative h-auto w-full grid justify-start gap-3 px-4 py-4 text-left font-normal whitespace-normal hover:bg-hover dark:hover:bg-hover focus-visible:z-10 focus-visible:focus-ring-inset active:translate-y-0 active:scale-100 sm:grid-cols-[120px_minmax(0,1fr)_120px_90px] sm:items-center"
                          onClick={() => onViewProject(project)}
                        >
                          <span
                            className="absolute -left-[31px] top-1/2 grid size-3 -translate-y-1/2 place-items-center rounded-full border-2 border-[var(--app-panel)]"
                            style={{
                              background: projectStatusColor(project.status),
                            }}
                          />
                          <span>
                            <span className="block text-[11px] font-semibold text-text-3">
                              {isDelivered(project) ? "Delivered" : "Expected"}
                            </span>
                            <span className="mt-1 block text-xs font-medium">
                              {formatDate(project.dueDate, {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-[13px] font-semibold">
                              {project.title}
                            </span>
                            <span className="mt-1 block truncate text-[11px] text-text-2">
                              {project.client || project.workType} ·{" "}
                              {project.notes || "No note"}
                            </span>
                          </span>
                          <Badge
                            variant="outline"
                            className={cn(
                              "w-fit",
                              projectStatusTone(project.status)
                            )}
                          >
                            {project.status}
                          </Badge>
                          <span className="flex items-center justify-end gap-1 text-[10px] text-text-2">
                            {isDelivered(project) ? (
                              <CheckCircle2 className="size-3.5 text-text-1" />
                            ) : (
                              <Clock3 className="size-3.5" />
                            )}
                            {isDelivered(project)
                              ? "Complete"
                              : daysUntil(project.dueDate) < 0
                                ? "Overdue"
                                : `${Math.max(0, daysUntil(project.dueDate))}d`}
                          </span>
                        </MotionButton>
                      ))}
                    </div>
                  </ContentSection>
                </div>
              </motion.section>
            ))}
          </motion.div>
        ) : (
          <ContentSection className="mt-6">
            <PageEmptyState
              icon={<Milestone className="size-5" />}
              title={emptyTimeline.title}
              description={emptyTimeline.description}
            />
          </ContentSection>
        )}
      </PageContent>
    </WorkspacePage>
  );
}
