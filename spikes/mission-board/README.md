# Spike: the mission board

**Status: in progress.** The data model, its derivations and the IA grill draft are done. The prototype waits on the
Mobbin look (its MCP needs Aaron's sign-in) and on Aaron's answers to `GRILL.md`.

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

## Fixtures

- `src/data/grid/`: the grid thread's files at fa911f30. 117 cells: 48 built, 31 partly, 38 red, 0 green.
- `board.fixture.json`: real tasks and the eight real threads from the kanban's saved data. Each cell whose grid
  `owner` names a slice on the board is linked to it (89 cells). There's no history, because no cell moves have been
  recorded yet.
- `board.illustrative.json`: the same, plus eight made-up moves so the climb and "what changed" have something to
  show. It is marked `"illustrative": true`, and the page says so whenever it uses it.

Run the checks: `node --test spikes/mission-board/src/data/derive.test.ts` (Node 26, no install).

## Found so far

- HeroUI Pro's Kanban has no swim lanes (its types, and its docs read through the HeroUI MCP: the Notion and Project
  board examples are one Kanban with status columns). Its parts are Root, Column, CardList and Card, and `useKanban` puts each card
  in exactly one column. So each lane is its own `Kanban.Root`, and its columns must mean one thing (`GRILL.md` Q1).
- The portal spec already makes a board's columns a thing's machine states (`design/portal.md:359`,
  `Portal.view.board({ by: Item.machine })`), which favours columns as eval states.

## Decision it supports

M3.17 (the board in the portal) and the Goal page's work view: the board's data split and its column meaning.

## Open risks

- History is only as good as the conductor's writes. With no `CardEvent`s, the climb is a single point.
- `asOf` is a commit, not a time. If the grid's states are re-read after board events, the two can disagree. Rule
  for now: the latest history event wins.
