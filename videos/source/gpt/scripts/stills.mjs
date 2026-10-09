/* global process, console */
// Renders preview stills from one bundle.
// Usage: node scripts/stills.mjs <compositionId> <frame> [frame...]
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";

const [id, ...frames] = process.argv.slice(2);
const serveUrl = await bundle({
  entryPoint: path.resolve("remotion/index.ts"),
});
const composition = await selectComposition({ serveUrl, id });
for (const frame of frames.map(Number)) {
  const output = path.resolve(`out/stills/${id}-${frame}.png`);
  await renderStill({ serveUrl, composition, frame, output, scale: 0.5 });
  console.log(output);
}
