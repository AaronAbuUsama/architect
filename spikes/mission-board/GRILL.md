# Grill round 1: the mission board's information architecture

Drafted 19 November 2026 by 📐 Designer: the mission board. Revised with HeroUI's docs, read through its MCP: each option names the parts it would use. Mobbin references go under
each option once Mobbin is signed in for this session (it shows "needs sign-in"). Five questions. The conductor sends
it to Aaron.

**Shared terms**

- **Lane**: one building block (Thing & fields, Operation & read, … Journey & starting world). Thirteen of them.
- **Card**: one output of one block, for example "Field visibility · API". 13 lanes × 9 outputs = 117 cards.
- **State**: a card's eval result. Green means its evidence ran and passed. Built means the code carries it but no
  verdict has been recorded yet. Then partly, red, and not needed (only by your answer, with a reason). From K14's
  `design/grid/types.ts`.
- **Proposed grey**: a red card the grid proposes as not needed (17 of them). It stays red, drawn grey with a "proposed
  not needed" chip, until Aaron answers K14's Q2.
- **Stage**: where the *work* on a card stands, taken from its task on today's board: backlog, decide, checks, build,
  review, done.
- **Grid / Board**: the two data files. The grid says what each card means: `design/grid/grid.json`, owned by the
  grid thread, PR #72. The board says who is on each card and how it moved, owned by the conductor. Types:
  `spikes/mission-board/src/data/types.ts`. Today the grid starts at 48 built, 31 partly, 38 red and 0 green.

---

## Q1 — What are the board's columns: the card's state, its output, or its work stage?

**The problem, in plain words.** HeroUI Pro's Kanban has columns and cards, and nothing else. It has no swim lanes.
So each lane is its own small Kanban, and we must choose what the columns inside a lane mean. (HeroUI's Kanban docs,
read through its MCP, have two full examples, a Notion board and a Project board. Both use one Kanban with status
columns, and neither has lanes.) If nobody decides, we
get a grid that looks like a board but where nothing ever moves, or a board that hides which output is missing.

The component, from `internal/portal-pro/node_modules/@heroui-pro/react/dist/components/kanban/index.d.ts:3-15`:

```ts
export declare const Kanban: (… KanbanRootProps) & {
    Card, CardList, Column, ColumnActions, ColumnBody, ColumnCount,
    ColumnHeader, ColumnIndicator, ColumnTitle, DragHandle, DropIndicator, Root, ScrollShadow
};
// use-kanban.d.ts:5-9: a card is in exactly one column
interface UseKanbanOptions<T> { initialItems: T[]; getColumn: (item: T) => string; setColumn: (item: T, column: string) => T; }
```

The portal spec already says what a board's columns are: a thing's machine states (`design/portal.md:359`):

```ts
views: { list: { [Item.name]: Portal.view.board({ by: Item.machine }) } },
```

**What it touches**

| Dependent | Why it cares |
|---|---|
| `derive.ts` `LaneView.cards` | Today it orders cards by output. Option A groups them by state instead. |
| The hill climb (Q4) | Climbing is visible only if green is a place a card moves to. |
| M3.17, the real board (`portal.md:396`) | It is `board({ by: machine })`. A prototype with the same shape carries straight over. |
| The grid thread's `grid.json` | It doesn't care. All three options read the same cells. |

**The options**

**Today**: the board (`conductor/board-skill:.agents/skills/kanban/template/index.html:5`) has lanes per milestone
across six work stages:

```js
/* Swimlanes (milestones or threads) across six pipeline stages; a thread registry on top; drawers for a task or a thread. */
```

**A · Columns are states** (recommended)
```tsx
{lanes.map((lane) => (
  <Kanban.Root key={lane.block.id} size="sm" aria-label={lane.block.name}>
    {(["red", "partly", "built", "green", "not-needed"] as const).map((s) => (
      <Kanban.Column key={s}>
        <Kanban.ColumnHeader><Kanban.ColumnIndicator className={tone[s]} /><Kanban.ColumnTitle>{stateName[s]}</Kanban.ColumnTitle><Kanban.ColumnCount>{lane.score[key(s)]}</Kanban.ColumnCount></Kanban.ColumnHeader>
        <Kanban.CardList items={lane.cards.filter((c) => c.state === s)}>{(c) => <OutputCard card={c} />}</Kanban.CardList>
      </Kanban.Column>))}
  </Kanban.Root>))}
// a card: "API" · M1.35 · 🧭 M1 lead · stage chip "build" · "waits on Model" when a dependency isn't green
```

**B · Columns are outputs (the audit grid)**
```tsx
<Kanban.Root aria-label="Coverage">
  {outputs.map((o) => (
    <Kanban.Column key={o.id}>
      <Kanban.ColumnHeader><Kanban.ColumnTitle>{o.name}</Kanban.ColumnTitle></Kanban.ColumnHeader>
      <Kanban.CardList items={lanes.map((l) => l.cards.find((c) => c.output.id === o.id)!)}>{(c) => <StateCard card={c} />}</Kanban.CardList>
    </Kanban.Column>))}
</Kanban.Root>
// 9 columns × 13 cards each; colour carries the state; nothing ever moves
```

**C · Columns are work stages (today's board, re-laned)**
```tsx
{STAGES.map((s) => <Kanban.Column key={s}>…{lane.cards.filter((c) => (c.task?.stage ?? "backlog") === s)}…</Kanban.Column>)}
// backlog | decide | checks | build | review | done; the state is a dot on the card
```

**Parts**

| Option | HeroUI parts (from the docs, read through its MCP) |
|---|---|
| A · States | one `Kanban` per lane: `Kanban.Column` › `ColumnHeader` (`ColumnIndicator`, `ColumnTitle`, `ColumnCount`) › `ColumnBody` › `CardList` › `Card`, as in the docs' Project Board. `Chip` for slice, stage and question. `Avatar` for the thread. |
| B · Outputs | the same parts, one `Kanban` with nine columns. |
| C · Stages | the same parts, six columns. |

**You do X → what happens**

| Scenario | A · States | B · Outputs | C · Stages |
|---|---|---|---|
| You open the board | Each lane shows how many cards are red, partly or green, with the cards under each. | It looks like the audit table, in cards. | It looks like today's board, with the lanes renamed. |
| A verdict lands | The card moves right, from Built into Green. | The card changes colour in place. | Nothing moves until its task's stage changes. |
| "Is MCP missing anywhere?" | You read the labels, or filter by output. | You read one column. | You filter by output. |
| A card is green but its task isn't done | It sits in Green with a "build" chip. | Green, with a chip. | It sits in Build with a green dot. Looks unfinished. |
| M3.17 builds the real thing | Same shape as `board({ by: machine })`. | A grid view, not a board. | Board by a task field, not the card's machine. |

**Rubric**

| Axis | A · States | B · Outputs | C · Stages |
|---|---|---|---|
| Floor-first | ✅ The real Kanban, as its API intends | ⚠️ Kanban used as a table | ✅ Works today |
| Reversibility | ✅ One `getColumn` | ✅ One `getColumn` | ✅ One `getColumn` |
| Blast radius | ✅ Prototype only | ✅ Prototype only | ✅ Prototype only |
| Correctness | ✅ Columns are the eval, the thing we climb; built against green is visible | ⚠️ No movement, so no climb | ❌ Measures effort, not coverage |
| Fit | ✅ `portal.md:359`, the machine as columns | ⚠️ Duplicates the matrix in Q4 | ⚠️ Today's board, which Aaron is replacing |

**Recommendation: A.** The board measures coverage, so its columns are the eval's states (red, partly, built, green,
not needed) and climbing is cards moving right. The by-output scan Option B gives lives in the hill-climb matrix (Q4), and a filter covers it on the board.

---

## Q2 — Is the board its own page, or a tab of the Goal page?

**The problem, in plain words.** The accepted Goal page already has a goal header, a write-up and tabs. If the board
is a separate page, the goal is written twice and the two drift. If it's a tab, the header is shared, but the board
gets less room.

`spikes/console-mock/src/mission.tsx:205-218`:

```tsx
<Tabs.Tab id="overview">Overview<Tabs.Indicator /></Tabs.Tab>
<Tabs.Tab id="updates">Updates<Tabs.Indicator /></Tabs.Tab>
<Tabs.Tab id="items" href="Plan.dc.html">Work items<Tabs.Indicator /></Tabs.Tab>
<Tabs.Tab id="activity">Activity<Tabs.Indicator /></Tabs.Tab>
…
<h1>{goal.text}</h1>
<p className="muted">Done when {goal.doneWhen}. …</p>
```

**What it touches**

| Dependent | Why it cares |
|---|---|
| `Grid.goal` (`types.ts`) | One goal record. Where it renders decides whether it appears once or twice. |
| The Goal page (`mission.tsx`) | It is accepted. Option A adds a tab; Option B leaves it alone. |
| The right rail (milestones, progress, activity) | On a tab, the rail can hold the hill climb (Q4). |

**The options**

**Today**: the board and the Goal page are separate artifacts. The board's goal is the critical-path banner
(`template/index.html:216`, `meta.critical.goal`).

**A · The Board tab of the Goal page** (recommended)
```tsx
<Tabs.Tab id="overview">Overview</Tabs.Tab>
<Tabs.Tab id="board">Board</Tabs.Tab>       {/* replaces "Work items" */}
<Tabs.Tab id="climb">Hill climb</Tabs.Tab>
<Tabs.Tab id="activity">Activity</Tabs.Tab>
// Overview shows Grid.goal.writeUp in full; Board shows the title and a one-line doneWhen above the lanes
```

**B · Its own page with its own goal header**
```tsx
<Shell active="board" crumbs={["orthograph", "Mission board"]}>
  <GoalHeader goal={grid.goal} />   {/* the full write-up, again */}
  <Lanes … />
</Shell>
```

**C · Lanes inline on the Overview**
```tsx
<div className="overview-main"><GoalHead /><Properties /><Lanes compact /></div>
```

**Parts**

| Option | HeroUI parts |
|---|---|
| A · Tab | `Tabs` (OSS) above the goal header, as on the Goal page. `KPIGroup` and `KPI` for the goal's score on Overview. |
| B · Own page | `AppLayout`, `Navbar` and a second goal header. |
| C · Inline | the Overview's `Widget`s with the lanes inside one. |

**You do X → what happens**

| Scenario | A · Tab | B · Own page | C · Inline |
|---|---|---|---|
| You open the mission | The Overview tab: the write-up, then progress per lane in the rail. | The board, with the write-up on top. | The write-up, then 13 lanes under it. |
| You want just the board | One tab click. The lanes fill the width. | It's already there. | Scroll past the header. |
| The goal's wording changes | One place. | One record shown twice. Fine as data, but long. | One place. |
| The real portal (M3.17) | The board is a view of the Goal thing. | A separate page. | Too dense for real use. |

**Rubric**

| Axis | A · Tab | B · Own page | C · Inline |
|---|---|---|---|
| Floor-first | ✅ | ✅ | ⚠️ Cramped |
| Reversibility | ✅ | ✅ | ✅ |
| Blast radius | ⚠️ Touches the accepted page | ✅ None | ⚠️ Changes the accepted page |
| Correctness | ✅ The goal shown once in full | ⚠️ The goal shown twice | ✅ |
| Fit | ✅ Linear's project tabs, the accepted model | ⚠️ A second "project page" | ❌ Against "lists sit beside their detail" |

**Recommendation: A.** The board is the Goal's work view, as in Linear's project tabs. The write-up lives once, on
Overview.

---

## Q3 — When you click a card, where does its detail open?

**The problem, in plain words.** A card's detail is long: what green means, the evidence, file references, its
history and which threads had it. If it opens somewhere that hides the board, you lose your place across 117 cards.

The fields the detail shows (`spikes/mission-board/src/data/derive.ts:7-15`):

```ts
export interface CardView {
  readonly cell: Cell;                    // greenMeans, notNeededBecause, todayRef, evidence[]
  readonly state: CellState;
  readonly task: Task | null;
  readonly thread: Thread | null;         // working it now
  readonly hadIt: ReadonlyArray<Thread>;  // threads that worked it before
  readonly history: ReadonlyArray<CardEvent>;
}
```

**What it touches**

| Dependent | Why it cares |
|---|---|
| The style guide, "Lists sit beside their detail" (`portal-design/SKILL.md`) | It decides the default. |
| `Resizable` (Pro) | It's the part for a list beside its detail. |
| Deep links (the conductor citing a card) | A full page gets a URL of its own; a panel needs `?card=`. |

**The options**

**Today**: a drawer over the board (`template/index.html:5`, "drawers for a task or a thread").

**A · A side panel beside the lanes** (recommended)
```tsx
<Resizable orientation="horizontal">
  <Resizable.Panel defaultSize={68}><Lanes onSelect={setCard} /></Resizable.Panel>
  <Resizable.Handle />
  <Resizable.Panel defaultSize={32}><CardDetail card={card} /></Resizable.Panel>
</Resizable>
```

**B · A full page per card (a Linear issue page)**
```tsx
<Shell crumbs={["Goal", "Board", "Field visibility · API"]}><CardPage card={card} /></Shell>
```

**C · A modal over the board**
```tsx
<Modal isOpen={!!card}><CardDetail card={card} /></Modal>
```

**Parts**

| Option | HeroUI parts |
|---|---|
| A · Panel | `Resizable` (`Panel`, `Handle`), holding `ItemCardGroup` and `ItemCard` for thread and evidence rows, and `Timeline` (`Item`, `Rail`, `Marker`, `Connector`, `Content`) for history. |
| B · Page | the same content full width, with `Navbar` breadcrumbs. |
| C · Modal | `Modal` (OSS) with the same content. |

**You do X → what happens**

| Scenario | A · Panel | B · Page | C · Modal |
|---|---|---|---|
| You click a red card | The board narrows and the detail opens on the right. Your place stays. | The board goes away. | The board dims. |
| You step through the red cards in a lane | Click, click, click. | Back, click, back. | Close, click, close. |
| The conductor links you to one card | `?card=visibility.api` opens the panel. | A clean URL. | `?card=` opens the modal. |
| You read a long evidence list | It scrolls within the panel. | It gets the whole width. | It's cramped. |

**Rubric**

| Axis | A · Panel | B · Page | C · Modal |
|---|---|---|---|
| Floor-first | ✅ | ✅ | ✅ |
| Reversibility | ✅ The same `CardDetail` | ✅ The same `CardDetail` | ✅ The same `CardDetail` |
| Blast radius | ✅ | ✅ | ✅ |
| Correctness | ✅ Context kept | ⚠️ Context lost | ⚠️ Context hidden |
| Fit | ✅ The style guide's rule | ⚠️ Matches Linear issues | ❌ Not in the style guide |

**Recommendation: A.** The style guide's own rule, and stepping through a lane is the main way the board gets used.

---

## Q4 — How do you see the hill climb: how far each lane is, and what changed?

**The problem, in plain words.** "Are we climbing?" needs two answers: how far each lane is now, and what moved since
you last looked. The style guide allows one progress indicator per thing, so a bar on the lane, a ring in the rail
and a chart would be three for the same number.

What the data gives (`derive.ts`):

```ts
export const climb = (grid, board, times) => LaneClimb[];         // each lane's Score at each event time
export const changedSince = (grid, board, since) => Change[];     // {cell, from, event}, newest first
export interface Score { green; built; partly; red; notNeeded; needed }  // green is out of `needed`
```

**What it touches**

| Dependent | Why it cares |
|---|---|
| The style guide, "one progress indicator per thing" | It caps how many places show a lane's number. |
| `CardEvent` history (the conductor's writes) | The climb is only as good as the events written. |
| Q1 | With columns as states, the lane's own column counts already say how far it is. |

**The options**

**Today**: each lane has a done-of-total count and a bar (`template/index.html:180`):

```js
'<span class="ct">'+done+" of "+all.length+' done</span><span class="pg"><i style="width:…%"></i></span>'
```

**A · A Hill climb tab: the 13 × 9 matrix plus a "since" picker** (recommended)
```tsx
<Widget><Widget.Header><Widget.Title>Coverage</Widget.Title>
  <Widget.Description>Green: the card's eval passes. Outlined: moved since {since}.</Widget.Description>
  <Segment selectedKey={since}>{/* last look · today · this week · the audit */}</Segment></Widget.Header>
  <Widget.Content><Matrix lanes={view.lanes} moved={changedSince(grid, board, since)} /></Widget.Content></Widget>
<Widget><Widget.Header><Widget.Title>Green over time</Widget.Title></Widget.Header>
  <Widget.Content><Climb series={climb(grid, board, climbTimes(board))} /></Widget.Content></Widget>
// on the Board tab, each lane shows only its column counts (Q1): no extra bar
```

**B · Progress in every lane header, and changes as badges**
```tsx
<Kanban.ColumnHeader>… <ProgressCircle value={pct(lane.score)} /> …</Kanban.ColumnHeader>
<Chip size="sm">moved</Chip>   {/* on cards changed since your last look */}
```

**C · Ghost cards: each card's old position shown faded**
```tsx
{changes.map((c) => <Kanban.Card className="ghost" key={c.cell + c.from}>…</Kanban.Card>)}
```

**Parts**

| Option | HeroUI parts |
|---|---|
| A · Climb tab | `KPIGroup` of `KPI`s (green, built, partly, red, out of needed), `Widget` around the matrix and the chart, `Segment` for "since", `LineChart` inside a `Widget` (Recharts runs in the browser here), and `Timeline` for what moved. |
| B · Lane badges | `ProgressCircle` (OSS) in each lane header, and a `Chip` on cards. |
| C · Ghosts | No part has it. Hand-made. |

**You do X → what happens**

| Scenario | A · Climb tab | B · Lane badges | C · Ghosts |
|---|---|---|---|
| "How far are we overall?" | One matrix: 117 squares, green filling in. | Scan 13 rings. | Count cards. |
| "What moved since yesterday?" | Pick "since yesterday": the moved squares are outlined, with a list under them. | Look for badges across 13 lanes. | Look for ghosts. |
| "Which output lags?" | Read a matrix column. | Not visible. | Not visible. |
| Indicators per number | One per view. | Two (ring and column counts). | One. |

**Rubric**

| Axis | A · Climb tab | B · Lane badges | C · Ghosts |
|---|---|---|---|
| Floor-first | ✅ Derived from data we already have | ✅ | ⚠️ Kanban has no ghost slot |
| Reversibility | ✅ | ✅ | ✅ |
| Blast radius | ✅ | ✅ | ✅ |
| Correctness | ✅ "Moved" computed from history | ⚠️ "Last look" needs per-viewer state | ⚠️ Same |
| Fit | ✅ One indicator, numbers as data | ❌ Two indicators for one number | ⚠️ Hand-made |

**Recommendation: A.** One view answers both questions. The by-output scan Q1 gives up comes back here, and the board
keeps one indicator per lane.

---

## Q5 — Where does a lane show its end state, the thing that proves the whole lane?

**The problem, in plain words.** Each lane ends in a proof: usually a portal view, otherwise a journey through the
CLI, SDK or MCP. If it's hidden in a detail page, nobody sees what "done" looks like for a lane. If it's a card, it
gets counted as a tenth output.

`types.ts`:

```ts
export interface EndState {
  readonly kind: "portal-view" | "journey";
  readonly title: string;      // "The band's secret and private marks, and the no-leak check" (grid.json)
  readonly description: string;
  readonly ref: string | null; // the view's route or the journey's path, once it exists
}
```

**What it touches**

| Dependent | Why it cares |
|---|---|
| The grid thread (`Block.endState`) | It writes these. Short titles need a home that fits them. |
| `Score` | An end state isn't an output, so it must not count toward green of needed. |
| The portal (M1.13) | Most end states are its views, so a link from the lane leads to the portal page. |

**The options**

**Today**: lanes have a `goal` and a `gate` field (kanban `lanes/<id>`) shown under the lane name.

**A · The lane header: name, summary, and an end-state chip that opens it** (recommended)
```tsx
<header className="lane-head">
  <h3>{lane.block.name}</h3><span className="muted">{lane.block.summary}</span>
  <Chip size="sm" variant="soft"><FlagBannerIcon />{lane.block.endState.title}</Chip>
</header>
```

**B · A pinned last card in Green, outlined until the lane is all green**
```tsx
<Kanban.Card className="end-state" isDisabled>{lane.block.endState.title}</Kanban.Card>
```

**C · Only in a lane detail panel**
```tsx
<LaneDetail block={lane.block} />   // opens when you click the lane name
```

**Parts**

| Option | HeroUI parts |
|---|---|
| A · Header chip | `Chip` (OSS) in the lane header. It opens the end state and its proof in the same panel, as an `ItemCard`. |
| B · Pinned card | a disabled `Kanban.Card`. |
| C · Detail only | `ItemCardGroup` in a lane panel. |

**You do X → what happens**

| Scenario | A · Header chip | B · Pinned card | C · Detail only |
|---|---|---|---|
| "What proves Field visibility is done?" | Read the chip on the lane. | Look at the end of Green. | Click the lane name. |
| Lane scores | Unaffected. | Must skip one card. | Unaffected. |
| A long end-state title | Truncated chip, full text on open. | Fits on a card. | Fits. |

**Rubric**

| Axis | A · Header chip | B · Pinned card | C · Detail only |
|---|---|---|---|
| Floor-first | ✅ | ✅ | ✅ |
| Reversibility | ✅ | ✅ | ✅ |
| Blast radius | ✅ | ⚠️ Special case in counts | ✅ |
| Correctness | ✅ Not counted as an output | ⚠️ Looks like a tenth output | ✅ |
| Fit | ✅ Chips are the properties pattern | ⚠️ A card that isn't a card | ⚠️ Hidden |

**Recommendation: A.** Always visible, never counted, and it opens the same side panel as a card.

---

## At a glance

| # | Joint | Recommendation |
|---|---|---|
| Q1 | The board's columns | A · columns are the card's state (red, partly, built, green, not needed) |
| Q2 | Where the board lives | A · a Board tab on the Goal page |
| Q3 | Where a card's detail opens | A · a side panel beside the lanes |
| Q4 | How you see the climb | A · a Hill climb tab: the 13 × 9 matrix, a "since" picker and one chart |
| Q5 | Where a lane's end state shows | A · a chip in the lane header |

**Answer key.** Reply "all A", or give each one a letter, for example "Q1 B, rest A". Add a sentence where you want
something different from any option.
