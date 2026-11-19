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
| `tools/build.sh`, `tools/shoot.sh` | Render, then screenshot headless at 1440 wide in parallel |

## Run it

The spike needs bun, Chrome, and HeroUI Pro installed under `internal/portal-pro/` in the main checkout.

```bash
tools/build.sh
```

```bash
HEIGHT=1400 tools/shoot.sh home.html op-handle.claim-spans.html
```

Pro's CSS is copied into `out/`, which is ignored. Nothing of Pro is committed.

To republish, build first. Then make `out/site/index.html` a fragment of `home.html`: no doctype, html, head or body
tags. Publish it to the artifact above with every other file in `out/site/` passed as `files`.

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
