/* global process, console */
// Prints tempo, beat phase, and a per-second loudness profile for a track.
// Usage: node scripts/analyze-audio.mjs public/audio/track.mp3
import { execFileSync } from "node:child_process";

const file = process.argv[2];
const RATE = 11025;
const raw = execFileSync(
  "npx",
  [
    "remotion",
    "ffmpeg",
    "-v",
    "error",
    "-i",
    file,
    "-ac",
    "1",
    "-ar",
    String(RATE),
    "-c:a",
    "pcm_s16le",
    "-f",
    "wav",
    "-",
  ],
  { maxBuffer: 1 << 30, shell: true }
);
// Skip the 44-byte WAV header and convert 16-bit PCM to floats.
const pcm = new Int16Array(
  raw.buffer,
  raw.byteOffset + 44,
  Math.floor((raw.byteLength - 44) / 2)
);
const samples = Float32Array.from(pcm, (value) => value / 32768);
const duration = samples.length / RATE;

// Onset envelope: positive change in RMS over 256-sample hops.
const HOP = 256;
const WIN = 1024;
const rms = [];
for (let i = 0; i + WIN < samples.length; i += HOP) {
  let sum = 0;
  for (let j = 0; j < WIN; j++) sum += samples[i + j] ** 2;
  rms.push(Math.sqrt(sum / WIN));
}
const onset = rms.map((value, i) => Math.max(0, value - (rms[i - 1] ?? value)));
const hopSec = HOP / RATE;

function interp(arr, x) {
  const i = Math.floor(x);
  const t = x - i;
  return (arr[i] ?? 0) * (1 - t) + (arr[i + 1] ?? 0) * t;
}

// Tempo by autocorrelation between 80 and 160 BPM.
let best = { bpm: 0, score: -Infinity };
for (let bpm = 80; bpm <= 160; bpm += 0.25) {
  const lag = 60 / bpm / hopSec;
  let score = 0;
  for (let i = 0; i + lag * 4 < onset.length; i++) {
    score +=
      onset[i] *
      (interp(onset, i + lag) +
        interp(onset, i + 2 * lag) * 0.5 +
        interp(onset, i + 4 * lag) * 0.25);
  }
  if (score > best.score) best = { bpm, score };
}

// Beat phase: offset that maximises onset energy on the beat grid.
const beat = 60 / best.bpm;
let phase = { offset: 0, score: -Infinity };
for (let offset = 0; offset < beat; offset += 0.005) {
  let score = 0;
  for (let t = offset; t < duration; t += beat)
    score += interp(onset, t / hopSec);
  if (score > phase.score) phase = { offset, score };
}

console.log(
  `duration ${duration.toFixed(2)}s  bpm ${best.bpm}  beat ${beat.toFixed(4)}s  first beat ${phase.offset.toFixed(3)}s`
);

// Loudness per bar (4 beats), aligned to the detected beat grid.
const bars = [];
for (let t = phase.offset; t + beat * 4 <= duration; t += beat * 4) {
  const slice = rms.slice(
    Math.floor(t / hopSec),
    Math.floor((t + beat * 4) / hopSec)
  );
  bars.push({ t, value: slice.reduce((a, b) => a + b, 0) / slice.length });
}
const barMax = Math.max(...bars.map((bar) => bar.value));
bars.forEach((bar, index) => {
  console.log(
    `bar ${String(index).padStart(2)} @ ${bar.t.toFixed(2)}s ${"=".repeat(Math.round((bar.value / barMax) * 50))}`
  );
});

const perSecond = [];
for (let s = 0; s < Math.floor(duration); s++) {
  const slice = rms.slice(Math.floor(s / hopSec), Math.floor((s + 1) / hopSec));
  perSecond.push(slice.reduce((a, b) => a + b, 0) / slice.length);
}
const max = Math.max(...perSecond);
perSecond.forEach((value, s) => {
  console.log(
    `${String(s).padStart(3)}s ${"#".repeat(Math.round((value / max) * 50))}`
  );
});
