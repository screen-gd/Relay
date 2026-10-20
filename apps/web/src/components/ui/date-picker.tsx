"use client";

import * as React from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "@/components/icons";

import { cn } from "@/lib/utils";
import { fieldControlClassName } from "./field-control";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  formatDate,
  iso,
  isIsoDate,
  todayDate,
} from "@/features/routes/utils/date-utils";
import { defaultSettings } from "@/features/settings/settings-defaults";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function weekdayIndex(day: string) {
  const index = WEEKDAYS.indexOf(day as (typeof WEEKDAYS)[number]);
  return index >= 0 ? index : 1;
}

/** The 42 days (six weeks) shown for `month`, starting on `weekStart`. */
function monthGrid(month: Date, weekStart: string) {
  const start = new Date(month.getFullYear(), month.getMonth(), 1);
  start.setDate(1 - ((start.getDay() - weekdayIndex(weekStart) + 7) % 7));
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function orderedWeekdays(weekStart: string) {
  const start = weekdayIndex(weekStart);
  return [...WEEKDAYS.slice(start), ...WEEKDAYS.slice(0, start)];
}

function monthOf(value: string) {
  const date = isIsoDate(value) ? new Date(`${value}T00:00:00`) : todayDate();
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

type DatePickerProps = {
  /** ISO `YYYY-MM-DD`, or `""` when nothing is chosen. */
  value: string;
  onChange: (value: string) => void;
  /** Workspace setting; defaults to Monday. */
  weekStart?: string;
  /** Workspace setting used for the trigger label. */
  dateFormat?: string;
  placeholder?: string;
  /** Shows a Clear action that sets the value to `""`. */
  clearable?: boolean;
  id?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: React.AriaAttributes["aria-invalid"];
};

/**
 * The app's date selector. Use this instead of `<input type="date">` so every
 * date field shares one popover calendar instead of the browser/OS picker.
 * Works as a `FieldLayout` child (it forwards `id`, `disabled`, and aria props
 * to the trigger button).
 */
function DatePicker({
  value,
  onChange,
  weekStart = defaultSettings.weekStart,
  dateFormat = defaultSettings.dateFormat,
  placeholder = "Choose date",
  clearable = false,
  className,
  ...triggerProps
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [visibleMonth, setVisibleMonth] = React.useState(() => monthOf(value));
  const today = iso(todayDate());
  const monthLabel = new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
  }).format(visibleMonth);

  function shiftMonth(offset: number) {
    setVisibleMonth(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + offset, 1)
    );
  }

  function choose(next: string) {
    onChange(next);
    setOpen(false);
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) setVisibleMonth(monthOf(value));
        setOpen(next);
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          data-slot="date-picker-trigger"
          data-control=""
          className={cn(
            fieldControlClassName,
            "flex h-(--control) items-center gap-2 px-2.5 text-start [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-text-3",
            !isIsoDate(value) && "text-text-3",
            className
          )}
          {...triggerProps}
        >
          <CalendarDays aria-hidden="true" />
          <span className="min-w-0 truncate">
            {isIsoDate(value) ? formatDate(value, dateFormat) : placeholder}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[300px] max-w-[calc(100vw-2rem)] p-3"
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label="Previous month"
            onClick={() => shiftMonth(-1)}
          >
            <ChevronLeft />
          </Button>
          <strong className="type-label text-text-1">{monthLabel}</strong>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label="Next month"
            onClick={() => shiftMonth(1)}
          >
            <ChevronRight />
          </Button>
        </div>
        <div
          className="grid grid-cols-7 gap-1"
          role="grid"
          aria-label={monthLabel}
        >
          {orderedWeekdays(weekStart).map((day) => (
            <span
              key={day}
              className="py-1 text-center type-label-sm text-text-3"
            >
              {day.slice(0, 2)}
            </span>
          ))}
          {monthGrid(visibleMonth, weekStart).map((date) => {
            const key = iso(date);
            const selected = key === value;
            const inMonth = date.getMonth() === visibleMonth.getMonth();
            return (
              <Button
                key={key}
                type="button"
                size="icon-sm"
                variant={selected ? "default" : "ghost"}
                aria-label={formatDate(key, dateFormat)}
                aria-pressed={selected}
                aria-current={key === today ? "date" : undefined}
                onClick={() => choose(key)}
                className={cn(
                  "w-full data",
                  !inMonth && !selected && "text-text-3",
                  key === today &&
                    !selected &&
                    "text-text-1 underline underline-offset-4"
                )}
              >
                {date.getDate()}
              </Button>
            );
          })}
        </div>
        <div className="mt-2 flex justify-between">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => choose(today)}
          >
            Today
          </Button>
          {clearable && value ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => choose("")}
            >
              Clear
            </Button>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export { DatePicker };
export type { DatePickerProps };
