import { describe, expect, it } from "vitest";
import {
  parseTranscript,
  matchTranscriptTimestamp,
  MAX_TRANSCRIPT_BYTES,
  MAX_TRANSCRIPT_CUES,
} from "./transcript-parser";

describe("transcript parser", () => {
  it("reads SRT with BOM, CRLF, multiline text and comma milliseconds", () => {
    expect(
      parseTranscript(
        "\uFEFF1\r\n00:00:01,250 --> 00:00:03,500\r\nHello\r\nworld\r\n"
      )
    ).toEqual([{ startSeconds: 1.25, endSeconds: 3.5, text: "Hello\nworld" }]);
  });
  it("reads VTT identifiers/settings and skips metadata; strips subtitle markup", () => {
    expect(
      parseTranscript(
        "WEBVTT\nLanguage: en\n\nNOTE source\nprivate\n\nSTYLE\n::cue {}\n\nintro\n00:01.000 --> 00:03.000 align:start\n<v Screen><b>Hello</b> &amp; welcome"
      )
    ).toEqual([{ startSeconds: 1, endSeconds: 3, text: "Hello & welcome" }]);
  });
  it.each([
    "",
    "WEBVTT",
    "1\n00:61:01,000 --> 00:62:03,000\nHi",
    "1\n00:00:03,000 --> 00:00:01,000\nHi",
    "1\n00:00:01,000 --> 00:00:01,000\nHi",
    "1\n00:00:01,000 --> 00:00:02,000\n",
    "broken",
  ])("rejects malformed cues: %s", (value) =>
    expect(() => parseTranscript(value)).toThrow()
  );
  it("bounds bytes, text length and cue count", () => {
    expect(() => parseTranscript("é".repeat(MAX_TRANSCRIPT_BYTES))).toThrow(
      "32 KB"
    );
    expect(() =>
      parseTranscript(`1\n00:00:01,000 --> 00:00:02,000\n${"x".repeat(501)}`)
    ).toThrow("500 characters");
    expect(() =>
      parseTranscript(
        Array.from(
          { length: MAX_TRANSCRIPT_CUES + 1 },
          (_, i) => `${i}\n00:00:01,000 --> 00:00:02,000\nx`
        ).join("\n\n")
      )
    ).toThrow("300 cues");
  });
});
it("matches enclosing and nearest cues with deterministic overlap/boundary ties", () => {
  const cues = [
    { startSeconds: 0, endSeconds: 5, text: "First" },
    { startSeconds: 4, endSeconds: 8, text: "Second" },
  ];
  expect(matchTranscriptTimestamp(cues, 0)?.text).toBe("First");
  expect(matchTranscriptTimestamp(cues, 4)?.text).toBe("Second");
  expect(matchTranscriptTimestamp(cues, 10)?.text).toBe("Second");
  expect(matchTranscriptTimestamp(cues, 10.01)).toBeNull();
  expect(matchTranscriptTimestamp(cues)).toBeNull();
  expect(matchTranscriptTimestamp(cues, NaN)).toBeNull();
});
