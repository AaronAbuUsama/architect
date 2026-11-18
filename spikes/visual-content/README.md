# Spike: visual-content

**Question.** Which toolchain lets an agent make animated docs visuals (MP4, GIF, and hand-drawn diagrams whose paths
draw themselves) from plain text in the repo, headless, locally, reliably and small?

**Answer.** Plain SVG scenes, written as a pure function of time, rendered frame by frame by Playwright's headless
Chromium and encoded by ffmpeg, with rough.js for the hand-drawn look. About 350 lines of kit and renderer, two
exactly pinned npm dependencies (Playwright, rough.js) plus three font packages, byte-identical output on every run, and every GIF well under 2 MB. Remotion
renders as well but costs a 920 MB install, a downloaded browser of its own and a licence with a company tier; Manim
renders well but brings a Python toolchain and lays text out poorly for diagrams.

## What was tried

1. **SVG + Playwright + ffmpeg (chosen).** `render.mjs` serves this folder on `127.0.0.1` (a random port, closed at
   the end), opens `lib/page.html?scene=<name>&theme=<dark|light>&render`, and for each frame calls
   `window.__stage.seek(t)` and takes a screenshot. ffmpeg makes the MP4 (H.264, yuv420p, faststart) and the GIF
   (one palette, `diff_mode=rectangle`) from the same PNG frames. A scene (`scenes/<name>.js`) builds its SVG once and
   returns `draw(t)`, which sets every element from `t` alone. rough.js (seeded) gives the hand-drawn strokes; paths
   draw themselves with `stroke-dashoffset`.
2. **Remotion 4.0.542** (`tried/remotion/`): the same waterfall idea as a React composition, `npx remotion render`.
3. **Manim 0.22.0 Community** (`tried/manim/`), through `uv run --with manim==0.22.0`: the same waterfall as a Python
   scene.
4. **Not tried, by reading only:** Motion Canvas renders from its editor running in a browser; a headless command line
   render needs a third-party plugin, so an agent would be driving a GUI. Excalidraw is an app whose look is rough.js
   plus a hand font, which option 1 already has as text. Playwright's own `recordVideo` records in real time, so
   frames drop and timing varies run to run; stepping the time ourselves avoids both.

## What was found

1. **Deterministic.** Rendering `trace-waterfall` twice gave a byte-identical MP4 and poster (`cmp` silent, same MD5).
   An agent can re-render without noise in the diff, and a reviewer can trust that the committed render is the source.
2. **An agent can check its own work.** `--still <seconds>` writes one frame as a PNG; reading those PNGs is how
   overlaps were found and fixed here (the token covering box labels, a refusal line crossing the step bars, the
   "answer" label on the span frame) before any full render.
3. **Drawn from the code, and the code differs from the brief in one place.** The brief's commit has "state plus
   journal event plus outbox". On `main` (`packages/language-effect/src/modules/handler/service.ts`, then `target-effect`;
   `records/types.ts`) a commit holds the writes, the journal entries and, for an idempotent operation, the request's
   answer; there is no outbox anywhere in `packages/`. The lifecycle scene draws what is there: state, journal event,
   request answer. Two more details the code adds and the scene shows: `NotAllowed` is decided before the operation's
   span opens, and a version conflict reruns the whole attempt (64 tries).
4. **The waterfall is real data.** It plays the `allowance.grant` trace that the `local-trace-viewer` spike read back
   from Tempo (`spikes/local-trace-viewer/evidence/`): six spans, the commit as one `BATCH` of the allowance row and
   its `_journal` row. workerd's clock moves only on I/O, so three spans read 0 ms; the scene draws them as markers and
   says why, rather than inventing times.
5. **Refusal is amber, never red.** O1 ends a refused span ok; only a defect is an error. The palette carries that,
   and the skill makes it a rule.
6. **Remotion works but is heavy.** First render 33 s (bundling, and a 100 MB Chrome headless shell downloaded from
   remotion.media), then 4.4 s for 120 frames at 960 by 540. `node_modules` is 921 MB against 28 MB here. Its licence
   is free for individuals and companies of up to three people; a larger for-profit company needs a paid company
   licence. Hand-drawn would still need rough.js on top.
7. **Manim works but fights diagrams.** The first run took 3 min 36 s (installing numpy, pycairo built from source,
   manimpango); after that a 3.4 s clip at 1080p60 rendered in 5.2 s, 126 KB. Text uses system fonts (Menlo here) and
   is placed in scene units around a centre, so the labels came out clipped at the left edge on the first try. Good
   for mathematical motion; poor for boxes, labels and code names.

## Measurements

All on this Mac (Apple silicon), Playwright 1.65.1, ffmpeg 8.0, `--scale 2` (MP4 1920 by 1080, GIF 960 wide at 15 fps).

| Scene | Length | Frames | MP4 | GIF | Poster PNG |
| --- | --- | --- | --- | --- | --- |
| handler-lifecycle (dark / light) | 21 s | 630 | 878 / 896 KB | 616 / 563 KB | 137 / 136 KB |
| journey-revoke-then-spend | 18 s | 540 | 550 / 561 KB | 198 / 188 KB | 249 / 248 KB |
| trace-waterfall | 12.5 s | 375 | 451 / 470 KB | 374 / 345 KB | 112 / 112 KB |

- All six renders (`node render.mjs all`): 4 min 9 s one at a time, 2 min 39 s with three pages at once (`--jobs 3`,
  the default). Capture is about 70 ms a frame at scale 2 and 33 ms at scale 1, close to Remotion's 36 ms a frame at
  scale 1. Encoding is 3 to 5 s a file.
- Comparison clip (the same short waterfall idea): Remotion 23 KB MP4 for 4 s; Manim 126 KB for 3.4 s at 60 fps.
- Install: this folder 11 s and 28 MB, plus Playwright's headless shell (one download, about a minute).

## How to run it

```bash
cd spikes/visual-content
pnpm install --ignore-workspace
npx playwright install chromium-headless-shell
node render.mjs all                      # or one scene by name; --still <s> for one frame; --serve to watch it play
```

Needs `ffmpeg` on the PATH (`brew install ffmpeg`). Sources are `scenes/*.js`, renders are `renders/`, the kit is
`lib/`. How to write a scene, the size limits and the style guide are in `.agents/skills/visuals/SKILL.md`.

## The two kinds (added after the first review)

Aaron asked for the waterfall and the hand-drawn journey styles to be codified, so they are now kinds: a scene is
data, and the style, layout and timing live in one place.

- `lib/kinds/waterfall.js`, skill `trace-waterfall`. It takes spans and words and derives every time from the spans.
  `tools/trace-to-waterfall.mjs` writes the scene from a Tempo or OTLP trace file. Run on
  `allowance-grant.tempo-trace.json`, it produces exactly the spans that were written by hand. The scene re-expressed
  as data rendered a **byte-identical MP4**, so the kind is the same style, not an imitation of it.
- `lib/kinds/journey.js` with `lib/kinds/sketch-geometry.js`, skill `machine-journey`. It takes states (centres
  only), moves (from, to, bend), the cast and the steps, and works out arrows, loops, heads, labels, refusal crosses,
  doors, the card and the timing. The look is the same; arrow curves and the note placement now come from rules
  rather than hand-placed coordinates, so the frames differ slightly from the first render.
- `--beats` renders a still at each moment a kind declares (each span in, each step done), so an agent checks every
  step without guessing times. A scene that fails to build (for example, one with a `TODO` left in it) stops the
  render at once with the reason.

## The decision it supports

Docs visuals are SVG scenes in the repo, rendered by `render.mjs`; the `visuals` skill is how an agent makes one.
Animate a route or a sequence, keep a still for a shape. The docs site shows the MP4 (with the PNG as poster, the
theme chosen by `prefers-color-scheme`) and keeps the GIF for places that can't play video.

## Open risks

- **It lives in a spike.** The skill points at `spikes/visual-content/`, which AGENTS.md treats as throwaway. Once
  Aaron likes the look, move `render.mjs`, `lib/` and `scenes/` to a real home (`tools/visuals/`, or beside the docs
  site when it exists) and update the skill's paths.
- **Renders are committed binaries** (7.2 MB for these three scenes in two themes). Fine for a handful; at dozens,
  render in CI or keep them out of git.
- **ffmpeg comes from the machine,** not from the lockfile (8.0 here). A different ffmpeg can change bytes, though not
  the look; pin it (or use the ffmpeg Playwright downloads) if byte-identical renders across machines matter.
- **Scenes drift from the code.** Each scene names the files it draws from and the date; nothing checks it yet. A
  later step could have prove export a trace as JSON that the waterfall scene reads directly.
- **The look is unreviewed.** Aaron reviews the three renders before this is merged.
- **Remotion and Manim trials are kept small** (`tried/`) for the record; neither is used by the docs.
