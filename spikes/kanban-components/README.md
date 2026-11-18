# Spike: the Kanban components

**Question.** What does HeroUI Pro's Kanban give a board whose every move is an action the server may refuse, and
what would we have to build ourselves?

**Answer.** The parts, the drag and the keyboard access, yes; the state, no. Pro's `Kanban` is a set of styled slots
over React Aria's `GridList` and `useDragAndDrop`, so columns, cards, mouse and keyboard drag, screen-reader
announcements and drop indicators come free. Its `useKanban` hook keeps its own copy of the items and moves a card the
moment it lands, which is wrong for us: we wrote a 60-line hook that asks the server and moves only on its answer.
Swimlanes are a composition, not a feature. Virtualising a column renders 20,000 cards fast, but dragging inside a
virtualised column broke its layout, so long columns stay unvirtualised (or paginated) for now.

## What was tried

HeroUI Pro `@heroui-pro/react` 1.0.0-beta.11 (the version `internal/portal-pro` and `spikes/portal-fumadocs` pin), on
`@heroui/react` 3.2.7, `react-aria-components` 1.22.1, React 19.3.1, Vite 8.3.5, Tailwind 4.3.4. It installs from Aaron's
`heroui-pro login` on this machine (its postinstall downloads the licensed build), in this spike's own pnpm workspace,
so CI never installs it. No Pro code is committed; the repository is public and the licence forbids redistribution.

Four cases in one page, `?case=`:

1. **`stock`**: Pro's Kanban exactly as its hooks intend (`useKanban`, `useKanbanColumn`), 40 fake work items in five
   columns (backlog, ready, running, review, done).
2. **`actions`**: the same parts with our own hook, `src/server-column.ts`. A drop sends a move request to a stand-in
   server (`src/board.ts`, pure, 150 ms latency); the server checks the item's machine, its lease, the running
   column's limit, its dependencies, and whether another running item writes the same file. The card moves only when
   the answer is "moved". `&agents=1` adds agents moving cards through the same requests every 1.2 s.
3. **`lanes`**: the actions board split into a People lane and an Agents lane.
4. **`scale`**: one column of N cards, plain and inside React Aria's `Virtualizer` (`&n=5000&virtual=1`).

The spike uses `setTimeout` and `Date.now` freely: it is throwaway code outside the package rules. The server's rules
have their own tests (`src/board.test.ts`, six cases, `node --test`). Driven in the desktop app's
built-in browser with real key presses and mouse drags.

## What was found

1. **What Pro gives.** `Kanban` (root, a horizontal scroll shadow), `Column`, `ColumnHeader`, `ColumnIndicator`,
   `ColumnTitle`, `ColumnCount`, `ColumnActions`, `ColumnBody`, `CardList` (a React Aria `GridList`), `Card` (a
   `GridListItem` with a Motion layout animation), `DragHandle`, `DropIndicator`, `ScrollShadow`, three sizes, and
   the hooks `useKanban`, `useKanbanColumn`, `useKanbanCardPlaceholder`. Everything inside a card is ours to draw.
2. **Keyboard drag works and is announced.** Focus a card, Right arrow to its handle, Enter: "Started dragging. Press
   Tab to navigate to a drop target, then press Enter to drop". Tab moves column to column, arrows between cards,
   Enter drops, Escape cancels. A screen reader hears each target ("Insert between Build link.create and Build
   link.share").
3. **Mouse drag works and keeps position.** Dragging w1 from backlog onto the ready column inserted it between w32
   and w37, where it was dropped.
4. **`useKanban` is the wrong owner of state.** It wraps `useListData`: the items are the component's, seeded once
   from `initialItems`, and `onInsert` moves the card locally before anyone is asked. In `stock`, w1 went from backlog
   straight to running, a move our machine forbids, and nothing could stop it. A board fed by the server, where a
   move can be refused and agents move cards too, needs its own hook. Ours (`useServerColumn`) uses React Aria's
   `useDragAndDrop` directly with Pro's parts, and is about 60 lines.
5. **The machine can be enforced while hovering.** Our `getDropOperation` returns `cancel` for a column the item's
   machine doesn't allow. With the keyboard, Tab then skips those columns entirely: dragging w1 from backlog offered
   only ready, then cycled back. With the mouse, the pointer shows "no drop". This needs the dragged item's id, which
   `getDropOperation` isn't given; we keep it in a ref shared by the board's columns (`useDragging`).
6. **A refused drop leaves the card where it was.** Dropping w2 on running, with eight running against a limit of
   four, logged `refused {"code":"ColumnFull","column":"running","limit":4}` and w2 stayed first in ready. Nothing
   moves until the answer; the spike shows the refusal in a log, the real board on the card.
7. **Agents moving cards beside a person works, and shows two dispatch lessons.** With `agents=1`, 16 requests in
   about 10 s: two moved, 14 refused `ColumnFull`, the same agent retrying the same item. An agent that pushes moves
   at a full board wastes calls; dispatch should pick from what can start, not try and be refused. And when a card
   moved under the pointer between a look and a drag, the person grabbed the next card (w27 instead of w12). Live
   boards need the layout held still while a pointer is down, or a confirm on cross-lane moves.
8. **Swimlanes are ours.** No lane slot or lane drag. Two `Kanban` roots, one per lane, each column filtered by lane,
   render and drag fine; dragging across lanes would need the lane in the move request.
9. **No limits, no collapse, no grouping in Pro.** Column limits (our "running" limit), collapsed columns, card counts
   against a limit, and the refusal's message are all ours. `ColumnActions` and `ColumnIndicator` are the slots.
10. **Virtualising renders, but breaks drag.** In `Virtualizer` with `ListLayout`, a 20,000-card column keeps 17 rows
    in the DOM. The scroll container has to be a wrapping element; a height on `CardList` is ignored, and the page
    becomes the scroller. A keyboard reorder inside the virtualised column then left only two rows rendered (w2 at
    the top, w1 4,200 px down, nothing between) and scrolling didn't repair it. Likely the card's Motion layout
    animation against the virtualiser's absolute positions; not chased further.
11. **Other Pro parts the board will want.** `DataGrid` is virtualised and has drag and drop, sorting and selection:
    the list view of the same items. `ListView` is virtualised. `ItemCard`, `HoverCard`, `ActionBar` (bulk actions on
    a selection), `Command`, `KPIGroup`, `Timeline` and the `Chat*` parts cover the card face, the hover detail, bulk
    moves, the command bar, the counts, an item's history and the manager's conversation.

## Measurements

Render time from the entry module to the first paint after React's commit (`window.__rendered`, set in `src/main.tsx`),
Vite dev server, one column, one iframe per case, read by a snippet run in the page (not committed). Dev build, so read
the ratios, not the numbers.

| Cards | Virtualised | Rows in the DOM | Render, ms |
|---:|---|---:|---:|
| 200 | no | 200 | 781 |
| 1,000 | no | 1,000 | 1,204 |
| 2,000 | no | 2,000 | 1,979 |
| 5,000 | no | 5,000 | 5,457 |
| 2,000 | yes | 17 | 718 |
| 5,000 | yes | 17 | 616 |
| 20,000 | yes | 17 | 1,400 |

Production bundle of the whole spike (React, React DOM, React Aria, HeroUI, Pro's Kanban, Motion): 720,840 bytes of
JavaScript, 208,120 gzip; 836,090 bytes of CSS, 84,050 gzip, most of it Pro's full stylesheet, which a real app would
trim to the components it uses.

## The decision it supports

**K11** (the work board). Use Pro's Kanban parts for the board's look, keyboard access and drag, and own the state:

- The board renders what the server says. A drop is a request (an action, the same one an agent calls); the card
  moves on the answer, and a refusal is shown on the card, typed. Never `useKanban`.
- The item's machine is known on the client from the model, so illegal columns refuse the drop before any call.
  Everything that needs data (limits, leases, files in use, dependencies) is the server's to refuse.
- Lanes, column limits and collapsed columns are ours, built from Pro's slots.
- Columns stay unvirtualised: the board shows the working set (a few hundred items at most), and the long tail (the
  backlog, done) is a `DataGrid` view of the same items, which is virtualised. Revisit if Pro fixes drag inside a
  virtualised `GridList`.
- If the licence ever becomes a problem, a clean-room Kanban is small: React Aria's `GridList` and `useDragAndDrop`
  do the hard parts, and Pro's layer is slots and styles.

## Open risks

- Mouse drag was driven by synthetic input in one browser (Chromium in the desktop app). Touch, Safari and Firefox are
  untested; React Aria supports them, Pro's layer adds only styles and Motion.
- The board moving under the pointer (finding 7) needs a rule before agents and people share a board.
- Pro is a beta (1.0.0-beta.11), installed through a login on one machine. CI can't build anything that imports it
  without `HEROUI_AUTH_TOKEN`, a credential only Aaron can create.
- The virtualised drag failure is unexplained.

## Run it

On a machine signed in with `npx heroui-pro login`:

```sh
cd spikes/kanban-components
pnpm install
pnpm test
pnpm dev
```

Then open `http://127.0.0.1:45690/?case=actions&agents=1` (or `stock`, `lanes`, `scale&n=5000&virtual=1`). Stop the
dev server afterwards; it leaves only `node_modules/` and `dist/`, both ignored.
