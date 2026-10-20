/** Largest timestamp a review can point at: one week of video, in seconds. */
const MAX_COMMENT_TIMESTAMP_SECONDS = 604_800;

/**
 * Reads the timestamp stored on a comment for AI input. Stored rows can hold a
 * negative, fractional, non-finite, or out-of-range value, and every AI input
 * schema accepts only whole seconds inside the playable window, so anything
 * else becomes `null` (no timestamp) instead of failing the parse.
 */
export function safeCommentTimestampSeconds(seconds: number | undefined) {
  return seconds !== undefined &&
    Number.isSafeInteger(seconds) &&
    seconds >= 0 &&
    seconds <= MAX_COMMENT_TIMESTAMP_SECONDS
    ? seconds
    : null;
}
