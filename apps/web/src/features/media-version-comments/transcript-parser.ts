export const MAX_TRANSCRIPT_BYTES = 32_000;
export const MAX_TRANSCRIPT_CUES = 300;
export type TranscriptCue = {
  startSeconds: number;
  endSeconds: number;
  text: string;
};

function seconds(value: string) {
  const match = /^(?:(\d{2,}):)?(\d{2}):(\d{2})[,.](\d{3})$/.exec(value);
  if (!match || Number(match[2]) > 59 || Number(match[3]) > 59)
    throw new Error("Invalid transcript timestamp");
  const result =
    Number(match[1] ?? 0) * 3600 +
    Number(match[2]) * 60 +
    Number(match[3]) +
    Number(match[4]) / 1000;
  if (result > 86_400) throw new Error("Transcript timestamp exceeds 24 hours");
  return result;
}

/** Parse bounded SRT/WebVTT cues without executing subtitle markup. */
export function parseTranscript(source: string): TranscriptCue[] {
  if (new TextEncoder().encode(source).byteLength > MAX_TRANSCRIPT_BYTES)
    throw new Error("Transcript must be 32 KB or smaller");
  const normalized = source
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n")
    .trim();
  const blocks = normalized.split(/\n[ \t]*\n/);
  const vtt = /^WEBVTT(?:[ \t].*)?(?:\n|$)/.test(normalized);
  if (vtt) blocks.shift();
  const cues: TranscriptCue[] = [];
  for (const block of blocks) {
    if (vtt && /^(NOTE(?:\n|[ \t]|$)|STYLE(?:\n|$)|REGION(?:\n|$))/.test(block))
      continue;
    const lines = block.split("\n");
    const timingIndex = lines[0].includes("-->") ? 0 : 1;
    const timing = /^(\S+)\s+-->\s+(\S+)(?:[ \t]+.*)?$/.exec(
      lines[timingIndex] ?? ""
    );
    if (!timing) throw new Error("Invalid SRT/VTT cue");
    const startSeconds = seconds(timing[1]);
    const endSeconds = seconds(timing[2]);
    if (endSeconds <= startSeconds)
      throw new Error("Cue end must follow its start");
    const text = lines
      .slice(timingIndex + 1)
      .join("\n")
      .replace(/<[^>]*>/g, "")
      .replace(
        /&(?:amp|lt|gt|nbsp|quot);/g,
        (entity) =>
          ({
            "&amp;": "&",
            "&lt;": "<",
            "&gt;": ">",
            "&nbsp;": " ",
            "&quot;": '"',
          })[entity] ?? entity
      )
      .trim();
    if (!text || text.length > 500)
      throw new Error("Transcript cues need 1 to 500 characters");
    cues.push({ startSeconds, endSeconds, text });
    if (cues.length > MAX_TRANSCRIPT_CUES)
      throw new Error("Transcript supports up to 300 cues");
  }
  if (!cues.length) throw new Error("Transcript has no cues");
  return cues.sort((a, b) => a.startSeconds - b.startSeconds);
}

/** Prefer an enclosing cue, then the nearest cue within two seconds. */
export function matchTranscriptTimestamp<T extends TranscriptCue>(
  cues: readonly T[],
  timestamp?: number
): T | null {
  if (timestamp === undefined || !Number.isFinite(timestamp) || timestamp < 0)
    return null;
  let best: T | null = null;
  let bestDistance = Infinity;
  for (const cue of cues) {
    const distance = Math.max(
      cue.startSeconds - timestamp,
      timestamp - cue.endSeconds,
      0
    );
    if (
      distance <= 2 &&
      (distance < bestDistance ||
        (distance === bestDistance &&
          (!best || cue.startSeconds > best.startSeconds)))
    ) {
      best = cue;
      bestDistance = distance;
    }
  }
  return best;
}
