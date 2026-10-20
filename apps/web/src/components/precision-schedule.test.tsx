import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PrecisionCalendar } from "./precision-schedule";
import { sampleStudioSettings } from "@/lib/sample-studio";
import type { WorkItem } from "@/lib/types";

afterEach(() => vi.useRealTimers());

describe("calendar date grid", () => {
  it.each(["Mon", "Sun"])(
    "has one Tab entry and week rows starting %s",
    (weekStart) => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 9, 8, 12));
      const project: WorkItem = {
        id: "calendar-project",
        profileId: "video-editor",
        title: "Launch film",
        status: "In Progress",
        workType: "Client Work",
        startDate: "2026-10-01",
        dueDate: "2026-10-08",
        earnings: 0,
        notes: "",
      };
      const html = renderToStaticMarkup(
        <PrecisionCalendar
          projects={[project]}
          settings={{ ...sampleStudioSettings, weekStart }}
          onViewProject={() => undefined}
        />
      );
      expect(html).toContain('role="grid" aria-label="October 2026"');
      const headers = [...html.matchAll(/role="columnheader"[^>]*>([^<]*)/g)];
      expect(headers).toHaveLength(7);
      expect(headers[0]?.[1]).toBe(weekStart);
      const rows = [...html.matchAll(/role="row"[^>]*>(.*?)<\/div><\/div>/g)];
      expect(rows).toHaveLength(6); // Header plus five calendar weeks.
      for (const row of rows.slice(1)) {
        expect(row[1]?.match(/role="gridcell"/g)).toHaveLength(7);
      }
      const days = [
        ...html.matchAll(
          /<button[^>]*aria-label="[^"]*\d{4}, \d+ scheduled[^"]*"[^>]*>/g
        ),
      ].map((match) => match[0]);
      expect(days).toHaveLength(35);
      expect(days.filter((day) => day.includes('tabindex="0"'))).toHaveLength(
        1
      );
      expect(days.filter((day) => day.includes('tabindex="-1"'))).toHaveLength(
        34
      );
      expect(html.match(/role="gridcell" aria-selected="true"/g)).toHaveLength(
        1
      );
      const selected = days.find((day) => day.includes('aria-pressed="true"'));
      expect(selected).toContain(
        "October 8, 2026, 1 scheduled; Launch film, In Progress"
      );
      expect(selected).toContain('aria-current="date"');
      expect(selected).toContain("focus-visible:focus-ring-inset");
    }
  );
});
