/* global console, process */
// One bundle supplies every QA still and the final H.264 render. No Studio is opened.
import { bundle } from "@remotion/bundler";
import {
  renderStill,
  selectComposition,
  renderMedia,
} from "@remotion/renderer";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
const mode = process.argv[2] ?? "stills";
const source = readFileSync("remotion/launch/beats.ts", "utf8");
const bpm = Number(source.match(/BPM = ([\d.]+)/)[1]);
const trim = Number(source.match(/MUSIC_TRIM = (\d+)/)[1]);
const bars = Array.from(
  source.match(/SCENE_BARS = \{([\s\S]*?)\}/)[1].matchAll(/(\w+): (\d+)/g),
  (m) => ({ id: m[1], bars: Number(m[2]) })
);
const fps = 30;
const beat = (n) => Math.round(((n * 60) / bpm) * fps);
let startBar = 0;
const sections = bars.map((s) => {
  const item = {
    ...s,
    startBar,
    startFrame: beat(startBar * 4),
    durationInFrames: beat((startBar + s.bars) * 4) - beat(startBar * 4),
  };
  startBar += s.bars;
  return item;
});
const total = beat(startBar * 4);
assert(total / fps >= 45 && total / fps <= 55);
const local = (id, n) => {
  const s = sections.find((s) => s.id === id);
  assert(s);
  return beat(s.startBar * 4 + n);
};
const events = [
  ["dashboard", 11, "Quick create"],
  ["create", 5, "Type project name"],
  ["create", 9, "Open client dropdown"],
  ["create", 11, "Choose Aperture Coffee"],
  ["create", 13, "Open workflow dropdown"],
  ["create", 15, "Choose workflow"],
  ["create", 17, "Create Project"],
  ["board", 6, "Grab Summer launch film"],
  ["board", 8, "Drop in Client Review"],
  ["review", 10, "Focus comment"],
  ["review", 14, "Add comment"],
  ["review", 16, "Switch to editor"],
  ["review", 17, "Open review state"],
  ["review", 19, "Set Approved"],
  ["money", 6, "Open unpaid project"],
  ["money", 8, "Mark paid"],
  ["outro", 5, "Get started free"],
].map(([id, n, label]) => ({ scene: id, beat: n, label, frame: local(id, n) }));
const checks = [
  ["intro", 2, "setup"],
  ["intro", 7.5, "scattered-week"],
  ["intro", 11.5, "logo"],
  ...sections
    .filter((s) => !["intro", "outro"].includes(s.id))
    .flatMap((s) => [
      [s.id, 2.5, "title"],
      [s.id, 4, "entrance"],
      [s.id, 5, "product"],
    ]),
  ["dashboard", 6.75, "highlight"],
  ["dashboard", 8.75, "project-list"],
  ["board", 7, "drag"],
  ["board", 9, "drop-result"],
  ["review", 7.75, "timestamp-comments"],
  ["review", 12.5, "typing"],
  ["review", 15, "posted-comment"],
  ["review", 19.5, "approved-result"],
  ["money", 10.9, "totals-result"],
  ["outro", 7, "closing-offer"],
].map(([id, n, label]) => ({ label: `${id}-${label}`, frame: local(id, n) }));
checks.push(
  ...events.map((e) => ({
    label: `${e.scene}-${e.label.toLowerCase().replaceAll(" ", "-")}`,
    frame: e.frame,
  })),
  ...sections
    .slice(1)
    .map((s) => ({ label: `transition-${s.id}`, frame: s.startFrame + 8 }))
);
checks.push(
  ...[
    ["intro", 4, "two-line-setup"],
    ["create", 9.5, "client-menu"],
    ["create", 13.5, "workflow-menu"],
    ["create", 18.8, "new-row"],
    ["review", 17.5, "review-menu"],
    ["money", 7.5, "project-payment"],
    ["money", 8.5, "paid-project"],
    ["money", 9.5, "return-to-totals"],
  ].map(([id, n, label]) => ({ label: `${id}-${label}`, frame: local(id, n) }))
);
mkdirSync("out/relay-launch-stills", { recursive: true });
writeFileSync(
  "out/beat-sheet.json",
  JSON.stringify(
    {
      fps,
      bpm,
      trimFrames: trim,
      totalFrames: total,
      sections,
      events,
      checks,
    },
    null,
    2
  )
);
const bundlePath = path.resolve("out/relay-launch-bundle");
const serveUrl =
  mode === "stills"
    ? await bundle({
        entryPoint: path.resolve("remotion/index.ts"),
        outDir: bundlePath,
      })
    : bundlePath;
const composition = await selectComposition({ serveUrl, id: "RelayLaunch" });
assert.equal(composition.durationInFrames, total);
if (mode === "stills") {
  for (let i = 0; i < checks.length; i += 3) {
    await Promise.all(
      checks.slice(i, i + 3).map(async (check) => {
        const output = path.resolve(
          `out/relay-launch-stills/${check.label}-${check.frame}.png`
        );
        await renderStill({
          serveUrl,
          composition,
          frame: check.frame,
          output,
          imageFormat: "png",
          scale: 1,
        });
        console.log(check.label, check.frame);
      })
    );
  }
} else {
  assert.equal(mode, "render");
  let lastPercent = -1;
  await renderMedia({
    serveUrl,
    composition,
    outputLocation: path.resolve("out/relay-launch.mp4"),
    codec: "h264",
    audioCodec: "aac",
    pixelFormat: "yuv420p",
    crf: 18,
    audioBitrate: "320k",
    concurrency: 4,
    onProgress: ({ progress }) => {
      const percent = Math.floor(progress * 10) * 10;
      if (percent !== lastPercent) {
        console.log(`${percent}%`);
        lastPercent = percent;
      }
    },
  });
  console.log("Rendered out/relay-launch.mp4");
}
