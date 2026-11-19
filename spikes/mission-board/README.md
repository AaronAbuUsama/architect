# Spike: the mission board

**Status: in progress.** The data model, its derivations and the IA grill are done. The prototype waits for the
Mobbin and HeroUI MCPs and for Aaron's answers to `GRILL.md`.

## Question

Can the board that fills in the coverage grid (13 building blocks × 9 outputs) be built from HeroUI Pro's Kanban,
rendered entirely from data (no text or number on the page that isn't a field), and feel like the same product as
the accepted Goal page (`spikes/console-mock/src/mission.tsx`)?

## The data model

`src/data/types.ts` holds two layers, joined by a cell id `<block>.<output>` (for example `visibility.api`):

| Layer | Holds | Owner | Changes |
|---|---|---|---|
| **Grid** (`design/grid/grid.json`) | goal, blocks (lanes, each with an end state), outputs, cells (state, green means, why not needed, today's file:line, evidence) | 📐 the grid thread | by pull request |
| **Board** (the board's database) | per cell: the task and thread on it now, and its history of moves. Tasks and threads keep the kanban skill's schema. | 🎛 the conductor | live |

Nothing derivable is stored. `src/data/derive.ts` computes it:

| Function | Gives | Shown by |
|---|---|---|
| `join(grid, board)` | `BoardView`: lanes in order, each with its cards and `Score` | the lanes and their cards (`Kanban.Root`, `Kanban.Column`, `Kanban.Card`) |
| `stateNow` | a card's state: its latest history event's, else the grid's | which column a card sits in (`getColumn`) |
| `score` | green, partly, red, not needed, and `needed` (what green is out of) | `Kanban.ColumnCount`, the goal's KPI |
| `CardView.thread` / `hadIt` | the thread on a card now, and the threads that had it before | the card's chip, and the detail panel's "Had it before" |
| `climb` / `climbTimes` | each lane's score at each event time, from the grid's baseline on | the hill-climb chart |
| `changedSince` | moves after a time, newest first, with the state each came from | the "since" picker and the moved outlines |
| `matches` | filters by state, thread and output | the board's filter bar |

## Fixtures

- `grid.fixture.json`: the audit's grid (m1 at 56ea4b31): 117 cells, 44 green, 24 partly, 49 red. Green-means, lane
  summaries and end states are empty until `design/grid/grid.json` lands. Field visibility's file references are
  checked against `m1`.
- `board.fixture.json`: real tasks (M1.12, M1.13, M1.35, M1.36, M1.41, M1.42) and the eight real threads from the
  kanban's saved data, linked to the cells their slices cover. No history: no cell moves have been recorded yet.
- `board.illustrative.json`: the same, plus six made-up moves so the climb and "what changed" have something to
  show. It is marked `"illustrative": true`, and the prototype says so on the page whenever it uses it.

Run the checks: `node --test spikes/mission-board/src/data/derive.test.ts` (Node 26, no install).

## Found so far

- HeroUI Pro's Kanban has no swim lanes. Its parts are Root, Column, CardList and Card, and `useKanban` puts each card
  in exactly one column. So each lane is its own `Kanban.Root`, and its columns must mean one thing (`GRILL.md` Q1).
- The portal spec already makes a board's columns a thing's machine states (`design/portal.md:359`,
  `Portal.view.board({ by: Item.machine })`), which favours columns as eval states.

## Decision it supports

M3.17 (the board in the portal) and the Goal page's work view: the board's data split and its column meaning.

## Open risks

- History is only as good as the conductor's writes. With no `CardEvent`s, the climb is a single point.
- `asOf` is a commit, not a time. If the grid's states are re-read after board events, the two can disagree. Rule
  for now: the latest history event wins.
