# Videos

| File                           | Made by                                             | Length |
| ------------------------------ | --------------------------------------------------- | ------ |
| `relay-launch.mp4`             | Claude, the approved final cut                      | 52.4 s |
| `relay-launch-gpt.mp4`         | GPT, alternate cut                                  | 54.9 s |
| `relay-site-showcase-dark.mp4` | Claude, dark-mode walkthrough of the marketing site | 92.7 s |

The launch videos are 1920×1080, 30 fps, H.264 with AAC audio, built with Remotion 4.0.534. The site showcase is 1920×1080, 60 fps, H.264, silent.

## Sources

- `source/claude/`: code for `relay-launch.mp4`.
- `source/gpt/`: code for `relay-launch-gpt.mp4`, plus its report and timing checks.
- `source/showcase/`: the Playwright script that records `relay-site-showcase-dark.mp4`.

The Remotion sources are a standalone project with their own dependencies and
tsconfig, so `apps/website/tsconfig.json` excludes `videos`. Without
that exclusion `next build` type checks them, cannot resolve `remotion` and
`@remotion/*`, and fails the whole build.

The launch video sources are copies of the working Remotion project at `C:\Users\Administrator\my-video`. To render one, copy its `remotion/`, `scripts/` and `public/` folders into a Remotion project with the dependencies in `source/claude/package.json`, then run:

```bash
npx remotion render remotion/index.ts RelayLaunch out/relay-launch.mp4 --codec=h264 --crf=16
```

## Site showcase

`source/showcase/record-site.mjs` tours the marketing site in dark mode: the home page (hero video, feature grid, client review demo, pricing, roadmap), the features page demos, and the pricing page. It renders on a virtual clock, one screenshot per 1/60 s of page time, so the output stays smooth however slowly the machine paints. To re-record, build and serve the site, then run the script from the repo root (needs ffmpeg on PATH):

```bash
cd website && npx next build --webpack && npx next start -p 3210
node videos/source/showcase/record-site.mjs http://localhost:3210 videos/relay-site-showcase-dark.mp4
```

Set `GITHUB_TOKEN` when starting the site so the roadmap section has data. A run takes about 25 minutes.

## Music

"Close Up" by Michael Ramir C., from Mixkit, under the Mixkit Stock Music Free License (`source/*/public/audio/LICENSE.md`). The sound effects are Remotion's free sound assets.
