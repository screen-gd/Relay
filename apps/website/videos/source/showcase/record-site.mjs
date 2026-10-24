// Records a dark-mode walkthrough of the marketing site as a 60 fps MP4.
//
// Renders frame by frame on a virtual clock instead of screen-capturing in
// real time: the page's animation frames, timers, CSS/WAAPI animations, and
// video playback all advance exactly 1/60 s per captured frame. Paint stalls
// (GPU shader compiles, video decode) then cost render time, not smoothness.
//
// The tour scrolls with easing, draws a cursor, and clicks through the
// interactive demos on the home, features, and pricing pages.
//
// Usage, with the marketing site running (e.g. `next start -p 3210` in
// website/):
//   node videos/source/showcase/record-site.mjs [baseUrl] [outFile]

import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.argv[2] ?? "http://localhost:3210";
const outFile = path.resolve(
  process.argv[3] ?? "videos/relay-site-showcase-dark.mp4"
);

// 1440×810 CSS px at 4/3 scale renders a 1920×1080 frame with the content
// column filling more of the picture than a 1920 px wide viewport would.
const VIEWPORT = { width: 1440, height: 810 };
const SCALE = 1920 / VIEWPORT.width;
const HEADER = 60;
const FPS = 60;
const FRAME_MS = 1000 / FPS;

const framesDir = path.join(tmpdir(), `relay-showcase-${Date.now()}`);
mkdirSync(framesDir, { recursive: true });

/**
 * Page-side virtual clock, installed before any page script. Until
 * `__vt.enable()` it passes through to the real clock so the page loads
 * normally; after that, time only moves when `__vt.step(ms)` is called.
 * CSS/WAAPI animations are frozen separately over CDP and advanced here.
 */
function installClock() {
  const real = {
    now: performance.now.bind(performance),
    dateNow: Date.now,
    raf: window.requestAnimationFrame.bind(window),
    caf: window.cancelAnimationFrame.bind(window),
    setTimeout: window.setTimeout.bind(window),
    clearTimeout: window.clearTimeout.bind(window),
    setInterval: window.setInterval.bind(window),
    clearInterval: window.clearInterval.bind(window),
    play: HTMLMediaElement.prototype.play,
    pause: HTMLMediaElement.prototype.pause,
    paused: Object.getOwnPropertyDescriptor(
      HTMLMediaElement.prototype,
      "paused"
    ).get,
  };

  let on = false;
  let origin = 0; // real performance.now() when the clock was enabled
  let dateOrigin = 0;
  let elapsed = 0;
  let nextId = 1e9; // clear of the real timer id range
  const frames = new Map();
  const timers = new Map();
  const playing = new WeakMap(); // video -> virtually playing?

  performance.now = () => (on ? origin + elapsed : real.now());
  Date.now = () => (on ? dateOrigin + Math.round(elapsed) : real.dateNow());

  window.requestAnimationFrame = (callback) => {
    if (!on) return real.raf((time) => callback(on ? performance.now() : time));
    frames.set(++nextId, callback);
    return nextId;
  };
  window.cancelAnimationFrame = (id) => {
    if (!frames.delete(id)) real.caf(id);
  };

  const addTimer =
    (repeat) =>
    (handler, delay = 0, ...args) => {
      const fn =
        typeof handler === "function" ? handler : () => (0, eval)(handler);
      if (!on)
        return (repeat ? real.setInterval : real.setTimeout)(
          fn,
          delay,
          ...args
        );
      const every = Math.max(0, Number(delay) || 0);
      timers.set(++nextId, {
        at: elapsed + every,
        every: repeat ? Math.max(1, every) : null,
        fn,
        args,
      });
      return nextId;
    };
  const clearTimer = (realClear) => (id) => {
    if (!timers.delete(id)) realClear(id);
  };
  window.setTimeout = addTimer(false);
  window.setInterval = addTimer(true);
  window.clearTimeout = clearTimer(real.clearTimeout);
  window.clearInterval = clearTimer(real.clearInterval);

  // Videos: playback becomes "advance currentTime each step".
  HTMLMediaElement.prototype.play = function () {
    if (!on) return real.play.call(this);
    if (!playing.get(this)) {
      playing.set(this, true);
      this.dispatchEvent(new Event("play"));
      this.dispatchEvent(new Event("playing"));
    }
    return Promise.resolve();
  };
  HTMLMediaElement.prototype.pause = function () {
    if (!on) return real.pause.call(this);
    if (playing.get(this)) {
      playing.set(this, false);
      this.dispatchEvent(new Event("pause"));
    }
  };
  Object.defineProperty(HTMLMediaElement.prototype, "paused", {
    configurable: true,
    get() {
      return on && playing.has(this)
        ? !playing.get(this)
        : real.paused.call(this);
    },
  });

  // The document timeline is frozen over CDP, but libraries such as Motion
  // set WAAPI start times from performance.now(). Translate between the two
  // clocks so an animation started "now" starts now on the frozen timeline.
  const timelineTime = Object.getOwnPropertyDescriptor(
    AnimationTimeline.prototype,
    "currentTime"
  ).get;
  const startTime = Object.getOwnPropertyDescriptor(
    Animation.prototype,
    "startTime"
  );
  const skew = () => performance.now() - timelineTime.call(document.timeline);
  Object.defineProperty(AnimationTimeline.prototype, "currentTime", {
    configurable: true,
    get() {
      const time = timelineTime.call(this);
      return on && typeof time === "number" ? time + skew() : time;
    },
  });
  Object.defineProperty(Animation.prototype, "startTime", {
    configurable: true,
    get() {
      const time = startTime.get.call(this);
      return on && typeof time === "number" ? time + skew() : time;
    },
    set(time) {
      startTime.set.call(
        this,
        on && typeof time === "number" ? time - skew() : time
      );
    },
  });

  const seek = (video, time) =>
    new Promise((resolve) => {
      const done = () => resolve();
      video.addEventListener("seeked", done, { once: true });
      real.setTimeout(done, 1500);
      video.currentTime = time;
    });

  window.__vt = {
    enable() {
      origin = real.now();
      dateOrigin = real.dateNow();
      on = true;
      for (const video of document.querySelectorAll("video")) {
        playing.set(video, !real.paused.call(video));
        real.pause.call(video);
      }
    },
    async step(ms) {
      elapsed += ms;

      // Timers due by now, in order (a timer may schedule another).
      for (;;) {
        let due = null;
        for (const [id, timer] of timers)
          if (timer.at <= elapsed && (!due || timer.at < due[1].at))
            due = [id, timer];
        if (!due) break;
        const [id, timer] = due;
        if (timer.every === null) timers.delete(id);
        else timer.at += timer.every;
        try {
          timer.fn(...timer.args);
        } catch (error) {
          console.error(error);
        }
      }

      const callbacks = [...frames.values()];
      frames.clear();
      const time = performance.now();
      for (const callback of callbacks) {
        try {
          callback(time);
        } catch (error) {
          console.error(error);
        }
      }

      for (const animation of document.getAnimations()) {
        if (animation.playState !== "running" || animation.currentTime === null)
          continue;
        const next = animation.currentTime + ms * animation.playbackRate;
        const end = animation.effect?.getComputedTiming().endTime ?? Infinity;
        if (animation.playbackRate > 0 && next >= end) animation.finish();
        else animation.currentTime = next;
      }

      const seeks = [];
      for (const video of document.querySelectorAll("video")) {
        if (!playing.get(video) || !(video.duration > 0)) continue;
        let next = video.currentTime + ms / 1000;
        if (next >= video.duration) {
          if (video.loop) next %= video.duration;
          else {
            next = video.duration;
            playing.set(video, false);
            video.dispatchEvent(new Event("pause"));
            video.dispatchEvent(new Event("ended"));
          }
        }
        seeks.push(seek(video, next));
      }
      await Promise.all(seeks);
    },
  };
}

/** Page-side helpers: drawn cursor, click ripple, eased scroll and glide. */
function installStage() {
  const style = document.createElement("style");
  style.textContent = `
    html { scroll-behavior: auto !important; scrollbar-width: none; }
    html::-webkit-scrollbar { display: none; }
    #showcase-cursor {
      position: fixed; left: 0; top: 0; z-index: 2147483647;
      pointer-events: none; width: 22px; height: 22px;
      transform: translate(-100px, -100px);
      filter: drop-shadow(0 2px 4px rgb(0 0 0 / 0.5));
    }
    #showcase-cursor svg { transition: transform 120ms ease; transform-origin: 3px 2px; }
    #showcase-cursor.is-down svg { transform: scale(0.86); }
    .showcase-ripple {
      position: fixed; z-index: 2147483646; pointer-events: none;
      width: 36px; height: 36px; margin: -18px 0 0 -18px; border-radius: 50%;
      border: 2px solid #c6ff00;
      animation: showcase-ripple 420ms ease-out forwards;
    }
    @keyframes showcase-ripple {
      from { transform: scale(0.3); opacity: 1; }
      to { transform: scale(1.3); opacity: 0; }
    }
  `;
  const cursor = document.createElement("div");
  cursor.id = "showcase-cursor";
  cursor.innerHTML = `<svg width="22" height="22" viewBox="0 0 22 22"><path d="M3 2 L3 18 L7.2 14.2 L10 20.5 L12.8 19.3 L10.1 13.2 L15.8 13.2 Z" fill="#fff" stroke="#000" stroke-width="1.4" stroke-linejoin="round"/></svg>`;

  const mount = () => {
    document.head.append(style);
    document.body.append(cursor);
  };
  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount, { once: true });

  // The cursor element stays in <body> across client-side navigation.
  const at = { x: -100, y: -100 };
  const place = () => {
    cursor.style.transform = `translate(${at.x - 3}px, ${at.y - 2}px)`;
  };
  document.addEventListener(
    "mousemove",
    (event) => {
      at.x = event.clientX;
      at.y = event.clientY;
      place();
    },
    true
  );
  document.addEventListener(
    "mousedown",
    () => {
      cursor.classList.add("is-down");
      const ripple = document.createElement("div");
      ripple.className = "showcase-ripple";
      ripple.style.left = `${at.x}px`;
      ripple.style.top = `${at.y}px`;
      ripple.addEventListener("animationend", () => ripple.remove());
      document.body.append(ripple);
    },
    true
  );
  document.addEventListener(
    "mouseup",
    () => cursor.classList.remove("is-down"),
    true
  );

  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
  const tween = (duration, apply) => {
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      apply(ease(t));
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  // Glides only the drawn cursor; the recorder sends the real mouse event on
  // arrival so hover state lands with it.
  window.__showcaseGlide = (x, y, duration) => {
    const from = { ...at };
    tween(duration, (k) => {
      at.x = from.x + (x - from.x) * k;
      at.y = from.y + (y - from.y) * k;
      place();
    });
  };
  window.__showcaseScroll = (target, duration) => {
    const max = document.documentElement.scrollHeight - innerHeight;
    const to = Math.max(0, Math.min(max, target));
    const from = scrollY;
    tween(duration, (k) =>
      scrollTo({ top: from + (to - from) * k, behavior: "instant" })
    );
  };
}

// Full Chromium in new headless mode can use the GPU; the default headless
// shell falls back to SwiftShader. --force_high_performance_gpu picks the
// discrete GPU on dual-GPU laptops. CDP screenshots come back at CSS size
// unless the scale factor is also forced on the browser.
const browser = await chromium.launch({
  channel: "chromium",
  args: [
    "--ignore-gpu-blocklist",
    "--enable-gpu",
    "--use-angle=d3d11",
    "--force_high_performance_gpu",
    "--hide-scrollbars",
    `--force-device-scale-factor=${SCALE}`,
    "--autoplay-policy=no-user-gesture-required",
  ],
});
const context = await browser.newContext({
  viewport: VIEWPORT,
  deviceScaleFactor: SCALE,
  colorScheme: "dark",
  reducedMotion: "no-preference",
});
await context.addInitScript(() => {
  localStorage.setItem("relay-theme", "dark");
});
await context.addInitScript(installClock);
await context.addInitScript(installStage);
const page = await context.newPage();
const cdp = await context.newCDPSession(page);
page.on("pageerror", (error) => console.error("page error:", error.message));

// ---- Frame clock ----------------------------------------------------------

let frameCount = 0;
const writes = [];

/** Advances the page one frame and saves a screenshot of it. */
async function frame() {
  await page.evaluate((ms) => window.__vt.step(ms), FRAME_MS);
  const { data } = await cdp.send("Page.captureScreenshot", {
    format: "jpeg",
    quality: 95,
  });
  const file = path.join(
    framesDir,
    `${String(frameCount++).padStart(6, "0")}.jpg`
  );
  writes.push(writeFile(file, Buffer.from(data, "base64")));
  if (frameCount % 300 === 0) console.log(`${frameCount / FPS} s rendered`);
}

/** Records `ms` of page time. */
async function wait(ms) {
  for (let i = Math.round(ms / FRAME_MS); i > 0; i--) await frame();
}

/** Records frames until `ready()` holds (e.g. a navigation finished). */
async function waitFor(ready, maxMs = 5000) {
  for (let t = 0; t < maxMs && !(await ready()); t += FRAME_MS) await frame();
}

// ---- Tour helpers ---------------------------------------------------------

const mouse = { x: VIEWPORT.width * 0.62, y: VIEWPORT.height * 0.72 };

/** Glides the drawn cursor to a point, then moves the real mouse there. */
async function moveTo(x, y, duration = 700) {
  await page.evaluate(
    ([x, y, d]) => window.__showcaseGlide(x, y, d),
    [x, y, duration]
  );
  await wait(duration);
  mouse.x = x;
  mouse.y = y;
  await page.mouse.move(x, y);
}

async function center(locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error(`No box for ${locator}`);
  return [box.x + box.width / 2, box.y + box.height / 2];
}

/** Moves the cursor onto a locator and clicks it. */
async function click(locator, { duration = 700, pause = 180 } = {}) {
  await moveTo(...(await center(locator)), duration);
  await wait(pause);
  await page.mouse.down();
  await wait(90);
  await page.mouse.up();
}

async function hover(locator, duration = 700) {
  await moveTo(...(await center(locator)), duration);
}

/** Eased scroll to an absolute page offset; duration grows with distance. */
async function scrollToY(y, duration) {
  const from = await page.evaluate(() => scrollY);
  const ms = duration ?? Math.min(2600, 900 + Math.abs(y - from) * 0.45);
  await page.evaluate(([to, d]) => window.__showcaseScroll(to, d), [y, ms]);
  await wait(ms);
  // Re-send the pointer so hover state matches what is now under it.
  await page.mouse.move(mouse.x, mouse.y);
}

/** Scrolls so the element sits centered (or just under the header). */
async function scrollToEl(
  locator,
  { align = "center", offset = 0, duration } = {}
) {
  const y = await locator.evaluate(
    (el, [align, offset, header]) => {
      const rect = el.getBoundingClientRect();
      const top = scrollY + rect.top;
      const room = innerHeight - header;
      return align === "top" || rect.height > room
        ? top - header - 24 + offset
        : top - header - (room - rect.height) / 2 + offset;
    },
    [align, offset, HEADER]
  );
  await scrollToY(y, duration);
}

/** Clicks a client-side link and records until the new route has rendered. */
async function navigate(locator, pathname, duration) {
  await click(locator, { duration });
  await waitFor(() => page.evaluate((p) => location.pathname === p, pathname));
  await wait(300);
}

// ---- Tour -----------------------------------------------------------------

// Load the home page in real time, then freeze the clock at the hero's first
// frame and start recording.
await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.evaluate(
  () =>
    new Promise((resolve) => {
      const video = document.querySelector("video.hero-video");
      if (!video || video.readyState >= 3) return resolve();
      video.addEventListener("canplay", () => resolve(), { once: true });
    })
);
await page.mouse.move(mouse.x, mouse.y);
await cdp.send("Animation.enable");
await cdp.send("Animation.setPlaybackRate", { playbackRate: 0 });
await page.evaluate(async () => {
  window.__vt.enable();
  const video = document.querySelector("video.hero-video");
  if (video) {
    video.currentTime = 0;
    await new Promise((resolve) =>
      video.addEventListener("seeked", resolve, { once: true })
    );
  }
});

// Home: hero.
await wait(1800);
await hover(
  page.locator(".hero-actions").getByRole("link", { name: "Get started free" }),
  1100
);
await wait(1100);
await moveTo(VIEWPORT.width * 0.8, VIEWPORT.height * 0.7, 800);

// Launch video in the hero frame.
await scrollToEl(page.locator("video.hero-video"), { duration: 1500 });
await wait(4200);

// Feature grid.
await scrollToEl(page.locator(".feature-grid-frame"), { offset: -40 });
await wait(2400);

// Client review demo: play, jump to a comment, approve.
await scrollToEl(page.locator(".review-room-bar").first(), {
  align: "top",
  offset: -90,
});
await wait(500);
await click(page.locator(".review-video-stage").first(), { duration: 900 });
await wait(2200);
await click(page.getByRole("button", { name: /Alex Rivera/ }).first());
await wait(2000);
await click(page.locator(".review-approve").first());
await wait(1600);

// Pricing.
await scrollToEl(page.locator(".pricing-section .container"), { align: "top" });
await wait(800);
await hover(
  page
    .locator(".pricing-section")
    .getByRole("link", { name: "Get started free" })
    .first()
);
await wait(1600);

// Roadmap preview, then the closing card.
await scrollToEl(page.locator('[aria-labelledby="roadmap-preview-title"]'), {
  align: "top",
});
await wait(2200);
await scrollToEl(page.locator(".brand-cta"));
await wait(800);
await hover(
  page.locator(".brand-cta").getByRole("link", { name: "Get started free" })
);
await wait(1800);

// Features page via the header nav.
await navigate(
  page.locator(".site-nav").getByRole("link", { name: "Features" }),
  "/features",
  1000
);
await moveTo(VIEWPORT.width * 0.78, VIEWPORT.height * 0.6, 700);
await wait(1500);

// Workflow chapter: walk the four steps.
await scrollToEl(page.locator("#workflow"), { align: "top" });
await wait(1200);
const stepTabs = page.locator(
  '[aria-label="Project workflow steps"] [role="tab"]'
);
for (let i = 1; i < 4; i++) {
  await click(stepTabs.nth(i), { duration: 650 });
  await wait(2300);
}

// Delivery chapter: advance the handoff steps.
await scrollToEl(page.locator('[aria-labelledby="delivery-title"]'), {
  align: "top",
});
await wait(900);
const deliveryAction = page.locator('[class*="DeliveryDemo_actions"] button');
for (let i = 0; i < 3; i++) {
  await click(deliveryAction, { duration: i === 0 ? 900 : 400 });
  await wait(1500);
}

// Payments chapter: mark a payment as paid.
await scrollToEl(page.locator('[aria-labelledby="payments-title"]'), {
  align: "top",
});
await wait(900);
await click(page.getByRole("switch", { checked: false }).first(), {
  duration: 900,
});
await wait(2000);

// Activity chapter: filter, then look at next week.
const activity = page.locator('[aria-labelledby="activity-title"]');
await scrollToEl(activity, { align: "top" });
await wait(900);
await click(activity.getByRole("button", { name: "Review", exact: true }), {
  duration: 900,
});
await wait(1600);
await click(activity.getByRole("button", { name: "Next week" }));
await wait(1800);

// Pricing page.
await scrollToY(0, 1800);
await navigate(
  page.locator(".site-nav").getByRole("link", { name: "Pricing" }),
  "/pricing",
  900
);
await moveTo(VIEWPORT.width * 0.8, VIEWPORT.height * 0.7, 700);
await wait(1500);
await scrollToY(460, 1800);
await wait(2600);

// Back home to close on the hero.
await scrollToY(0, 1400);
await navigate(page.locator(".site-header .brand"), "/", 900);
await moveTo(VIEWPORT.width * 0.62, VIEWPORT.height * 0.72, 900);
await wait(2600);

await Promise.all(writes);
await browser.close();

// ---- Encode ---------------------------------------------------------------

console.log(`${frameCount} frames (${(frameCount / FPS).toFixed(1)} s)`);
const encode = spawnSync(
  "ffmpeg",
  [
    "-y",
    "-hide_banner",
    "-loglevel",
    "error",
    "-framerate",
    String(FPS),
    "-i",
    path.join(framesDir, "%06d.jpg"),
    "-vf",
    "format=yuv420p",
    "-c:v",
    "libx264",
    "-preset",
    "slow",
    "-crf",
    "16",
    "-tune",
    "animation",
    "-movflags",
    "+faststart",
    outFile,
  ],
  { stdio: "inherit" }
);
if (encode.status !== 0) process.exit(encode.status ?? 1);
rmSync(framesDir, { recursive: true, force: true });
console.log(`Wrote ${outFile}`);
