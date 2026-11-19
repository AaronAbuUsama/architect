# Grill, round 2: what the board is, and what a card carries

Asked 19 November 2026, after Aaron's feedback on version 3 of the prototype: the 13 small Kanbans are "not the
lanes", the Kanban is "not our thing we're building against", the cards need doing properly from HeroUI Pro's own card
code, and every page should be a Notion-like page of rich blocks, not Widgets stacked with markdown.

**Shared terms.**
- **Grid**: 13 building blocks × 9 outputs = 117 cells (`grid.json`, K14). Each cell is an eval: a state, a "green
  means" line, evidence, the slice that owns it.
- **Block page**: a Notion-like page for one building block (title, properties row, rich blocks), the way the portal's
  operation notes work (`internal/portal-pro/src/modules/note-editor`, tiptap).
- **Eval page**: the same kind of page for one cell, for example `visibility.api`.
- **Project-board card**: HeroUI Pro's richest Kanban card (docs, "Usage" and "Project Board"): title, two-line
  description, chips, progress bar, avatars, comment and attachment counts.

Already decided, not asked: pages are built from rich blocks (Pro `Markdown` for prose, plus callout, property row,
KPI, card-grid and timeline blocks); Widget frames only for a chart or a KPI group, per the portal-design skill.

## Q1 — What is the main surface: what replaces the 13 little Kanbans?

**The problem, in code.** Today every building block gets its own Kanban whose columns are cell states, so the page
is 13 stacked boards of 9 cards. A Kanban is for work moving through stages; a cell doesn't move through columns, its
state changes when evidence lands. So the board borrows a work tool to show a coverage map.

```tsx
// spikes/mission-board/src/app/lanes.tsx:66-77
<Kanban size="sm" className="lane-board" aria-label={`${lane.block.name} cards`}>
  {columns.map((col) => (
    <Kanban.Column key={col.id} className="lane-col">
      <Kanban.ColumnHeader>
        <Kanban.ColumnIndicator className={`tone-${col.tone}`} />
        <Kanban.ColumnTitle>{col.title}</Kanban.ColumnTitle>   {/* Red, Partly, Built, Green */}
```

**What it touches**

| Dependent | Why it cares |
|---|---|
| `page.tsx` tabs (Overview, Board, Hill climb) | The Board tab is the thing being replaced |
| `derive.ts` `LaneView`, `join` | Already gives per-block cards and scores; any option reuses it |
| The conductor's work Kanban (`.agents/skills/kanban`) | Holds tasks by stage today; option B would fold it in |
| K14 lane order (operation first) | Every option keeps it |

**The options**

**Today** — 13 Kanbans, columns = state (`lanes.tsx:66`), about 2,400px tall.

**A · Grid map, then block pages** (recommended)
```text
Goal page   [Overview] [Grid] [Hill climb]
Grid tab    13 rows × 9 columns, one coloured cell each (operation first)
            click a row  → Operation block page   (Notion-like: what it is, end state callout,
                                                    its 9 eval cards in a 3×3 card grid)
            click a cell → visibility.api eval page (green means, today, evidence, history, who)
Work in flight stays on the conductor's Kanban; its cards link to eval pages.
```

**B · One real Kanban of work by stage**
```text
Columns  Backlog | Decide | Checks | Build | Review | Done      (task.stage)
Cards    the cells a task is working on, rich cards
Grid     a separate matrix tab; blocks become a filter
```

**C · Blocks as Kanban columns**
```text
Columns  Operation | Error | Thing | Step | … | Device         (13 columns, scroll sideways)
Cards    the 9 outputs of that block, coloured by state
```

**D · Today's lanes, richer cards**
```text
13 Kanbans stacked, columns = state, Project-board cards
```

**You do X → what happens**

| Scenario | A · Grid + pages | B · Work Kanban | C · Blocks as columns | D · Richer lanes |
|---|---|---|---|---|
| You open the goal and ask "how far are we" | One 13×9 grid on one screen | Only the cells in work show | 13 columns, scroll sideways to see them | Scroll 13 boards |
| You ask "what's left for Visibility" | Click the row: its page | Filter by block | Find the column | Find the lane |
| You ask "who's on what right now" | Work Kanban (where it is today) | Right there | Avatars on cards | Avatars on cards |
| A cell goes green | Its square turns green | Card moves to Done only if a task did it | Card recolours | Card jumps column |

**Rubric**

| Axis | A · Grid + pages | B · Work Kanban | C · Blocks as columns | D · Richer lanes |
|---|---|---|---|---|
| Floor-first | ✅ grid exists in `derive.ts` | ⚠️ needs task-to-cell links for every card | ✅ | ✅ |
| Reversibility | ✅ new tab, lanes code kept | ⚠️ merges two boards | ✅ | ✅ |
| Blast radius | ✅ spike only | ❌ changes the conductor's board | ✅ | ✅ |
| Correctness | ✅ state is a colour, not a column | ✅ stage is a real flow | ⚠️ 117 cards, no flow | ❌ what you called out |
| Fit | ✅ portal-design: page + rail, board only for work | ⚠️ | ⚠️ Kanban as a table | ❌ |

**Recommendation: A.** The grid is what we build against, so it is the map; each block and each eval gets a real
page, and the Kanban stays for work moving through stages.

## Q2 — What does an eval card carry?

**The problem, in code.** The card is the most-looked-at thing and today it's a title and some chips. Pro's own
Project-board card has more slots than we have true data for: no eval has run yet, so every piece of evidence has
`passing: null` (measured over all 117 cells), and a progress bar would read 0% everywhere.

```tsx
// HeroUI Pro Kanban docs, "Usage": the card's slots
<span className="font-semibold">{item.title}</span>
<Text className="text-muted line-clamp-2 text-sm" slot="description">{item.description}</Text>
<Chip color={tag.color} size="sm" variant="soft">{tag.label}</Chip>
<ProgressBar value={item.progress} size="sm" color="accent">…</ProgressBar>
<Avatar …/>  <Comment/> {item.comments}  <Paperclip/> {item.attachments}
```

**What it touches**

| Dependent | Why it cares |
|---|---|
| Grid cell hover, block page card grid | Both show this card |
| `derive.ts` `CardView` | Supplies every field; nothing new may be invented |
| "Numbers are data" rule | A bar must be a real fraction |

**The options**

**Today** — `lanes.tsx` `OutputCard`: output name, thread name, slice chip, question chip, "Held by".

**A · Project-board card, only true slots** (recommended)
```tsx
<Card>
  <Title>API</Title>                               {/* output.name; block name above in muted */}
  <Description>The HTTP schemas a caller is served are cut by the one rule…</Description> {/* greenMeans, 2 lines */}
  <Chips>Red · M1.35 · Build</Chips>               {/* state, slice, task stage */}
  <ProgressBar value={0} of={1}>0 of 1 checks</ProgressBar> {/* evidence passing; hidden until any eval has run */}
  <Footer><Avatar m1-lead/> <Avatar before/>  <Check/> 1  <Clock/> 0</Footer> {/* threads; evidence; history */}
</Card>
```

**B · Notion-board compact card**
```tsx
<Card><Square tone="red"/><Title>API</Title><Chips>M1.35 · Build</Chips><Avatar/><Line>⚡ Visibility</Line></Card>
```

**C · ItemCard row**
```tsx
<ItemCard><Icon state="red"/><Title>API</Title><Description>green means…</Description><Action><Chip>Red</Chip></Action></ItemCard>
```

**You do X → what happens**

| Scenario | A · Project-board | B · Notion compact | C · ItemCard row |
|---|---|---|---|
| You scan a block page | Read what green means without opening | Titles only | Read it, but as a list |
| An eval starts passing | Bar appears and fills | Nothing shows | Nothing shows |
| You ask "who's on it" | Avatars, now and before | One avatar | Not shown |
| Nine cards in a 3×3 grid | Fits at about 300px each | Fits easily | Doesn't grid |

**Rubric**

| Axis | A · Project-board | B · Notion compact | C · ItemCard row |
|---|---|---|---|
| Floor-first | ✅ all fields exist | ✅ | ✅ |
| Reversibility | ✅ one component | ✅ | ✅ |
| Correctness | ✅ bar hidden while null | ✅ | ✅ |
| Fit | ✅ Pro's own anatomy, what you sent | ⚠️ loses green means | ⚠️ a list, not a card |

**Recommendation: A.** It is Pro's own richest card with every slot bound to a real field, and the bar only shows
once evidence has a result.

## At a glance

| # | Joint | Recommendation |
|---|---|---|
| Q1 | Main surface | A · Grid map, then block pages and eval pages; the Kanban only for work |
| Q2 | Eval card | A · Project-board card, only true slots, bar hidden until evals run |

**Answer key:** reply "A A" to take both, or name the letter per question.

## Answer

Aaron, 19 November 2026: **A A.** The grid is the main surface (a row opens its lane, a square its eval page), and the
eval card is Pro's project-board card with every slot bound to a field. Versions 4 and 5 already build on these.
