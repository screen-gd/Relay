"use client";

import * as React from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
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
        <Button
          type="button"
          variant="outline"
          className={cn(
            "w-full justify-start font-normal",
            !isIsoDate(value) && "text-muted-foreground",
            className
          )}
          {...triggerProps}
        >
          <CalendarDays aria-hidden="true" />
          {isIsoDate(value) ? formatDate(value, dateFormat) : placeholder}
        </Button>
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
          <strong className="text-sm font-semibold">{monthLabel}</strong>
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
              className="py-1 text-center text-[11px] font-medium text-muted-foreground"
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
                  "w-full font-normal",
                  !inMonth && !selected && "text-muted-foreground",
                  key === today &&
                    !selected &&
                    "font-semibold underline underline-offset-4"
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
