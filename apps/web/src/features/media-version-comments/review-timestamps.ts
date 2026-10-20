export function formatReviewTimestamp(seconds: number) {
  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainder = total % 60;
  return hours
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`
    : `${minutes}:${String(remainder).padStart(2, "0")}`;
}

/** An empty input is a general comment. Invalid input must not silently lose its timestamp. */
export function parseReviewTimestamp(value: string): number | undefined {
  const raw = value.trim();
  if (!raw) return undefined;
  const parts = raw.split(":");
  if (
    parts.length < 2 ||
    parts.length > 3 ||
    parts.some((part) => !/^\d+$/.test(part)) ||
    parts.slice(1).some((part) => part.length !== 2 || Number(part) > 59)
  )
    throw new Error("Use m:ss or h:mm:ss, or leave the timestamp blank.");
  const seconds = parts.reduce((total, part) => total * 60 + Number(part), 0);
  if (!Number.isSafeInteger(seconds) || seconds > 604_800)
    throw new Error("Timestamp must be within seven days.");
  return seconds;
}
