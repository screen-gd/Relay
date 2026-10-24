/* global console */
// Match decoded music windows to measure export offset independently of mixed SFX.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
const rate = 11025;
const ffmpeg = path.resolve(
  "node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe"
);
const decode = (file) => {
  const raw = execFileSync(
    ffmpeg,
    [
      "-v",
      "error",
      "-i",
      file,
      "-vn",
      "-ac",
      "1",
      "-ar",
      String(rate),
      "-c:a",
      "pcm_s16le",
      "-f",
      "wav",
      "-",
    ],
    { maxBuffer: 64 * 1024 * 1024 }
  );
  let offset = 12;
  while (raw.toString("ascii", offset, offset + 4) !== "data") {
    const size = raw.readUInt32LE(offset + 4);
    offset += 8 + size + (size % 2);
    assert(offset < raw.length);
  }
  offset += 8;
  return Float64Array.from(
    { length: Math.floor((raw.length - offset) / 2) },
    (_, i) => raw.readInt16LE(offset + i * 2) / 32768
  );
};
const source = decode("public/audio/close-up.mp3");
const output = decode("out/relay-launch.mp4");
const sheet = JSON.parse(readFileSync("out/beat-sheet.json", "utf8"));
const trim = sheet.trimFrames / sheet.fps;
const windows = [8, 20, 36, 48].map((seconds) => {
  const from = Math.round(seconds * rate);
  const length = rate * 2;
  const expected = Math.round(trim * rate);
  let best = { delta: 0, correlation: -Infinity };
  for (
    let delta = -Math.round(0.12 * rate);
    delta <= Math.round(0.12 * rate);
    delta++
  ) {
    let dot = 0;
    let inputPower = 0;
    let outputPower = 0;
    for (let i = 0; i < length; i += 2) {
      const a = source[from + expected + delta + i];
      const b = output[from + i];
      dot += a * b;
      inputPower += a * a;
      outputPower += b * b;
    }
    const correlation = dot / Math.sqrt(inputPower * outputPower);
    if (correlation > best.correlation) best = { delta, correlation };
  }
  return {
    seconds,
    sourceOffsetSeconds: trim + best.delta / rate,
    correlation: best.correlation,
  };
});
assert(
  windows.every((w) => w.correlation > 0.85),
  "Music correlation is too low to establish timing."
);
const offsets = windows.map((w) => w.sourceOffsetSeconds).sort((a, b) => a - b);
assert(
  offsets.at(-1) - offsets[0] < 1 / sheet.fps,
  "Soundtrack offset drifts by more than one frame."
);
const sourceGrid = JSON.parse(
  readFileSync("out/source-audio-analysis.json", "utf8")
);
const offset = offsets[Math.floor(offsets.length / 2)];
const barSeconds = sourceGrid.beatSeconds * 4;
const firstSourceBar = Math.round(
  (offset - sourceGrid.downbeatSeconds) / barSeconds
);
const downbeatSeconds =
  sourceGrid.downbeatSeconds + firstSourceBar * barSeconds - offset;
const bars = [];
for (let n = 0; n < sheet.sections.reduce((sum, s) => sum + s.bars, 0); n++) {
  const from = Math.max(
    0,
    Math.round((downbeatSeconds + n * barSeconds) * rate)
  );
  const to = Math.min(
    output.length,
    Math.round((downbeatSeconds + (n + 1) * barSeconds) * rate)
  );
  let power = 0;
  for (let i = from; i < to; i++) power += output[i] ** 2;
  bars.push({
    bar: n + 1,
    seconds: downbeatSeconds + n * barSeconds,
    rmsDbfs: 20 * Math.log10(Math.sqrt(power / (to - from))),
  });
}
const result = {
  sampleRate: rate,
  windows,
  sourceOffsetSeconds: offset,
  offsetSpreadSeconds: offsets.at(-1) - offsets[0],
  matchedBeatGrid: {
    bpm: sourceGrid.bpm,
    beatSeconds: sourceGrid.beatSeconds,
    downbeatSeconds,
    firstSourceBar,
    bars,
  },
};
writeFileSync(
  "out/audio-offset-verification.json",
  JSON.stringify(result, null, 2)
);
console.log(JSON.stringify(result, null, 2));
