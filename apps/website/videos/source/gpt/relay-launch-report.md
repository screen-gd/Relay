# Relay launch film

Output: `C:/Users/Administrator/my-video/out/relay-launch.mp4`

54.866667 seconds, 1,646 frames, 1920 x 1080, 30 fps, H.264 with stereo AAC at 48 kHz. All product visuals, cursor interactions, title graphics and the fictional client film are built in React and SVG. No existing video was used as a reference or as footage.

## Beat sheet

Bars are numbered from 1 in the final film. One bar is four beats at the measured 104.999 BPM. Scene frame boundaries use the global rounded grid. Each outgoing scene extends 16 frames beyond its next bar line for the custom TransitionSeries presentation.

| Section        | Bars          | Time          | Key moments                                                                                                                                                                            |
| -------------- | ------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Intro          | 1-3, 3 bars   | 0.00-6.87 s   | Two-line setup; six pieces of the week converge into the Relay mark; workspace line.                                                                                                   |
| Dashboard      | 4-6, 3 bars   | 6.87-13.70 s  | Metrics settle, project ledger, Quick create at frame 394.                                                                                                                             |
| New project    | 7-11, 5 bars  | 13.70-25.13 s | Type Summer launch film; select Aperture Coffee at 600; choose Relay Default Workflow at 669; create at 703; new row holds.                                                            |
| Projects board | 12-14, 3 bars | 25.13-32.00 s | Grab Summer launch film at 857; drop into Client Review at 891.                                                                                                                        |
| Client review  | 15-19, 5 bars | 32.00-43.43 s | Linked video plays; timestamped comments appear; Maya types and adds a comment at 1200; editor records Approved at 1286.                                                               |
| Money          | 20-22, 3 bars | 43.43-50.30 s | Totals count up; open Campaign cutdowns at 1406; mark paid through the project's payment switch at 1440; return to totals of $14,200 Earned, $12,950 Collected and $1,250 Outstanding. |
| Outro          | 23-24, 2 bars | 50.30-54.87 s | Relay lockup, Manage editing projects, Get started free click at 1594, workrelay.dev, current Free plan and trial line.                                                                |

The dashboard's project-list push lands on the first music lift. Workflow selection, the board drop and payment use the stronger source bars 11, 15 and 23, numbered from zero in the source analysis. Quiet click, switch and whoosh effects support the corresponding actions. Music fades in over eight frames and fades out over the last bar.

## Audio and license

Music: **Close Up** by **Michael Ramir C.**, Mixkit.

- [Official track listing](https://mixkit.co/free-stock-music/corporate-music/)
- [Mixkit Stock Music Free License](https://mixkit.co/license/modal/musicFree/)
- [Original track asset](https://assets.mixkit.co/music/1167/1167.mp3)

The license permits commercial web and social marketing videos and online ads, including modification and synchronization. TV/radio broadcasts, games and physical music distribution are excluded. The retrieved license is saved in `public/audio/mixkit-license.html`, with details in `public/audio/LICENSE.md`.

Effects use Remotion's official free mouse-click, switch and whoosh WAV assets. Music and effects are saved in `public/audio/`.

## Timing verification

The full source track was decoded and analyzed for tempo, bass onset phase and RMS loudness per bar. The music is trimmed at source frame 142, near the downbeat at 4.720167 seconds.

The rendered MP4 was decoded and analyzed again. Its short mixed-audio onset fit estimated 105.023 BPM and selected a different transient phase. To resolve that ambiguity, four separate two-second windows at 8, 20, 36 and 48 seconds were matched directly against the decoded source waveform. Correlations were 0.9973-0.9987. All four measured the same source offset, 4.708299 seconds, with no measurable drift. This locates the original measured beat grid in the actual encoded soundtrack, including its codec timing offset.

- First encoded downbeat: 0.011868 s, within one frame of frame zero.
- Maximum section-cut error: **0.788524 frame**.
- Maximum timed-action error: **0.796524 frame**.
- Encoded file format, frame count and duration passed assertions.
- Full video and audio decode completed with no errors.
- `npx tsc --noEmit` and `npx eslint remotion` passed with no errors.
- Full-size QA stills were rendered from the same bundle used for the final export. Titles, entrances, interactions, highlights and transition midpoints were inspected; dialog spacing, overlapping output labels and camera framing were corrected. Temporary stills were removed.

Evidence is retained in `beat-sheet.json`, `source-audio-analysis.json`, `output-audio-analysis.json`, `audio-offset-verification.json` and `beat-verification.json`.

## Current feature boundaries

The app repo and pricing FAQ were the source of truth. File uploads, R2 storage and purchasing Creator or Team were left out because they are in development or upcoming.

The current public portal supports timestamped comments but has no client Approve button. The film shows the client posting feedback, followed by the editor setting the existing output review state to Approved. Client payment uses the current project's Overview switch, rather than an invented Reports payment button.

Reports are implemented and available in Local Mode or with advanced-report entitlements, including the Creator trial. The film uses the requested Collected and Outstanding wording from the app overview; the current Reports component labels those totals Paid and Unpaid. UI and sample values are recreated for readable film framing, not a screen recording. The project created, dragged and reviewed is consistently Summer launch film for Aperture Coffee, due May 5, valued at $1,800.

Closing offer copied from the marketing homepage: “Free plan. 7-day Creator trial, no card needed.”

## Skills and reproduction

Skills used: remotion-best-practices, motion-design, design-motion-principles, apple-design, video, unslop and ask-matt. Ponytail full guidance was active.

Run from `C:/Users/Administrator/my-video`:

```powershell
node scripts/render-launch.mjs stills
node scripts/render-launch.mjs render
node scripts/analyze-audio.mjs out/relay-launch.mp4 out/output-audio-analysis.json
node scripts/measure-audio-offset.mjs
node scripts/verify-launch.mjs
```

No browser, Remotion Studio or live app test was opened. This verifies the authored film and encoded media, not a running production deployment.
