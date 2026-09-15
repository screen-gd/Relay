import { chromium } from "@playwright/test";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  appIconSizes,
  brandAccent,
  brandSource,
  brandTargets,
  faviconSizes,
  socialPreviewSource,
} from "./brand-asset-contract.mjs";

const root = resolve(import.meta.dirname, "..");
const sourcePath = resolve(root, brandSource);
const socialPreviewPath = resolve(root, socialPreviewSource);
const fontPath = resolve(
  root,
  "node_modules/geist/dist/fonts/geist-sans/Geist-SemiBold.woff2"
);
const targets = brandTargets.map((target) => resolve(root, target));

const source = await readFile(sourcePath, "utf8");
const socialPreview = await readFile(socialPreviewPath);
const font = (await readFile(fontPath)).toString("base64");
const body = source.match(/<svg[^>]*>([\s\S]*)<\/svg>/)?.[1];
if (!body || !source.includes('viewBox="0 0 100 100"')) {
  throw new Error(
    "The approved Relay mark is missing or has an unexpected view box."
  );
}

const svg = (viewBox, content, label) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" role="img" aria-label="${label}">${content}</svg>\n`;
const mark = (color) =>
  svg("0 0 100 100", `<g color="${color}">${body}</g>`, "Relay mark");
const lockup = (color) =>
  svg(
    "0 0 320 100",
    `<style>@font-face{font-family:Geist;src:url(data:font/woff2;base64,${font})}text{font-family:Geist,sans-serif;font-size:64px;font-weight:600;letter-spacing:-2.6px}</style><g color="${color}">${body}</g><text x="120" y="72" fill="${color}">Relay</text>`,
    "Relay"
  );
const social = svg(
  "0 0 1600 900",
  `<defs><radialGradient id="social-glow" cx="72%" cy="46%" r="66%"><stop offset="0" stop-color="${brandAccent}" stop-opacity=".98"/><stop offset=".34" stop-color="${brandAccent}" stop-opacity=".7"/><stop offset=".72" stop-color="#101400" stop-opacity=".4"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient><filter id="social-blur"><feGaussianBlur stdDeviation="34"/></filter></defs><rect width="1600" height="900" fill="#000"/><rect width="1600" height="900" fill="url(#social-glow)"/><circle cx="1280" cy="420" r="390" fill="${brandAccent}" opacity=".3" filter="url(#social-blur)"/><circle cx="1280" cy="420" r="330" fill="${brandAccent}"/><g transform="translate(910 50) scale(8)" color="#000">${body}</g><style>@font-face{font-family:Geist;src:url(data:font/woff2;base64,${font})}.eyebrow{font-family:Geist,sans-serif;font-size:24px;font-weight:600;letter-spacing:5px}.name{font-family:Geist,sans-serif;font-size:126px;font-weight:600;letter-spacing:-5px}.line{font-family:Geist,sans-serif;font-size:42px;font-weight:400;letter-spacing:-1px}</style><text class="eyebrow" x="170" y="220" fill="${brandAccent}">RELAY</text><text class="name" x="170" y="520" fill="#fff">Relay</text><path d="M170 570H720" stroke="${brandAccent}"/><text class="line" x="170" y="660" fill="#fff">Video production workspace for editors.</text>`,
  "Relay. Video production workspace for editors."
);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

async function renderPng(svgSource, width, height, path) {
  await page.setViewportSize({ width, height });
  await page.setContent(
    `<style>*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden}img{display:block;width:100%;height:100%}</style><img alt="" src="data:image/svg+xml;base64,${Buffer.from(svgSource).toString("base64")}">`
  );
  await page.locator("img").screenshot({ path, omitBackground: true });
}

for (const target of targets) {
  await rm(target, { recursive: true, force: true });
  await mkdir(target, { recursive: true });
  const files = {
    "mark-black.svg": mark("#000"),
    "mark-white.svg": mark("#fff"),
    "mark-accent.svg": mark(brandAccent),
    "lockup-black.svg": lockup("#000"),
    "lockup-white.svg": lockup("#fff"),
    "lockup-accent.svg": lockup(brandAccent),
    "social-preview.svg": social,
  };
  for (const [name, content] of Object.entries(files)) {
    await writeFile(resolve(target, name), content);
  }
  for (const size of faviconSizes) {
    await renderPng(
      mark(brandAccent),
      size,
      size,
      resolve(target, `favicon-${size}.png`)
    );
  }
  for (const size of appIconSizes) {
    const darkIcon = svg(
      "0 0 100 100",
      `<rect width="100" height="100" fill="#000"/><g transform="translate(14 14) scale(.72)" color="${brandAccent}">${body}</g>`,
      "Relay app icon"
    );
    const lightIcon = svg(
      "0 0 100 100",
      `<rect width="100" height="100" fill="${brandAccent}"/><g transform="translate(14 14) scale(.72)" color="#000">${body}</g>`,
      "Relay app icon"
    );
    await renderPng(
      darkIcon,
      size,
      size,
      resolve(target, `app-icon-dark-${size}.png`)
    );
    await renderPng(
      lightIcon,
      size,
      size,
      resolve(target, `app-icon-light-${size}.png`)
    );
  }
  await writeFile(resolve(target, "social-preview.png"), socialPreview);
}

await browser.close();
console.log(
  `Built Relay brand assets in ${targets.length} public directories.`
);
