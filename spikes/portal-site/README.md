# Spike: the whole portal site, on Plugged In

## Question

What does the Orthograph portal look like as one site you can click through? That means every thing, every operation
with its six tabs, every primitive (machines, refusal codes, access, events, values), environments, plugins, stores,
journeys, worlds, a blank operation, and the proposed Monitor pages (Issues and Alerts).

It draws from Plugged In's model, with HeroUI Pro, on round 3's recommended answers.

## Tried

A static render of 87 pages from one model, with one shell: sidebar tree, top bar, scoped live rail.

- The pages are React server-rendered with bun, using HeroUI and HeroUI Pro components.
- The charts are hand-drawn SVG, because recharts renders empty under server rendering.
- It is published as a click-through artifact: https://claude.ai/artifact/NzDgHFzQSk8yvX8cLNqUKj (private).

| Source | What it holds |
|---|---|
| `src/model.json` | Codex's links/stage-1 model, cut to profile, link, handle, person and session |
| `src/model.ts` | Types, lookups and page names |
| `src/overlay.ts` | What that model lacks, filled in by hand: plugin mounts and groups, role rules, secret fields, the store, notes, the blank `link.pin` |
| `src/journeys.ts` | Three journeys and two worlds, written from Plugged In's journey files |
| `src/live.ts`, `src/trace.ts` | Fixed sample telemetry and traces |
| `src/shell.tsx`, `src/rail.tsx`, `src/ui.tsx` | The frame and shared blocks |
| `src/pages/*.tsx` | One file per page family |
| `src/routes.tsx`, `src/render.tsx` | Every page, written to `out/site/` |
| `src/opt.tsx`, `src/rail-nav.tsx`, `src/pages/options.tsx` | Round 3's open questions (Q1, Q2, Q3, Q6) drawn as A, B and C. A page inside `WithOpt` takes one question's B or C. The Options page shows the twelve screens side by side, with the Mobbin screens each draws from |
| `src/flow.tsx` | Q4, decided: a journey as a sequence diagram (cast lanes, step columns, one verdict row per environment) and the worlds as a tree |
| `src/ref-live.tsx` | Q5, decided: each reference row's rate and trend, and each page's recent spans, each opening its trace |
| `tools/build.sh`, `tools/shoot.sh` | Render, then screenshot headless at 1440 wide in parallel |
| `tools/publish-prep.sh` | Writes `out/site/index.html` (the artifact's main page, a fragment of `options.html`) and prints the `files` map |

## Run it

The spike needs bun, Chrome, and HeroUI Pro installed under `internal/portal-pro/` in the main checkout.

```bash
tools/build.sh
```

```bash
HEIGHT=1400 tools/shoot.sh home.html op-handle.claim-spans.html
```

Pro's CSS is copied into `out/`, which is ignored. Nothing of Pro is committed.

To republish:

1. Build.
2. Shoot the twelve option screens at `HEIGHT=1000` and save them as `out/site/opt/<name>.jpg`, 1000 wide.
3. Run `tools/publish-prep.sh`.
4. Publish `out/site/index.html` to the artifact above, with `root` set to `out/site` and every other file as `files`.

## Found

- The model carries almost every page. The gaps are the parts the stage-1 model predates: mounts, role rules, secret
  fields, stores, notes and blanks. On `m1` those are in the model (see `design/portal.md`, "The model, field by
  field").
- One shell serves every page. The live rail scopes to the page: an operation, a thing, a plugin, a journey or
  everything.
- A machine's state distribution conflicts with round 2 Q4 (no populations). The drawing shows a callout instead, and
  K18 Q3 asks about it.
- Alerts and issues fall out of the model with nothing configured. See `design/research/monitoring.md` and
  `design/decisions/K18-monitoring-falls-out.md`.

## The decision it supports

- The round 3 information architecture (`design/briefs/portal-round-3.md`, Q1 to Q6).
- K18: monitoring falls out of the model.

## Open risks

- **Sample data.** Every number, trace and verdict is sample data. The real ones need the M1.13 wire.
- **Codex's links/stage-1 model.** It still carries acme leftovers, and handle is the app's own thing there, not a
  mounted plugin.
- **Phone width.** The published pages are desktop only. The portal frame was never drawn at phone width.
