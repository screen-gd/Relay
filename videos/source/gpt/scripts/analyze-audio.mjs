/* global process, console */
// Decode PCM from WAV, fit a kick-onset grid, and measure RMS dBFS for each bar.
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
const [file, output = "out/audio-analysis.json"] = process.argv.slice(2);
assert(file, "Pass an audio or video file.");
const rate = 11025;
const hop = 32;
const win = 128;
const ffmpeg = path.resolve(
  "node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe"
);
const decode = (filter) => {
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
      ...(filter ? ["-af", filter] : []),
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
    assert(offset < raw.length, "WAV data chunk missing.");
  }
  offset += 8;
  return Float64Array.from(
    { length: Math.floor((raw.length - offset) / 2) },
    (_, i) => raw.readInt16LE(offset + i * 2) / 32768
  );
};
const samples = decode("");
const bass = new Float64Array(samples.length);
const lowCoefficient = 1 - Math.exp((-2 * Math.PI * 35) / rate);
const highCoefficient = 1 - Math.exp((-2 * Math.PI * 160) / rate);
let low = 0;
let band = 0;
for (let i = 0; i < samples.length; i++) {
  low += lowCoefficient * (samples[i] - low);
  band += highCoefficient * (samples[i] - low - band);
  bass[i] = band;
}
const energy = [];
for (let i = 0; i + win < bass.length; i += hop) {
  let sum = 0;
  for (let j = 0; j < win; j++) sum += bass[i + j] ** 2;
  energy.push(Math.sqrt(sum / win));
}
const onset = energy.map((v, i) => Math.max(0, v - (energy[i - 4] ?? v)));
const dt = hop / rate;
const valueAt = (time) => {
  const x = time / dt;
  const i = Math.floor(x);
  return (onset[i] ?? 0) * (1 - (x - i)) + (onset[i + 1] ?? 0) * (x - i);
};
const duration = samples.length / rate;
let candidate = { bpm: 0, score: -Infinity };
for (let bpm = 100; bpm <= 125; bpm += 0.05) {
  const lag = 60 / bpm / dt;
  let score = 0;
  for (let i = 0; i + lag * 4 < onset.length; i += 2) {
    const read = (x) => {
      const j = Math.floor(x);
      return onset[j] * (1 - (x - j)) + onset[j + 1] * (x - j);
    };
    score +=
      onset[i] *
      (read(i + lag) + read(i + 2 * lag) * 0.7 + read(i + 4 * lag) * 0.5);
  }
  if (score > candidate.score) candidate = { bpm, score };
}
let grid = { bpm: candidate.bpm, phase: 0, score: -Infinity };
for (
  let bpm = candidate.bpm - 0.15;
  bpm <= candidate.bpm + 0.15;
  bpm += 0.001
) {
  const period = 60 / bpm;
  for (let phase = 0; phase < period; phase += 0.0015) {
    let score = 0;
    for (let t = phase; t < duration - 2; t += period) score += valueAt(t);
    if (score > grid.score) grid = { bpm, phase, score };
  }
}
const period = 60 / grid.bpm;
const phase = (((grid.phase - win / (2 * rate)) % period) + period) % period;
const accents = Array.from({ length: 4 }, (_, offset) => {
  let score = 0;
  for (let t = grid.phase + offset * period; t < duration - 2; t += 4 * period)
    score += valueAt(t);
  return score;
});
const downbeatClass = accents.indexOf(Math.max(...accents));
const downbeat = phase + downbeatClass * period;
const bars = [];
for (
  let t = downbeat, index = 0;
  t + period * 4 <= duration;
  t += period * 4, index++
) {
  const from = Math.round(t * rate);
  const to = Math.round((t + period * 4) * rate);
  let sum = 0;
  for (let i = from; i < to; i++) sum += samples[i] ** 2;
  bars.push({
    bar: index,
    seconds: +t.toFixed(6),
    rmsDbfs: +(20 * Math.log10(Math.sqrt(sum / (to - from)))).toFixed(3),
  });
}
assert(grid.bpm >= 100 && grid.bpm <= 125);
assert(bars.length > 10 && bars.every((b) => Number.isFinite(b.rmsDbfs)));
const result = {
  file,
  duration,
  bpm: +grid.bpm.toFixed(4),
  beatSeconds: period,
  beatPhaseSeconds: phase,
  downbeatClass,
  downbeatSeconds: downbeat,
  accents,
  bars,
};
writeFileSync(output, JSON.stringify(result, null, 2));
console.log(JSON.stringify({ ...result, bars: bars.slice(0, 32) }, null, 2));
