# Spike: the mission board

**Status: prototype published; rounds 2 and 3 answered, round 1 built on its recommended answers.** The prototype is the Design artifact
https://claude.ai/artifact/SKCRqBQ9nm9FPGMJtSDzUS (version 5: Grid, Board, Components, Overview, Hill climb, Eval page).
It is built on the recommended answers of `GRILL.md` and on Aaron's answers to `GRILL-2.md` (A A) and `GRILL-3.md` (A A A), both 19 November. Mobbin references
still wait on his Mobbin sign-in.

## Question

Can the board that fills in the coverage grid (13 building blocks × 9 outputs) be built from HeroUI Pro's Kanban,
rendered entirely from data (no text or number on the page that isn't a field), and feel like the same product as
the accepted Goal page (`spikes/console-mock/src/mission.tsx`)?

## The data model

Two layers, joined by a cell id `<block>.<output>` (for example `visibility.api`):

| Layer | Holds | Owner | Changes |
|---|---|---|---|
| **Grid**: `design/grid/types.ts` and `grid.json` (PR #72), copied into `src/data/grid/` until it merges | goal (title, summary, write-up, done when), blocks (lanes, each with an end state and its proof), outputs (tier, depends on), cells (state, today's grade, file:line and note, green means, evidence, owner slice, not-needed proposal, Aaron's question), the end-to-end story, and Aaron's questions | 📐 the grid thread | by pull request |
| **Board**: `src/data/types.ts` | per cell: the task and thread on it now, and its history of moves. Tasks and threads keep the kanban skill's schema. | 🎛 the conductor | live |

A cell's state is green, built, partly, red or not needed. Built means the code carries it but no verdict has been
recorded yet. A card's state is its latest history event's, else the grid's.

Nothing derivable is stored. `src/data/derive.ts` computes it:

| Function | Gives | Shown by |
|---|---|---|
| `join(grid, board)` | `BoardView`: lanes in hill-climb order, each with its cards and `Score` | the lanes and their cards (`Kanban.Root`, `Kanban.Column`, `Kanban.Card`) |
| `stateNow` | a card's state | which column a card sits in (`useKanban`'s `getColumn`) |
| `score` | green, built, partly, red, not needed, and `needed` (what green is out of) | `Kanban.ColumnCount`, the goal's KPIs |
| `CardView.thread` / `hadIt` | the thread on a card now, and the threads that had it before | the card's chip, and the detail panel's "Had it before" |
| `CardView.waitsOn` | the outputs this card depends on that aren't green in its lane (from `Output.dependsOn`) | "waits on Docs, Telemetry" on the card |
| `CardView.question` | Aaron's open question that decides the card | a "Q1" chip, linking to the question |
| `climb` / `climbTimes` | each lane's score at each event time, from the grid's baseline on | the hill-climb chart |
| `changedSince` | moves after a time, newest first, with the state each came from | the "since" picker and the moved outlines |
| `matches` | filters by state, thread and output | the board's filter bar |
| `scoreAt` | the whole grid's score at one point of the climb | the KPI trend ("3 since the grid") |
| `CardView.notes` | the card's notes and whether the grid was regraded since (`CardWork.notes`, optional, new) | `PageNotes` |

## The components

Every part is a component in `src/components/<Name>/` that takes data shaped by `derive.ts` and never reads the
fixtures. Each has stories (`<Name>.stories.tsx`, Storybook's CSF) for its real states, taken from the fixtures by
`src/stories/fixtures.ts`. The composed page (`src/app/page.tsx`) uses the same components, so the stories and the
board can't drift.

| Component | Takes | Stories |
|---|---|---|
| `OutputCard` | `CardView`, the block's name, what holds it | red, partly, built, green, proposed grey, held by a dependency, with history |
| `ColumnHeader` | a `Column` and its count | by state (red, built), by output, by stage |
| `Lane` | a `LaneView`, the outputs, the columns | full, empty (red only), mostly red, with green, by output, by stage |
| `LaneEndState` | a `LaneView` | first, last, visibility |
| `CardDetail` | `CardView`, `LaneView`, `BoardView`, layout `page` or `panel` | red, built, proposed grey with Aaron's question, waits on others, with history |
| `EvalPage` (stories only) | `CardDetail` as a full page: a Linear issue with a properties rail | with history, handed between agents, as graded |
| `Activity` | a card, the board's tasks, threads and repo | only the grading, two moves with PR links, handed between agents |
| `CoverageMatrix` | lanes and outputs, what moved | as graded, after eight moves |
| `ClimbChart` | `LaneClimb[]` | only the baseline, climbing |
| `ChangedList` | `Change[]` and the lanes | nothing moved, eight moves |
| `GoalScore` | `Score`, and the score then | as graded, with change |
| `GoalOverview` | `BoardView` | the goal as written: score first, then the outputs by tier, the story typed out, its commands; Aaron's calls in a rail |
| `FalloutDiagram` | lanes and outputs | as graded, after eight moves |
| `StoryReplay` | the story's steps | the eight steps, played fast |
| `PageNotes` | notes markdown, stale | empty, written, stale |

The card follows HeroUI Pro's own project-board card (the Kanban docs' Usage and Project Board examples): title,
two-line description (green means), chips (state, slice, stage, question), a progress bar for evidence passing (left out
while no eval has run: every `passing` is null today), avatars for the thread now and before, and evidence and history
counts. Pages are Notion-like pages of blocks (`src/components/shared/blocks.tsx`: head, properties, headings, text,
callouts, numbered list) with HeroUI parts between them; notes are the experimental portal's tiptap note editor
(`internal/portal-pro/src/modules/note-editor` on `experimental/portal-pro`). Widget frames hold only KPIs and charts.

The eval page is laid out as a Linear issue (`GRILL-3.md`): green means, today, waits on, evidence, then Activity (each
move with the agent's face, its slice and PR link, its evidence, ending in the grading) and Notes; a right rail of
properties (state, role, block, output, slice, stage, PR, who is on it now and before). An agent's face is the kind's
mark (person, Claude, Codex, subagent) with the thread's emoji as a badge. In the side panel the rail folds under the
title. On the Hill climb, a click on any square or move opens that card's eval page beside it.

The Overview puts the score first. Below it: the outputs by tier as a diagram (each output's 13 squares are the building
blocks, coloured by state; a click goes to the grid), the end-to-end story as a terminal that types each command and
what it proves (CSS only, with a Replay button), the story's commands as a code block (shiki core with two grammars;
Pro's `CodeBlock` bundles all of shiki, 9.7 MB), then the write-up. Done when, Aaron's open questions and the proposed
slice sit in a rail.

Run it:

```bash
pnpm install          # its own workspace; HeroUI Pro installs only on a machine signed in to it; CI never installs it
pnpm test             # the derivations (Node 26)
pnpm storybook        # Storybook on :6006
tools/build.sh --shoot state panel grid visibility.api   # the browser bundle, a preview page and a screenshot
```

The Design artifact's **Components** artboard is a story browser over the same story files (`src/browser/`), so Aaron
can click through every part and state without running anything.

## Fixtures

- `src/data/grid/`: the grid thread's files at 96b8ba27 (the example app is Plugged In). 117 cells: 52 built, 32 partly, 33 red, 0 green. A cell's role (carries, absence, not needed) comes from `cellRole(block, output)`, never stored; a card shows grey only when its role is not needed and Aaron's Q2 is answered A, and "proposed not needed" until then.
- `board.fixture.json`: real tasks and the eight real threads from the kanban's saved data. Each cell whose grid
  `owner` names a slice on the board is linked to it (89 cells). There's no history, because no cell moves have been
  recorded yet.
- `board.illustrative.json`: the same, plus eight made-up moves so the climb and "what changed" have something to
  show. It is marked `"illustrative": true`, and the page says so whenever it uses it.

## Found so far

- HeroUI Pro's Kanban has no swim lanes (its types, and its docs read through the HeroUI MCP: the Notion and Project
  board examples are one Kanban with status columns). Its parts are Root, Column, CardList and Card, and `useKanban` puts each card
  in exactly one column. So each lane is its own `Kanban.Root`, and its columns must mean one thing (`GRILL.md` Q1).
- The portal spec already makes a board's columns a thing's machine states (`design/portal.md:359`,
  `Portal.view.board({ by: Item.machine })`), which favours columns as eval states.
- Aaron, 19 November, on version 3: 13 stacked Kanbans are "not the lanes"; the grid is what we build against. So
  version 4 adds the Grid tab (the 13×9 map, a row opens its lane, a square its eval page) and `GRILL-2.md` asks
  whether that is the main surface.
- A Design artboard runs React 18; the bundle mounts its own React 19 root (`window.MissionBoard.mount`), and the
  artboard's tweaks are the switches.
- HeroUI's styles package exports only Tailwind sources, so Storybook imports the built CSS by path.

## Decision it supports

M3.17 (the board in the portal) and the Goal page's work view: the board's data split and its column meaning.

## Open risks

- The artifact could not be checked inside claude.ai from this session (the browser pane isn't signed in); the same
  bundle was checked in a local preview and in Storybook.
- `CardWork.notes` (`markdown`, and `about`: the grid `asOf` it was written against, so a regrade marks it stale) and `Board.repo` (for PR links) are new optional fields on the conductor's half of the schema; saving notes is not wired.

- History is only as good as the conductor's writes. With no `CardEvent`s, the climb is a single point.
- `asOf` is a commit, not a time. If the grid's states are re-read after board events, the two can disagree. Rule
  for now: the latest history event wins.
