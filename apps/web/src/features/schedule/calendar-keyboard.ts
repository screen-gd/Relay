/** Moves within the calendar without overflowing short months. */
export function calendarDateForKey(date: Date, key: string, weekStart: string) {
  const next = new Date(date);
  const weekStartIndex = [
    "Sun",
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
    "Sat",
  ].indexOf(weekStart);
  const weekOffset =
    (date.getDay() - (weekStartIndex < 0 ? 1 : weekStartIndex) + 7) % 7;
  switch (key) {
    case "ArrowLeft":
      next.setDate(date.getDate() - 1);
      break;
    case "ArrowRight":
      next.setDate(date.getDate() + 1);
      break;
    case "ArrowUp":
      next.setDate(date.getDate() - 7);
      break;
    case "ArrowDown":
      next.setDate(date.getDate() + 7);
      break;
    case "Home":
      next.setDate(date.getDate() - weekOffset);
      break;
    case "End":
      next.setDate(date.getDate() + 6 - weekOffset);
      break;
    case "PageUp":
    case "PageDown": {
      next.setDate(1);
      next.setMonth(date.getMonth() + (key === "PageUp" ? -1 : 1));
      const lastDay = new Date(
        next.getFullYear(),
        next.getMonth() + 1,
        0
      ).getDate();
      next.setDate(Math.min(date.getDate(), lastDay));
      break;
    }
    default:
      return null;
  }
  return next;
}
