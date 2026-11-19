# G5 grill: where an invariant shows to a reader

Open for Aaron, from [G5](G5-invariants.md). Nothing here is drawn or built until he answers the round (the
`portal-design` skill: grill the IA and UX before drawing). Counts such as `×31` in the sketches are illustrative. Slice ST1.22 waits on it; ST1.17 makes the data reach the portal's wire
whatever the answers are, so no answer blocks the build.

**Terms, once for the round.**

- **A rule** (an invariant): one export of a thing's `invariants.ts`, such as `handle.oneHolderPerName`: "a name has one
  holder while it is claimed". It owns one refusal, `HandleTaken`.
- **The thing's page** and **the operation's page**: the portal's two reading pages ([`../portal.md`](../portal.md),
  "A thing's page" and "An operation's page"). Machine, events and errors are sections of the thing's page, not tree
  rows (`portal.md:158-162`).
- **The in-and-out band**: the top of an operation's page; **the spine**: the fixed order every operation runs in,
  under it (`portal.md:247-268`).
- **The generated docs page**: `generated/docs/<thing>.md` and `<thing>/<verb>.md`, written by
  `packages/generators/src/modules/render/internal/docs.ts`.
- **The scaffold header**: the comment block at the top of a scaffolded handler (K16).

## Q1 — Where does a rule live on the thing's page?

**The problem, in code.** Today G4's one rule reaches the generated docs page as a bare `## Unique` line, and the
portal's thing page drops it entirely: the wire's `Thing` has no field for it.

```ts
// packages/generators/src/modules/render/internal/docs.ts:70
Object.keys(t.unique ?? {}).length ? ["", "## Unique", "", ...Object.entries(t.unique ?? {}).map(([k, u]) => `- ${k}: unique ${u.while ? `while ${u.while.join(", ")}` : "in every state"}`)] : [],

// packages/portal/src/modules/site/internal/detail.ts:51-60, thingPage: fields, machine, roles; nothing else
    thing.machine ? `<h2>Machine</h2><p>States: ${esc(thing.machine.states.join(", "))}.</p>${table(...)}` : "",
    thing.roles.length ? `<h2>Roles</h2><ul>${thing.roles.map((r) => `<li>${esc(r)}</li>`).join("")}</ul>` : "",
```

If nobody decides, the builder of ST1.22 picks a place, and the next kind (`requires`, which spans two things) finds no
room in it.

**What it touches**

| Dependent | Why it cares |
|---|---|
| `portal.md` "A thing's page" (`:208-245`) | its section order: lifecycle, operations, events, errors, roles, notes |
| ⌘K and the icon rail (`portal.md:158-170`) | a rule with its own page is a declaration ⌘K finds; a section is not |
| The generated docs page (`docs.ts:66-72`) | it follows the portal's order, so the two read the same |
| `requires`, later (G5 §7) | a rule across two things must show on one page or both |

**The options**

**Today** — `portal.md:213-226`, the thing's page as designed (abridged):

```text
handle                                                         handles · feature · @orthograph/handles 0.1.0
Lifecycle      ( · ) ──claim──► (claimed) ──release──► (released)
Operations     claim · release · resolve
Events         HandleClaimed · HandleReleased
Errors         HandleTaken HN-001 exit 10 · HandleNotClaimed HN-002 exit 11
Roles          person · anyone
```

**A · A "Rules" section under the lifecycle** (recommended)

```text
Lifecycle      ( · ) ──claim──► (claimed) ──release──► (released)
Rules          oneHolderPerName   a name has one holder while claimed      refuses HandleTaken  ×31
               oneNamePerPerson   a person holds one name while claimed    refuses HandleAlreadyOwned  ×2
Operations     claim · release · resolve
Errors         HandleTaken HN-001 exit 10 (by oneHolderPerName) · …
```

**B · Its own page per rule, reached from the tree and ⌘K**

```text
Things ▸ handle ▸ claim · release · resolve · ⚖ oneHolderPerName · ⚖ oneNamePerPerson

handle.oneHolderPerName
A name has one holder while it is claimed.        refuses HandleTaken HN-001 · exit 10
Held by: claim                                     refused ×31 in the window
```

**C · Only inside Errors, as a note on the error it owns**

```text
Errors         HandleTaken HN-001 exit 10 — a name has one holder while claimed · HandleAlreadyOwned …
```

**You do X → what happens**

| Scenario | A · Rules section | B · Own page | C · In Errors |
|---|---|---|---|
| You open `handle` to see what can't happen | read it under the lifecycle, beside what can | one click per rule | read it among errors, mixed with handler-decided ones |
| A thing with no rules | the section is absent | nothing in the tree | nothing |
| `requires` arrives, spanning link and handle | a row on link's page, a "held by link" line on handle's | a page that both link to | an error note on one side only |
| You search ⌘K for "oneHolderPerName" | lands on the section | lands on its page | not found |
| Tree weight on a thing with eight rules | none | eight more rows | none |

**Rubric**

| Axis | A · Rules section | B · Own page | C · In Errors |
|---|---|---|---|
| Floor-first | ✅ one section, from data ST1.17 already sends | ⚠️ a new page kind and a tree row kind | ✅ smallest |
| Reversibility | ✅ a section moves easily | ⚠️ links and ⌘K entries to undo | ✅ |
| Blast radius | ✅ thing page only | ❌ tree, ⌘K, routes, breadcrumbs | ✅ |
| Correctness | ✅ the rule and its refusal both said | ✅ | ❌ the rule hides behind its refusal |
| Fit | ✅ machine, events and errors are sections already (`portal.md:158-162`) | ❌ against "sections, not tree rows" | ⚠️ errors stay mixed |

**Recommendation: A.** A rule is part of a thing, like its machine, so it is a section, and the docs page uses the same
order. ⌘K can still index sections, which covers B's one real advantage.

## Q2 — How does a refusal say which rule refused it?

**The problem, in code.** Every surface lists an operation's refusals by name only, or calls them the handler's. Once
the runtime refuses for a rule, that is wrong on all four surfaces at once.

```ts
// packages/portal/src/modules/site/internal/detail.ts:43, the operation page's refusals
`<h3>Refusals</h3><ul>${op.refusals.map((r) => `<li>${esc(r)}</li>`).join("")}</ul>`,

// packages/generators/src/modules/render/internal/docs.ts:22, the docs page
if (declared) return `| ${r} | ${declared.exit} | ${code} | declared in errors.ts${…} |`;
```

```text
// examples/plugged-in/src/handle/claim.ts:22, the scaffold header
 *   HandleTaken         exit 10  HN-001  yours to refuse below; from blueprint/things/handle/errors.ts
```

If nobody decides, each surface words it differently, and the MCP description an agent reads drifts from the docs a
person reads.

**What it touches**

| Dependent | Why it cares |
|---|---|
| The operation's in-and-out band (`portal.md:257-258`) | it lists `refusals: HandleTaken HN-001 ×31 · …` |
| The generated docs page (`docs.ts:16-26`) | its refusals table has a "means" column |
| The scaffold header (`projections/.../handlers/internal/words.ts:84-104`) | the builder reads who refuses what |
| MCP's tool description (`render/internal/mcp.ts:21`) | the agent reads it before calling |
| K18's alerts (`K18-monitoring-falls-out.md:60`) | they key on `refusal.code`; the span also gets `refusal.invariant` |

**The options**

**Today** — the docs page for `handle.claim` (from `docs.ts:22`):

```text
| HandleTaken | 10 | HN-001 | declared in errors.ts |
```

**A · One generated sentence, the same everywhere, linking to the rule** (recommended)

```text
portal band   refusals: HandleTaken HN-001 ×31 — another claimed handle holds this name (oneHolderPerName ▸)
docs          | HandleTaken | 10 | HN-001 | another claimed handle holds this name; by the rule handle.oneHolderPerName |
scaffold       *   HandleTaken  exit 10  HN-001  the runtime's: another claimed handle holds this name (handle.oneHolderPerName, blueprint/things/handle/invariants.ts)
mcp           "Claim a free name… Refuses HandleTaken when another claimed handle holds this name."
```

**B · The rule's name only, no sentence**

```text
portal band   refusals: HandleTaken HN-001 ×31 (oneHolderPerName ▸)
docs          | HandleTaken | 10 | HN-001 | by handle.oneHolderPerName |
```

**C · A written `description` on each rule, shown verbatim**

```ts
// blueprint/things/handle/invariants.ts
export const oneHolderPerName = Blueprint.invariant.unique(Handle.fields.name, {
  while: [machine.states.claimed], refuse: HandleTaken,
  description: "Someone else already has this name.",
});
```

**You do X → what happens**

| Scenario | A · Generated sentence | B · Name only | C · Written description |
|---|---|---|---|
| An agent reads the MCP tool before calling | knows why it may be refused | sees a name it can't open | reads your words |
| You rename `name` to `handle` | the sentence follows | the name is unchanged | your words go stale silently |
| A new rule with no extra writing | reads well at once | reads as jargon | blank until written |
| The four surfaces stay in step | one function writes all | ✅ | ✅ one string |

**Rubric**

| Axis | A · Generated | B · Name only | C · Written |
|---|---|---|---|
| Floor-first | ✅ falls out of the declaration | ✅ | ⚠️ a blank to fill on every rule |
| Reversibility | ✅ C can be added later as an override | ✅ | ⚠️ a field to keep forever |
| Blast radius | ⚠️ four renderers share one function | ✅ | ⚠️ a new `Blueprint` field |
| Correctness | ✅ can't drift from the rule | ⚠️ says who, not why | ❌ can drift |
| Fit | ✅ "falls out for free" | ⚠️ | ⚠️ against generating words from the model |

**Recommendation: A.** The sentence comes from the declaration, so it is right on every surface and can't drift; a
written `description` can be added later as an override if a generated one reads badly.

## Q3 — Does the lifecycle mark the states a rule holds in?

**The problem, in code.** A rule is scoped by states (`while: [machine.states.claimed]`), and the lifecycle diagram is
already the top of the thing's page. Today the diagram knows nothing of rules.

```ts
// packages/generators/src/modules/render/internal/docs.ts:67-69, the machine section of the docs page
t.machine ? ["", "## Machine", "", `States: ${t.machine.states.join(", ")}. …`, "", "| move | from | to | emits |", …] : [],
```

If nobody decides, the reader has to cross-read a rule's `while` against the diagram to see where a name is held.

**What it touches**

| Dependent | Why it cares |
|---|---|
| `Graph` in `@orthograph/portal-ui` (M1.50) | the one machine drawing; a mark is a node style |
| `portal.md` "Lifecycle" (`:217-220`) | refusals already sit on the arrows they guard |
| `requires`, later | it scopes another thing's states, which this diagram doesn't draw |

**The options**

**Today** — `portal.md:217-220`:

```text
          claim  375                  release  3
  ( · ) ─────────────────► (claimed) ─────────────────► (released)
          ▲ HandleTaken ×31             ▲ HandleNotClaimed ×2
```

**A · No mark; the Rules section says the states in words** (recommended)

```text
  ( · ) ──claim──► (claimed) ──release──► (released)
          ▲ HandleTaken ×31
Rules    oneHolderPerName   a name has one holder while claimed
```

**B · A badge on each scoped state**

```text
  ( · ) ──claim──► (claimed ⚖2) ──release──► (released)
          ▲ HandleTaken ×31
```

**You do X → what happens**

| Scenario | A · No mark | B · Badge |
|---|---|---|
| A thing with three rules over different states | words in one section | three badge counts to decode |
| You hover the state | nothing new | the rules that hold there |
| `requires` scopes another thing's state | unchanged | a badge on a diagram not on this page |

**Rubric**

| Axis | A · No mark | B · Badge |
|---|---|---|
| Floor-first | ✅ nothing to build | ⚠️ a `Graph` node variant |
| Reversibility | ✅ add B later | ✅ |
| Blast radius | ✅ none | ⚠️ M1.50's `Graph`, shared with the map and worlds |
| Correctness | ✅ | ✅ |
| Fit | ✅ the arrow already shows where the refusal happens | ⚠️ a second encoding of the same fact |

**Recommendation: A.** The refusal already sits on the arrow that can break the rule, which is the useful place; a
badge repeats the Rules section in a harder code.

## Q4 — Does the operation's spine get a stop for rules?

**The problem, in code.** G5 adds a stop to the runtime's fixed order, after the move and before the commit. The
spine is drawn from that order, and a refused call is marked on the row where it stopped.

```text
// design/portal.md:260-268, the spine as designed
 ├ machine check  · → claimed          ▏ ok
 ├ step lookup    database             ▇▇ 2.0 ms
 ├ move claim     → claimed            ▏ HandleClaimed
 └ commit         1 store              ▇▇▇ attempt 1 conflict ─► attempt 2 committed  3.2 ms
```

If nobody decides, a `HandleTaken` from a rule has no row to stop on: it is marked on "the handler", which no longer
decides it (`portal.md:289-291`).

**What it touches**

| Dependent | Why it cares |
|---|---|
| The runtime's span attributes (G5 §5) | the row is drawn from `refusal.invariant` on the operation's span |
| "A call that stopped is marked on the row where it stopped" (`portal.md:289-291`) | needs a row to mark |
| The race (a commit conflict, then a refusal on retry) | two attempts, two rows |

**The options**

**Today** — `design/portal.md:260-268`: no row for rules, so a rule's refusal would be marked on the handler.

```text
 ├ move claim     → claimed            ▏ HandleClaimed
 └ commit         1 store              ▇▇▇ attempt 1 conflict ─► attempt 2 committed  3.2 ms
```

**A · A "rules" stop between move and commit, listing the rules checked** (recommended)

```text
 ├ move claim     → claimed            ▏ HandleClaimed
 ├ rules          oneHolderPerName · oneNamePerPerson   ▏ HandleTaken (oneHolderPerName)
 └ commit         —
```

**B · No new row; mark the refusal on the commit row**

```text
 ├ move claim     → claimed            ▏ HandleClaimed
 └ commit         1 store              ▏ refused HandleTaken (oneHolderPerName)
```

**You do X → what happens**

| Scenario | A · Rules stop | B · On commit |
|---|---|---|
| A plain taken name | stops on "rules" | "commit" reads as if the store refused |
| A race: attempt 1 conflicts, attempt 2 refused | attempt 1 on commit, attempt 2 on rules: the two causes apart | both on commit |
| An operation that can break no rule | no row | unchanged |
| Matches the runtime's order (`handler/service.ts`) | ✅ one row per stop | ❌ |

**Rubric**

| Axis | A · Rules stop | B · On commit |
|---|---|---|
| Floor-first | ✅ a row from the model and one span attribute | ✅ |
| Reversibility | ✅ | ✅ |
| Blast radius | ⚠️ the spine's row list in `portal.md` | ✅ |
| Correctness | ✅ says what refused | ❌ blames the store |
| Fit | ✅ the spine is the runtime's order | ⚠️ |

**Recommendation: A.** The spine is the runtime's order, and the rule is now a stop in it; it also keeps a race (a
conflict at commit) apart from a plain refusal.

## At a glance

| # | Joint | Recommendation |
|---|---|---|
| Q1 | Where a rule lives on the thing's page | A · a Rules section under the lifecycle, the docs page in the same order |
| Q2 | How a refusal names its rule | A · one generated sentence on every surface, linking to the rule |
| Q3 | Whether the lifecycle marks scoped states | A · no mark; the refusal stays on its arrow |
| Q4 | Whether the spine gets a stop for rules | A · a "rules" stop between move and commit |

**Answer key.** Reply with a letter per question, for example "1A 2A 3A 4A", or "2C" to have each rule carry your own
words. Once you answer the round, a question you skip takes its recommendation.
