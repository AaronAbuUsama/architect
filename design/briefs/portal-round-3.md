# The portal, round 3: the pages the model has and the portal doesn't

Asked 19 November 2026 by the 📐 portal designer, through the conductor. Rounds 1 and 2 (`design/portal.md`) agreed
the first page, a thing's page, an operation's page, the live rail and the chat. Mapping every field of the model to a
page (`design/portal.md`, "The model, field by field") left six kinds of declaration with no page. This round asks
where they go, before anything is drawn.

## In plain words, for the ear

Six questions, all about where things live. One: the side menu gets a second part, under the things, for everything
that isn't a thing. Two: environments get one page that compares them side by side. Three: each plugin gets its own
page, and so do stores. Four: journeys and starting worlds get pages. Five: refusal codes, roles, events and value
types get one reference page each, as lists. Six: operations that are still blank show up greyed in the menu. My
recommendation is the first option on every question.

## Shared terms

| Term | Means |
|---|---|
| tree | the left sidebar. Today it holds the app's things, then one folded group per plugin (round 2, Q3) |
| reference page | one page that lists every item of a kind, each row an anchor you can link to; no page per item |
| proof | M1.04's verdicts from the logbook: pass, fail, stale or unproven, per operation per environment |
| live | numbers from this environment's telemetry in the window (each portal reads only its own sink, Q12) |
| Plugged In | the example app (K15). Real names below are from its model on Codex's `links/stage-1`. That draft has no mounts yet, so the plugin examples (`@orthograph/handles`, auth) are round 2's stage-1 plan, and live numbers are the mock's |

---

## Q1 — Where do the pages beyond things live in the menus?

**The problem, in code.** The agreed frame's tree holds only things and plugin groups (`design/portal.md:54-71`), and
the portal on `m1` today has one home page with an operations table and a list of things
(`packages/portal/src/modules/site/internal/home.ts:48-55`). But the model has eight more kinds of declaration:

```ts
// packages/compiler/src/modules/model/types.ts:188-209 (origin/m1)
export interface Model {
  readonly refusals: Readonly<Record<string, string>>;           // no page
  readonly values: Readonly<Record<string, ValueMeta>>;          // no page
  readonly stores?: Readonly<Record<string, StoreModel>>;        // no page
  readonly things: Readonly<Record<string, ThingModel>>;         // home, tree, thing page
  readonly operations: Readonly<Record<string, OperationModel>>; // tree, operation page
  readonly journeys: Readonly<Record<string, JourneyModel>>;     // no page
  readonly startingWorlds: Readonly<Record<string, StartingWorldModel>>; // no page
  readonly blankOperations?: Readonly<Record<string, BlankOperationModel>>; // no page
  readonly environments?: Readonly<Record<string, EnvironmentModel>>;       // the switcher only
  readonly mounts?: Readonly<Record<string, MountModel>>;        // tree group labels only
}
```

If nobody decides, M1.13 builds a shell with nowhere to put five of K14's portal cards (journey, environment, store,
mount, and the codes on error), and each later page invents its own way in.

**What it touches**

| Dependent | Why it cares |
|---|---|
| M1.13's shell (Pro's `Sidebar` through `portal-ui`'s `Tree`) | builds the menu once; moving pages later breaks links |
| K14's portal column | journey, environment, store and mount cards each need a view to be green |
| The face `sidebar` slot (Q11) | Work and Factory add their own groups; they need a fixed place |
| ⌘K search and URLs | one URL per declaration, from its name (F2 section 5) |

**The options**

**Today** — the agreed frame, `design/portal.md:54-71`:

```text
links
  ▸ profile
  ▸ link
handles · feature
  ▾ handle
    claim · release · resolve
auth · feature
  ▸ person · session
portal · feature
```

**A · One sidebar, things first, then a Blueprint section** (recommended)

```text
Plugged In                      model 4e1c9a2
  Home
THINGS
  ▸ profile
  ▸ link
  handles · feature     ← the group header opens the plugin's page (Q3)
    ▸ handle
  auth · feature
    ▸ person · session
BLUEPRINT
  Environments    4
  Journeys        5
  Access
  Refusal codes  13
  Events          8
  Plugins         2
  Stores          1
  Values          8
WORK · FACTORY                  ← extension groups, from each face's `sidebar` slot
```

**B · An icon rail that swaps the sidebar** (Supabase's shape)

```text
┌──┬───────────────┐
│◎ │ THINGS        │   ◎ Things      the tree as agreed
│✓ │  ▸ profile    │   ✓ Proof       environments, journeys, worlds, the matrix
│≡ │  ▸ link       │   ≡ Reference   access, codes, events, values
│⧉ │  …            │   ⧉ Plugins     plugins, stores
│▤ │               │   ▤ Work        extension faces
└──┴───────────────┘
```

**C · Things only; everything else through ⌘K and links**

```text
THINGS
  ▸ profile
  ▸ link
  …
(no other entries; Environments sits in the top bar's switcher menu, codes and events are reached from a thing's page)
```

**You do X → what happens**

| Scenario | A · Blueprint section | B · Icon rail | C · Things only |
|---|---|---|---|
| You want every refusal code in the app | one click: Refusal codes | two clicks: Reference, then codes | ⌘K "HN-", or visit each thing |
| You open a plugin with 12 things | it folds in the tree; its header opens its page | same, under Plugins | it folds; no plugin page to open |
| Work and Factory are mounted | they appear as groups at the bottom | each gets an icon | they need a home anyway |
| You're on `handle` and want its journeys | the journeys section on its page, or Journeys in the menu | switch to Proof, lose the things tree | links on the page only |
| A new kind arrives (workflows, views) | one more row under Blueprint | one more icon | links only |

**Rubric**

| Axis | A · Blueprint section | B · Icon rail | C · Things only |
|---|---|---|---|
| Floor-first | ✅ one `Tree` with two sections, Pro's `Sidebar` has sections | ⚠️ a rail plus a sidebar per section | ✅ least to build |
| Reversibility | ✅ rows add; URLs don't depend on the menu | ⚠️ the rail's grouping is baked into navigation | ⚠️ adding menus later re-teaches everyone |
| Blast radius | ✅ the shell only | ⚠️ the shell and every page's context | ✅ none now, more later |
| Correctness | ✅ every model kind has one way in | ✅ every kind has one way in | ❌ five kinds unreachable but by search |
| Fit | ✅ F2's sitemap folded into round 2's tree; place still tells kind | ⚠️ hides the things tree when you leave it | ⚠️ against "the tree is the model" |

**Recommendation: A.** It keeps round 2's tree as it is and gives every kind of declaration one place, with the
fewest moving parts.

---

## Q2 — Environments: one page comparing them, or a page each?

**The problem, in code.** Round 2's Q12 agreed a switcher and a proof matrix "reached from the top bar's environment
menu", but drew neither. An environment has thirteen fields; the portal's wire reads four:

```ts
// packages/portal/src/modules/wire/types.ts:67 (origin/m1)
const Environment = Schema.Struct({ name: Schema.String, runs: Schema.String, promotesFrom: Schema.NullOr(Schema.String), lifetimeMs: Schema.NullOr(Schema.Number) });
```

Plugged In declares four (`local`, `test`, `staging`, `production`). Staging and production both say `runs: "always
on"`, `identity: "better-auth"`, and production `promotesFrom: "staging"`. Each portal reads only its own sink, but
every environment's declaration and its proof (the logbook) are readable from any of them. If nobody decides, the
switcher is drawn with nothing behind it, and "is staging set up like production?" has no answer in the portal.

**What it touches**

| Dependent | Why it cares |
|---|---|
| M1.13's top bar | the switcher and its menu are its first control |
| K14's environment portal card | green needs the switcher built from the model and the environment's details |
| The proof matrix (home.ts:36-57 today) | today it is the home page; Q12 moved it behind the switcher |
| K17's per-environment rule | "the environment decides only bindings": the page should show bindings side by side |

**The options**

**Today** — `packages/portal/src/modules/site/internal/home.ts:53`, the matrix is the home page:

```text
Operation        local ✔     test ✔      staging stale    production unproven
handle.claim     …
```

**A · One Environments page, environments as columns** (recommended)

```text
Environments                                   [Setup]  [Proof]
                 local            test               staging          production
runs             on this machine  fresh world per PR always on        always on
identity         test principals  test principals    better-auth      better-auth
lifetime         —                2 h                —                —
database         D1 local         —                  D1               D1
secrets          —                —                  (names only)     (names only)
telemetry        local            —                  —                —
deploy           —                —                  worker           worker
publish          —                —                  npm next         npm latest
promotes from    —                —                  —                staging
live version     working tree     —                  rev 9c1…         rev 7a2…  (from the logbook)
● you are here: local · live numbers are this environment's only
```

The Proof tab is the matrix: every operation down, every environment across. The switcher's menu lists each
environment (with its domain) and "Compare environments", which opens this page.

**B · A page per environment** (F2's `/environments/staging`)

```text
staging                                  always on · better-auth · promotes to production
Setup     database D1 · deploy worker · publish npm next · secrets (names only)
Proof     18 operations: 15 pass · 2 stale · 1 unproven
Live      only when you are in staging's portal
```

**C · No page: the switcher's menu carries it**

```text
[ local ▾ ]
  local       on this machine · test principals
  staging     always on · better-auth
  production  always on · promotes from staging
  ─────────
  Proof matrix
```

**You do X → what happens**

| Scenario | A · Compare page | B · Page each | C · Menu only |
|---|---|---|---|
| "Is staging set up like production?" | one page, rows side by side | open two pages and compare | not answerable |
| "Why is `handle.claim` stale in staging?" | Proof tab, the cell, its reason | staging's page, its proof row | the matrix |
| A fifth environment is added | one more column | one more page | one more menu row |
| You are in production's portal | you still see every environment's setup and proof; live numbers are production's | the same, one at a time | the same, in a menu |

**Rubric**

| Axis | A · Compare page | B · Page each | C · Menu only |
|---|---|---|---|
| Floor-first | ✅ one page, one `Grid` | ✅ one page template | ✅ least to build |
| Reversibility | ✅ a per-environment page can be added as a column's link | ✅ a compare view can be added | ⚠️ the setup has to go somewhere later |
| Blast radius | ✅ the wire's environment and one page | ✅ the same | ✅ the menu |
| Correctness | ✅ every field shown, live numbers only for the current one | ✅ the same | ❌ most fields never shown |
| Fit | ✅ K17's "only bindings change" is visible as rows | ⚠️ hides the comparison | ⚠️ the menu becomes a page |

**Recommendation: A.** The questions people ask about environments are comparisons, and promotion is a chain
across them.

---

## Q3 — Plugins and stores: their own pages, or only labels?

**The problem, in code.** A mount carries what it chose, what it left out and what it needs, and the agreed design
uses only its name and version, as a tree label:

```ts
// packages/compiler/src/modules/mounts/types.ts:8-27 (origin/m1)
export interface MountModel {
  readonly kind: "feature" | "adapter" | "projection";
  readonly package: string; readonly version: string; readonly integrity: string;
  readonly chosen: Readonly<Record<string, string>>;       // the options picked
  readonly omitted?: ReadonlyArray<string>;                // operations left out
  readonly narrowed?: Readonly<Record<string, ReadonlyArray<string>>>; // ways in narrowed
  readonly needs?: ReadonlyArray<string>;
  readonly calls?: ReadonlyArray<string>;                  // an adapter's calls
  readonly standIn?: { readonly how: "process" | "vendor" | "none"; readonly what?: string };
  …
}
```

Stores (`StoreModel`: name, file, kind, `from`) are not on the wire at all (`wire/types.ts:70-75`), and K14's store
card points at "M5.06's data page", which nobody has designed. Plugged In stage 1 mounts `@orthograph/handles` and
auth, with one default store; stage 3 has about fifteen things in eight groups. If nobody decides, "which options did
we pick for handles, and what stands in for the chain in a world?" is answerable only from the source.

**What it touches**

| Dependent | Why it cares |
|---|---|
| The tree's plugin groups (round 2, Q3) | the group header is the natural way into a plugin's page |
| K14's mount and store portal cards | green needs the plugin named on each page and every store listed |
| A thing's page header | names its plugin and version; would link to the plugin and store |
| The spine | an adapter call row names its mount; it would link to the plugin page |

**The options**

**Today** — `design/portal.md:129`, a label in the thing's header:

```text
handle                                                         handles · feature · @orthograph/handles 0.1.0
```

**A · A plugin page from the tree's group header, and a Stores page** (recommended)

```text
handles                                   feature · @orthograph/handles 0.1.0 · integrity sha256-…
Mounted by blueprint/features/handles.ts
Choices      reserved names: off (default)
Left out     —            Narrowed  handle.resolve: not in MCP
Needs        auth
Things       handle (3 operations)          live: 2,321 calls · 39 refused · 0 defects
Stores       —

Stores
name       kind       from                 things             local     staging   production
default    database   the app              profile, link, …   D1 local  D1        D1
```

**B · One "Plugins and stores" list page, no page per plugin**

```text
Plugins                                         Stores
handles   feature  0.1.0   1 thing              default  database  9 things
auth      feature  0.1.0   2 things
```

**C · Labels only: the header chips, details in the docs**

```text
handle    handles · feature · 0.1.0   lives in: default (database)
```

**You do X → what happens**

| Scenario | A · Plugin page + Stores | B · One list | C · Labels |
|---|---|---|---|
| "Which options did we choose for handles?" | the plugin page | not shown | the source file |
| An adapter (`erc20`, stage 2) has a stand-in | the plugin page says "process: anvil" | a column, maybe | not shown |
| "Which things live in the vault's store?" (stage 3) | Stores page, one row | one row | open every thing |
| You remove a plugin | its group and its page go with it | its row goes | its labels go |

**Rubric**

| Axis | A · Plugin page + Stores | B · One list | C · Labels |
|---|---|---|---|
| Floor-first | ✅ two generated pages | ✅ one page | ✅ nothing new |
| Reversibility | ✅ additive | ✅ additive | ✅ additive |
| Blast radius | ✅ the wire's mounts and stores, two pages | ✅ the same wire, one page | ✅ the wire only |
| Correctness | ✅ every mount and store field shown | ⚠️ choices, omissions and stand-ins dropped | ❌ most fields never shown |
| Fit | ✅ the group header already exists; F2's "one URL per declaration" | ⚠️ a settings-style list beside a model-shaped tree | ⚠️ "falls out" in name only |

**Recommendation: A.** The tree already has the plugin's group, so its header opening the plugin's page costs one
route, and the store page answers K14's card without waiting for M5.06.

---

## Q4 — Journeys and starting worlds: pages, or only the proof tab?

**The problem, in code.** Journeys and starting worlds are in the model on `m1`, but the portal marks them
unavailable:

```ts
// packages/portal/src/modules/wire/service.ts:6-7 (origin/m1)
const UNAVAILABLE = {
  journeys: { state: "unavailable", reason: "the compiler's model has no journey projection" },
```

That reason is stale: `JourneyModel` and `StartingWorldModel` exist (`model/types.ts:137-164`). The agreed design
shows journeys only as the operation's proof tab. Plugged In has five journeys; "a name is claimed once" starts from
the world `claimed-aaron`, casts `aaron`, `bob` and `visitor`, and checks `refuses(HandleTaken, { code: "HN-001" })`,
`noEvents()` and which spans are absent. If nobody decides, a failing journey can only be read in a terminal.

**What it touches**

| Dependent | Why it cares |
|---|---|
| K14's journey portal card | green needs the wire to decode journeys and show their verdicts |
| The operation's proof tab | lists the journeys that cover it; would link to each |
| M2.08 (journeys through each client) | each journey gets a verdict per client, which needs a home |
| The trace drawer | a journey step's call is a trace; a step could open it |

**The options**

**Today** — the operation's proof tab (`design/portal.md:198`): "each eval's verdict, the journeys that cover the
operation, and what is unproven".

**A · A Journeys page, a page per journey, a page per world** (recommended)

```text
a name is claimed once                       starts from: claimed-aaron · local ✔ · test ✔ · staging ✔
Cast   aaron (signed-in) · bob (signed-in) · visitor (anyone)
1 ✔ retrying the first request returns the same handle and does no work
     aaron → handle.claim { name: "aaron" } request first-claim
     checks: answer · no events · spans absent              [open trace ▸]
2 ✔ a fresh request to claim the same name is refused
     aaron → handle.claim { name: "aaron" } request another-claim
     checks: refuses HandleTaken HN-001 · no events · spans absent

claimed-aaron (world)            from: —   cast: aaron
makes   aaron → handle.claim { name: "aaron" } request first-claim
gives   aaronHandle             used by: a name is claimed once, claim a public page
```

**B · A page per journey; its world shown inline at the top**

```text
a name is claimed once
Starts from claimed-aaron: aaron → handle.claim { name: "aaron" }; gives aaronHandle
1 ✔ …
```

**C · Only the proof tab, as agreed**

```text
handle.claim · Proof
journeys   a name is claimed once ✔ · claim a public page ✔
```

**You do X → what happens**

| Scenario | A · Pages for both | B · Journey pages | C · Proof tab |
|---|---|---|---|
| A journey fails in staging | its page shows which step and which check; the step opens its trace | the same | a red mark on the operation, no step |
| Three journeys start from one world | the world's page lists them | the world repeats on each | not shown |
| A world builds on another (`from`) | the chain is a link | inline, one level | not shown |
| You want every journey's state at once | the Journeys page | the Journeys page | visit each operation |

**Rubric**

| Axis | A · Pages for both | B · Journey pages | C · Proof tab |
|---|---|---|---|
| Floor-first | ✅ three generated pages | ✅ two | ✅ as agreed |
| Reversibility | ✅ additive | ✅ a world page can come later | ✅ additive |
| Blast radius | ✅ the wire's journeys and worlds, three pages | ✅ the same wire | ✅ the proof tab |
| Correctness | ✅ every journey and world field shown | ⚠️ `from` chains flattened | ❌ steps and checks never shown |
| Fit | ✅ K14: the portal is the end state of every lane | ✅ close | ⚠️ the journey lane has no view |

**Recommendation: A.** Journeys are how the app is proved, so a failing one should be readable step by step, and
worlds are shared and chained, so they earn a page.

---

## Q5 — Access, refusal codes, events and values: reference pages, or only on things?

**The problem, in code.** The agreed thing page lists its own events, errors and roles. But some of this is
project-wide by nature:

```ts
// packages/compiler/src/modules/model/types.ts:189-191 (origin/m1)
/** Every refusal in the project and its code: declared errors, each machine's, and the runtime's (`NotAllowed`). */
readonly refusals: Readonly<Record<string, string>>;
readonly values: Readonly<Record<string, ValueMeta>>;
```

Plugged In has thirteen refusal codes across seven things (`HN-001` to `HN-003`, `HN-900`, `LI-001`, `LI-002`,
`LI-900`, `AR-001` for `NotAllowed`, …), and who may call is spread across eighteen operations (`signed-in`,
`anyone`, `handle.handleOwner`, `link.linkOwner`). F2 (17 November) proposed an index for each, with no page per item;
that was never taken to Aaron. If nobody decides, "what does HN-900 mean?" and "what can a signed-in stranger do?"
mean opening thing after thing.

**What it touches**

| Dependent | Why it cares |
|---|---|
| K14's error, roles and event portal cards | each needs its codes, rules or fields shown |
| The CLI and SDK | print a code (`[HN-001]`); a person searching it should land on one row |
| M2.03 (roles reach callers) | the access table is what a caller needs before calling |
| The `on:` handlers | an event's listeners live on other things; only a cross-cutting page shows them together |

**The options**

**Today** — the thing page's sections (`design/portal.md:140-142`):

```text
Events     HandleClaimed { handle, name, owner } · HandleReleased { handle }
Errors     HandleTaken HN-001 exit 3 · HandleNotClaimed HN-002 exit 3
Roles      person · anyone
```

**A · Four reference pages, rows as anchors** (recommended)

```text
Refusal codes                                              local · last 30 min
code    name                 exit  thing    raised by                     refused
HN-001  HandleTaken          3     handle   handle.claim                  31
HN-002  HandleAlreadyOwned   4     handle   handle.claim                  0
HN-900  HandleNotClaimed     5     handle   handle.release (machine)      2
AR-001  NotAllowed           —     —        every operation with a rule   6

Access
operation         who may call             rule
handle.claim      signed-in
handle.release    handleOwner (handle)     handle.owner === caller.person
handle.resolve    anyone

Events: name, fields, the move that emits it, its on: handlers, committed in the window
Values: HandleName, LinkTitle, LinkUrl, … with their type, limits and the fields that use them
```

**B · A page per item** (one per code, event, role and value)

```text
HN-001 HandleTaken
exit 3 · thing handle · raised by handle.claim · 31 refused in the window
```

**C · Only on thing and operation pages, plus ⌘K**

```text
⌘K "HN-001" → handle, errors section
```

**You do X → what happens**

| Scenario | A · Reference pages | B · Page per item | C · On things only |
|---|---|---|---|
| A user reports "[HN-900]" | ⌘K or Refusal codes, one row, linked to `handle.release` | its own page | ⌘K to `handle`, then find it |
| "What can anyone do without signing in?" | Access, filter `anyone` | open each role's page | open all eighteen operations |
| "What listens to `HandleClaimed`?" | Events, its row lists `on:` handlers | its page | not shown (the listener is on `profile`) |
| A plugin adds forty codes | forty rows, grouped by thing | forty pages | forty rows across pages |

**Rubric**

| Axis | A · Reference pages | B · Page per item | C · On things only |
|---|---|---|---|
| Floor-first | ✅ four generated tables | ⚠️ four templates, many thin pages | ✅ nothing new |
| Reversibility | ✅ an anchor can become a page later | ⚠️ pages are hard to fold back | ✅ additive |
| Blast radius | ✅ four pages; the wire's codes, rules and event fields | ⚠️ the same wire, more routes | ✅ the wire only |
| Correctness | ✅ every code, rule and listener in one place | ✅ the same, spread out | ⚠️ listeners and access across things never shown together |
| Fit | ✅ F2's "an index each, no page per item" | ⚠️ items have little beyond "raised by" (F2) | ⚠️ codes are project-wide by declaration |

**Recommendation: A.** These are lookups, so a table you can search and link into beats a page per item, and the
thing page keeps its own sections as agreed.

---

## Q6 — What's missing: where do blank operations show?

**The problem, in code.** An operation with blanks left is in the model but has no generated entry points:

```ts
// packages/compiler/src/modules/model/types.ts:198-204 (origin/m1)
/** Incomplete operations are described here and have no generated entry points. */
readonly blankOperations?: Readonly<Record<string, BlankOperationModel>>;
/** What is still `Blueprint.todo`, by declaration (`allowance`, `allowance.spend`): present only when something is. */
readonly blanks?: Readonly<Record<string, ReadonlyArray<string>>>;
```

The agreed pages show nothing about them, and the portal-design skill asks that "the operation's page shows … what is
specified or still underspecified". If nobody decides, an operation being designed is invisible in the portal until
it is finished, which is exactly when the builder and stakeholders need to see it.

**What it touches**

| Dependent | Why it cares |
|---|---|
| The tree and a thing's operations grid | where a blank operation would sit |
| K16 (the scaffold explains itself) | the blanks the scaffold leaves are these |
| The board (M3.17) | each blank links to its work item |
| The wire | decodes `blanks` today, not `blankOperations` |

**The options**

**Today** — not shown; the wire keeps `blanks` (`wire/types.ts:74`) and no page reads it.

**A · In the tree, greyed, with a "blank" chip; their page is the spec** (recommended)

```text
THINGS
  ▾ link
    add · order · remove
    pin   blank                ← greyed
link.pin · blank                         no calls: not generated until its blanks are filled
Spec        description ✔ · payload ✔ · answer ✔ · move ✗ · allowed ✗
Blanks      move, allowed
Home        "Still blank: 1 operation, 2 declarations"  →  a list
```

**B · One "Spec" page listing every blank, nothing in the tree**

```text
Still blank
link.pin    move, allowed
```

**C · Hidden until filled**

```text
(link shows add · order · remove)
```

**You do X → what happens**

| Scenario | A · In the tree | B · Spec page | C · Hidden |
|---|---|---|---|
| An agent adds `link.pin` with two blanks | it appears greyed under `link` | a row on the Spec page | nothing |
| A stakeholder reviews what's being designed | sees it where it will live | must know to open Spec | can't |
| The blanks are filled | the chip goes, the page lights up | the row goes | it appears |

**Rubric**

| Axis | A · In the tree | B · Spec page | C · Hidden |
|---|---|---|---|
| Floor-first | ✅ the tree and one page state | ✅ one page | ✅ nothing |
| Reversibility | ✅ the chip can be hidden by a filter | ✅ additive | ✅ additive |
| Blast radius | ✅ the wire's `blankOperations`, the tree, the operation page | ✅ the same wire, one page | ✅ none |
| Correctness | ✅ shown where it will live | ✅ shown | ❌ invisible while it's designed |
| Fit | ✅ "ideate, design, build, monitor" in one place | ⚠️ apart from the thing | ❌ against the skill's spec status |

**Recommendation: A.** An operation being designed should sit where it will live, marked as not yet real.

---

## At a glance

| # | Joint | Recommendation |
|---|---|---|
| Q1 | Where pages beyond things live | A · one sidebar: things, then a Blueprint section, then extension groups |
| Q2 | Environments | A · one page comparing them as columns, with a Proof tab (the matrix) |
| Q3 | Plugins and stores | A · a plugin page from the tree's group header, and a Stores page |
| Q4 | Journeys and worlds | A · a Journeys page, a page per journey and per world |
| Q5 | Access, codes, events, values | A · four reference pages, rows as anchors |
| Q6 | Blank operations | A · in the tree, greyed, with a spec page |

## Answer key

Reply with one letter per question, for example "1A 2A 3A 4B 5A 6A", or "all A". Anything else, say it in words.
