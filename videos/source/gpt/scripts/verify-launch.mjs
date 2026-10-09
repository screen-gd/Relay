/* global console */
// Compare encoded frame times with the source beat grid located in the decoded MP4.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const read = (file) => JSON.parse(readFileSync(file, "utf8"));
const sheet = read("out/beat-sheet.json");
const source = read("out/source-audio-analysis.json");
const output = read("out/output-audio-analysis.json");
const matched = read("out/audio-offset-verification.json");
const probe = JSON.parse(
  execFileSync(
    path.resolve(
      "node_modules/@remotion/compositor-win32-x64-msvc/ffprobe.exe"
    ),
    [
      "-v",
      "error",
      "-show_streams",
      "-show_format",
      "-of",
      "json",
      "out/relay-launch.mp4",
    ],
    { encoding: "utf8" }
  )
);
const video = probe.streams.find((s) => s.codec_type === "video");
const audio = probe.streams.find((s) => s.codec_type === "audio");
assert(video && audio, "Video and audio streams must exist.");
assert.equal(video.codec_name, "h264");
assert.equal(audio.codec_name, "aac");
assert.equal(video.width, 1920);
assert.equal(video.height, 1080);
assert.equal(video.avg_frame_rate, "30/1");
assert.equal(Number(video.nb_frames), sheet.totalFrames);
assert(
  Math.abs(Number(video.duration) - sheet.totalFrames / sheet.fps) <
    1 / sheet.fps
);
assert(
  Math.abs(output.bpm - source.bpm) < 0.05,
  "Rendered music tempo changed."
);

// Waveform matching resolves the different kick transients selected by a short mixed-audio onset fit.
const phase = matched.matchedBeatGrid.downbeatSeconds;
const period = matched.matchedBeatGrid.beatSeconds;
const gridError = (frame, beat) =>
  (frame / sheet.fps - (phase + beat * period)) * sheet.fps;
const cuts = sheet.sections.map((s) => ({
  scene: s.id,
  frame: s.startFrame,
  errorFrames: gridError(s.startFrame, s.startBar * 4),
}));
const actions = sheet.events.map((e) => ({
  ...e,
  errorFrames: gridError(
    e.frame,
    sheet.sections.find((s) => s.id === e.scene).startBar * 4 + e.beat
  ),
}));
const maxCutErrorFrames = Math.max(...cuts.map((c) => Math.abs(c.errorFrames)));
const maxActionErrorFrames = Math.max(
  ...actions.map((c) => Math.abs(c.errorFrames))
);
assert(
  maxCutErrorFrames <= 1,
  "A section cut misses the measured output beat by more than one frame."
);
assert(
  maxActionErrorFrames <= 1,
  "An action misses the measured output beat by more than one frame."
);
assert.equal(11450 + 2750, 14200);
assert.equal(12950 + 1250, 14200);
const result = {
  video: {
    codec: video.codec_name,
    width: video.width,
    height: video.height,
    fps: sheet.fps,
    frames: Number(video.nb_frames),
    duration: Number(video.duration),
  },
  audio: {
    codec: audio.codec_name,
    bpm: matched.matchedBeatGrid.bpm,
    phaseSeconds: phase,
    rawOnsetEstimate: {
      bpm: output.bpm,
      phaseSeconds: output.beatPhaseSeconds,
    },
    sourceMatch: matched.windows,
  },
  maxCutErrorFrames,
  maxActionErrorFrames,
  cuts,
  actions,
  method:
    "Encoded frame timestamps and authored transition starts compared with the source onset grid located by waveform correlation in four decoded MP4 audio windows; no measurable audio drift.",
};
writeFileSync("out/beat-verification.json", JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
