# Grill, round 3: the eval page as a Linear issue

Asked 19 November 2026, after Aaron said: show icons for the agents that touched it, put a timeline on it and link
it, and make it "a lot more like Linear".

**Shared terms.**
- **Eval page**: what opens when you click a card, for example `visibility.api`. Today it is
  `src/components/CardDetail/CardDetail.tsx`.
- **Linear issue layout**: the title and description in a main column; Activity below them, a timeline of events, each
  showing who did it; and a right rail of properties (status, assignee, labels, project, linked pull requests).
- **Thread**: one agent or person working on the board (`Thread` in `src/data/types.ts`). There are 8 real ones, and
  each has an emoji, a kind (person, claude, codex or subagent), and an optional session, branch and pull request.

## Q1 — Which page gets the Linear layout: the eval, or the blueprint operation?

**The problem, in code.** You said "the actual operations". The board's cards are cells: a building block × an output
(`visibility.api`). They are not blueprint operations like Plugged In's `link add`. But the portal-design skill says
board cards link to "the operation the agent is working on". If nobody decides, I'll draw the Linear page on the
wrong thing.

```ts
// spikes/mission-board/src/data/grid/types.ts: a card is a cell
export type CellId = `${BlockId}.${OutputId}`;   // "visibility.api"
```

**What it touches**

| Dependent | Why it cares |
|---|---|
| `CardDetail` | It becomes the Linear page if the answer is A |
| Portal M3.17, the portal's own board | Its cards are operations (portal-design skill) |
| `GRILL-2.md` Q1 | The eval page sits under the grid |

**The options**

**Today** — `CardDetail` is a column of blocks: properties, green means, today, evidence, history, notes.

**A · The eval page** (recommended)
```text
visibility.api   main: green means · today · evidence · Activity    rail: state, slice, threads, PR, block
```

**B · A blueprint operation's page**
```text
link add   main: contract · evals · Activity                       rail: status, agent, journeys, p95
```

**You do X → what happens**

| Scenario | A · Eval page | B · Operation page |
|---|---|---|
| You click a card on this board | It opens as a Linear issue | It opens a different page, the operation |
| The data it needs | It's already in `grid.json` and the board | Plugged In's operations, which aren't on this board |

**Rubric**

| Axis | A | B |
|---|---|---|
| Floor-first | ✅ data exists | ❌ needs the operations' data |
| Blast radius | ✅ spike only | ⚠️ belongs to the portal's board, M3.17 |
| Fit | ✅ the card's own page | ⚠️ a second kind of card |

**Recommendation: A.** It's the page that opens from this board's cards, and all of its data exists.

## Q2 — What does each entry in the timeline link to?

**The problem, in code.** A history event names a thread and a task. A task has a pull request; a thread has a
session, a branch and a pull request. So a link can go to any of these, and the real board has no events yet: the
timeline would start empty except for "graded at m1@6419d4b7".

```ts
// spikes/mission-board/src/data/types.ts
export interface CardEvent { at; state; thread: string | null; task: string | null; evidence: string | null; note }
export interface Thread { id; name; emoji; kind: "person" | "claude" | "codex" | "subagent"; sessionId; branch; pr }
```

**What it touches**

| Dependent | Why it cares |
|---|---|
| `CardEvent` (the conductor writes it) | It may need a pull request or a commit |
| The conductor's board-writing skill | It writes the events |

**The options**

**Today** — the history Timeline shows the state, the time and the note (`CardDetail.tsx:101`), with no links.

**A · Each event links to its PR, its evidence and the thread** (recommended)
```text
🧭 M1 lead  moved it to Built · 14:05   PR #64 ↗   e2e/m1/16-visibility.test.ts ↗
```

**B · Pull request only**
```text
🧭 M1 lead  moved it to Built · 14:05   PR #64 ↗
```

**C · Thread's session only**
```text
🧭 M1 lead  moved it to Built · 14:05   open session ↗
```

**You do X → what happens**

| Scenario | A · PR, evidence, thread | B · PR only | C · Session only |
|---|---|---|---|
| You ask "what changed it" | Open the PR | Open the PR | Read a transcript |
| You ask "did it really pass" | Open the evidence | Not shown | Not shown |
| You ask "who and why" | The thread's avatar opens it | Avatar only | Open the session |

**Rubric**

| Axis | A | B | C |
|---|---|---|---|
| Floor-first | ✅ every field exists (the PR comes from the task) | ✅ | ⚠️ sessions can't be opened from claude.ai |
| Correctness | ✅ evidence is the proof | ⚠️ the PR isn't proof | ❌ |
| Fit | ✅ Linear links its PRs | ✅ | ⚠️ |

**Recommendation: A.** The PR says what changed and the evidence says that it passed; both already exist in the data.

## Q3 — What is an agent's icon?

**The problem, in code.** "Icons for the agents that touched it". Today a card shows each thread's emoji in a plain
avatar. Linear shows faces. Our threads have a kind, so the icon could say what kind of agent it is.

```tsx
// spikes/mission-board/src/components/OutputCard/OutputCard.tsx: today
<Avatar size="sm"><Avatar.Fallback>{t.emoji}</Avatar.Fallback></Avatar>
```

**What it touches**

| Dependent | Why it cares |
|---|---|
| `OutputCard` footer, the eval page's rail and Activity | All three show these avatars |
| `Thread.kind` | Already there: person, claude, codex, subagent |

**The options**

**Today** — 🧭 in a grey circle; you can't tell that it's Claude or Codex.

**A · The kind's mark, with the thread's emoji as a badge** (recommended)
```text
[Claude mark]🧭  M1 lead      [Codex mark]🤖  Codex: Plugged In      [person]👤  Aaron
```

**B · The emoji only, larger**
```text
🧭  M1 lead      🤖  Codex: Plugged In
```

**You do X → what happens**

| Scenario | A · Kind + emoji | B · Emoji |
|---|---|---|
| A glance at a card's footer | Claude, Codex or a person, and which thread | Which thread only |
| Three agents touched it | Three marks, overlapped, as in Linear | Three emoji |

**Rubric**

| Axis | A | B |
|---|---|---|
| Floor-first | ✅ `kind` exists | ✅ |
| Correctness | ✅ says who, and what kind | ⚠️ |
| Fit | ✅ Linear's stacked avatars | ⚠️ |

**Recommendation: A.**

## At a glance

| # | Joint | Recommendation |
|---|---|---|
| Q1 | Which page | A · The eval page becomes the Linear issue |
| Q2 | Timeline links | A · PR, evidence and thread on each event |
| Q3 | Agent icon | A · The kind's mark with the thread's emoji |

**Answer key:** "A A A", or a letter per question.
