# Spike: the whole portal site, on Plugged In

## Question

What does the Orthograph portal look like as one site you can click through? That means every thing, every operation
with its five tabs (Contract, Metrics with its calls table, Proof, Docs, Notes), every primitive (machines, refusal codes, access, events, values), environments, plugins, stores,
journeys, worlds, a blank operation, and the Monitor pages (Issues and Alerts, decided in K18).

It draws from Plugged In's model, with HeroUI Pro, on Aaron's round 4 picks (Q1 B + C, Q2 B, Q3 B, Q6 A).

## Tried

A static render of 79 pages from one model, with one shell: sidebar tree, top bar, scoped live rail.

- The pages are React server-rendered with bun, using HeroUI and HeroUI Pro components.
- Pro's `BarChart`, `Command` and `HoverCard` render nothing on the server, so one small browser script mounts them; the
  rest of each page is server HTML. A journey step's preview opens on load with `#preview-<n>` in the URL.
- It is published as a click-through artifact: https://claude.ai/artifact/NzDgHFzQSk8yvX8cLNqUKj (private).

| Source | What it holds |
|---|---|
| `src/model.json` | Codex's links/stage-1 model, cut to profile, link, handle, person and session |
| `src/model.ts` | Types, lookups and page names |
| `src/overlay.ts` | What that model lacks, filled in by hand: plugin mounts and groups, role rules, secret fields, the store, notes, the blank `link.pin` |
| `src/journeys.ts` | Three journeys and two worlds, written from Plugged In's journey files |
| `src/live.ts`, `src/calls.ts`, `src/trace.ts` | Fixed sample telemetry, each operation's calls, and one trace per call |
| `src/shell.tsx`, `src/rail.tsx`, `src/ui.tsx` | The frame and shared blocks |
| `src/pages/*.tsx` | One file per page family |
| `src/routes.tsx`, `src/render.tsx` | Every page, written to `out/site/` |
| `src/pages/graphs.tsx` | The Graphs page: `spikes/react-flow-graphs`'s `Graph` on the map, both machines, worlds and journeys, and two sketches |
| `src/opt.tsx`, `src/rail-nav.tsx` | Round 4's picks: the icon rail with ⌘K first (Q1 B + C), a page per environment (Q2 B), one Plugins and stores page (Q3 B), blanks greyed in the tree (Q6 A). Round 3's Options page, which drew each question three ways, is gone |
| `src/flow.tsx` | Q4, decided: a journey as a sequence diagram (cast lanes, step columns, one verdict row per environment) and the worlds as a tree |
| `src/ref-live.tsx` | Q5, decided: each reference row's rate and trend, and each page's recent spans, each opening its trace (no rows for calls refused at the door: they have no span) |
| `src/kit/calls-table.tsx`, `src/kit/trace-waterfall.tsx` | Round 4: an operation's calls in Pro's `DataGrid`, filtered by environment, caller kind, outcome, request key, over budget and time; a call opens its trace in a `Drawer`. Replaces the Spans tab |
| `src/kit/` | Our components where HeroUI Pro has nothing that fits (CallsMeter, CallsBars, BudgetMeter, EnvironmentPill, VerdictMatrix, KeyPath and Move, StepCard), each with Storybook 8 CSF stories (`*.stories.tsx`). The Components page renders every story |
| `src/client.tsx` | The one browser script: mounts Pro's `BarChart`, `Command` and `HoverCard`, and the environment compare's `Segment`, which render nothing on the server ("islands", `src/kit/island.tsx`) |
| `src/pages/places.tsx`, `src/pages/env-compare.tsx` | A page per environment (summary card, declared fields, proof tallied per column), the compare page, and Plugins and stores |
| `tools/build.sh`, `tools/shoot.sh` | Render and bundle `islands.js`, then screenshot headless at 1440 wide in parallel (with a virtual time budget, so the islands mount first) |
| `tools/publish-prep.sh` | Writes `out/site/index.html` (the artifact's main page, a fragment of `home.html`) and prints the `files` map |

## Run it

The spike needs bun, Chrome, and HeroUI Pro installed under `internal/portal-pro/` in the main checkout.

```bash
tools/build.sh
```

```bash
HEIGHT=1400 tools/shoot.sh home.html op-handle.claim-metrics.html
```

Pro's CSS is copied into `out/`, which is ignored. Nothing of Pro is committed.

To republish:

1. Build.
2. Run `tools/publish-prep.sh`.
3. Publish `out/site/index.html` to the artifact above, with `root` set to `out/site` and every other file as `files`.

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

- The round 3 information architecture (`design/briefs/portal-round-3.md`, Q1 to Q6), as Aaron settled it in round 4.
- The delta audit in `design/portal.md`, "What the drawing needs that the model or telemetry doesn't give yet".
- K18: monitoring falls out of the model.

- Round 3 review (Aaron, 19 November): the library wasn't used. The component inventory in `design/portal.md` maps every
  data shape to a Pro component or one of ours; no data is styled text any more.

## Open risks

- **Sample data.** Every number, trace and verdict is sample data. The real ones need the M1.13 wire.
- **Codex's links/stage-1 model.** It still carries acme leftovers, and handle is the app's own thing there, not a
  mounted plugin.
- **Phone width.** The published pages are desktop only. The portal frame was never drawn at phone width.

## G5: where a rule shows (drawn 19 November 2026)

The four questions in `design/decisions/G5-invariants-ui-grill.md` (on `designer/g5-invariants`), drawn as round 4's
portal so Aaron can compare them as screens: the handle's page and `handle.claim`'s Contract tab, with the same sidebar
tree, top bar, Widgets and live rail. One artboard per option; only what the question asks changes between them.

- Canvas: https://claude.ai/artifact/Payk7yiKi2fVBS9jkqXBVe (a claude.ai Design canvas, private), four rows, one per
  question, the recommended option first in each row with a note giving the question and the reason.
- Source: `src/g5/` (`data.ts` the two rules, Plugged In's real codes and exits from `goal/stage-1`, and the words each
  Q2 option writes; `thing.tsx`, `rule.tsx`, `claim.tsx` the pages; `boards.tsx` the rows; `render.tsx` the canvas
  files). `opt.tsx` and `shell.tsx` gained two optional hooks: a `strip` in place of the round strip, and `treeRows`
  under a thing in the tree. Round 4's pages render as before.
- `tools/g5.sh` renders to `out/g5/project/` and screenshots each artboard at 1440 wide into `out/g5/shots/`.
- `g5-canvas/project/` is the canvas as published, without HeroUI's and Pro's CSS: those were copied onto the canvas,
  server side, from the round-4 artifact, and are never committed.

To republish, run `tools/g5.sh`, then publish to the canvas with `root` set to `out/g5`, `file_path` the changed
artboard, and `files` the others that changed; send `project/canvas.json` only when the layout changes.

Counts on the artboards are illustrative. The site's `model.json` (links/stage 1) predates Plugged In's exits, so the
G5 pages take codes and exits from `src/g5/data.ts` instead.
