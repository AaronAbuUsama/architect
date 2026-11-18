# Where everything stands

Kept by the conductor after every merge, decision, new thread or archive, so a fresh agent (Claude or Codex) continues
exactly where the last one stopped. The narrative of goal 1 (layers 1 and 2) is in
[`history/handoff-layers-1-2.md`](history/handoff-layers-1-2.md).
Everything open, promised, deferred or stale, with its source, canon page and owning slice: [`ledger.md`](ledger.md).

## START HERE (18 November 2026): the conductor's handoff

Codex worked Aaron's Orthograph DX discussion (architecture and DX only, the mini DAO walkthrough; no DAO code) and
handed back to the Claude conductor. Its decisions are carried into K5 below. The whole-shape decision is first: the
docs canon and the generated app stay paused until it is agreed.

### The job you are taking over

You are the **conductor** (`.agents/skills/conductor/SKILL.md`). Aaron, 18 November: "your job is higher level.
understand the big picture and where things are moving and helping me to stay on top of all the threads. here we set
the overall direction and how the bits all relate to each other while keeping a definition of done for all the
threads and how they relate to our goal." So:

- **Don't build.** Each piece of work is a thread with one brief, one branch, one PR and one done-when. You start
  threads, steer them, relate them, and merge or retire them.
- **Keep this file current** after every merge, decision, new thread or archive.
- **Before you report on a thread, read its PR and its last commits**, not its last summary.
- **Answer "where are we" as a short sitrep.** Aaron listens rather than reads: plain words, short sentences.
- **When you put a choice to Aaron**, follow the grill format in `~/.claude/CLAUDE.md`: real code with `file:line`,
  what it touches, the options drawn as code, a scenario table, a rubric, a recommendation.
- **Standing rules** (`AGENTS.md`): no keys printed, no cloud credentials without his written yes, $10 a day, destroy
  everything you make, no attribution lines in commits or PRs, pin versions exactly with the three-day release age
  (R1), never enter passwords (npm sign-in is Aaron's).

**How the threads are reached.** The threads below are Claude Code desktop sessions. Their ids (`local_…`) work only
from a Claude session on Aaron's machine. A Codex conductor reaches the same work through **git and GitHub**: each
thread's branch, its PR, its PR comments. To steer a thread, comment on its PR, or ask Aaron to forward the message.
New threads you start are your own, on branches you name.

### The goal

**Workable at the end of M2:** plugins mounted and proved, auth and organizations as plugins, the new principals,
secrets by declaration ([`milestones.md`](milestones.md)). Then Aaron builds Capxul's plugins on it. Everything below
is judged by whether it gets us there sooner and truer.

### The direction (Aaron, 17 and 18 November)

1. **Docs first.** The docs canon (MDX) is the spec the code is built to. **M1 is held** until the whole shape (K5),
   canon layer 1 and the generated app's template are agreed.
2. **Everything falls out of the blueprint.** The blueprint is verbose because agents write it. In return, docs, the
   app, live observability and the agent kit are generated, never configured by hand.
3. **Design the whole shape together, then the details in layers** (Aaron: "the whole thing has got to be thought
   about together … we can do the details in the layer, but the overall thing … has to all be making sense now").
   That covers the core pieces, languages, hosts, plugins, data, doors, auth and the app. This is K5.
4. **One thing, not two; agent-native forked as our own** (Aaron, 18 November: "we're going to keep the agent
   native shapes of actions, and reuse the templates, but we're going to make them our own so we can break
   compatibility with agent native if necessary"). Orthograph is the framework people build their own apps with; those
   apps use the generated SDK, CLI, MCP tools and actions. **An action keeps agent-native's `defineAction` shape**, is
   generated from an operation and calls the SDK; the operation keeps its authority. **The portal is the builder's place
   to understand and plan with the running system: agent-native's templates, forked at 0.228.2 into our own packages and
   changed freely**, compatible while that costs nothing. Upstream changes are pulled by hand. No agent-native Postgres
   or auth bridge in the shape K5 was assuming.
5. **The portal starts from things and their lifecycles**, then operations, machines, events, errors and notes
   attached to their thing (#41's `UX.md`). It shows declared behaviour and lets live evidence light up that same
   structure, giving context for planning. **Telemetry, not analytics.** #39's findings are research for the one portal.
   **Parked:** the plans and factory surfaces, Dispatch, and the skills proposal (#37).
6. **The worked example is the community workshop mini DAO**: draft text and frozen revisions in D1 (Effect
   operations), one governance contract owning proposals, eligibility, one vote per member and the tally, publishing as
   the cross-owner workflow (freeze the revision, wallet approval, the confirmed contract event linked back), Noir for
   private membership with a public tally. Governance is the reusable feature; a forum integration is the adapter
   example. At every seam: what the developer writes, what falls out, who enforces it, what the portal shows as evidence.
7. **The name is Orthograph**, the command `ortho`, the npm scope `@orthograph`, with "blueprint" kept (K6, PR #42).
   The code still says Forman until the rename sweep, which runs after the design PRs land.

### Every open line

The first ledger and the Claude handoff are on `main` (PRs #43 and #46).

| # | Line | Branch and head | PR | Done when | State now | Next |
|---|---|---|---|---|---|---|
| ⓚ | **The whole shape (K5)** | `design/k5-whole-shape` | #44 | K5 revised around Aaron's DX decisions with the mini DAO end to end; every seam answers what the developer writes, what falls out, who enforces it and what the portal shows; affected slices in `milestones.md` listed (changed, new, parked); only unsettled forks re-asked in one round; merged | **Revising** (brief sent 18 November). Q1 to Q3 largely answered by Aaron's decisions. Gaps to settle or own (verified on `main` at `a116fc9`): the chain binding and operation-to-ABI mapping (`language-solidity` is a placeholder; compiler is server-only; the Noir spike skipped proof verification on its network); the SDK's caller and tool exposure, retry identity, wallet submission and confirmation, typed refusals; in-flight step signals (the Worker flushes after the response, `live.ts:29-49`); journal or chain evidence for committed events; journeys and starting worlds in the model; plugin mounting and the fixed renderer list; operation-level `emits:` (a proposal); the workflow declaration, wake-up, dedup and replay | Review the revision against the decisions, then Aaron's round |
| ① | **Docs canon (MDX)** | `claude/docs-canon-cf2c38` @ `02d8bc7` | #38 | **Pass 1:** outline, template, components, `stores` and `traces` agreed. **Pass 2:** every page written in layers, in dependency order, checking with the ledger before each layer; the canon check passes on `main` | Layer 1 drafted (forman, blueprint, things, machines, operations, handlers) and **held: no pages while K5 is open**. Example picked by Aaron: **B, a sign-up sheet**, `examples/signup` (one thing, `sheet`: open, full, closed; open, join, close, get; anyone may call), built and proving locally. acme stays the tests' fixture. `stores` is a draft with three gaps for a decision round. Found that secret and private fields are hidden only through MCP, not over HTTP, the SDK or the CLI (note `answers-are-not-redacted`, no slice) | When K5 merges: re-layer `docs/canon/outline.md` on K5's layer order, re-quote layer 1 on signup, then Aaron reviews layer 1 |
| 📒 | **Open-issues ledger** | `claude/ledger-followup-1`; `claude/ledger-k5` | #45, #47 | Each new gap is sourced, mapped to a canon page, and marked with its owner or need for a slice | The main ledger landed in #43. #45 records the selected name, the sign-up example, and the race journeys cannot stage. #47 adds K5's provisional answers and follows #45 | Land #45, then validate #47 on the new main. Keep provisional items open until K5 merges |
| ③ | **Generated app (our agent-native template)** | `spike/generated-app` @ `c0f0abd` | #41 | **Pass 1:** the template defined in #41's body on real data (IA, page kinds, generated vs written vs live, what `generate` writes, state, live data, chat). **Pass 2:** working locally, generated from the model | Prototype built against acme (agent-native 0.228.2, one action per operation in `spikes/generated-app/generator/actions.ts`, pages, live spans, chat). Aaron's answers recorded in `spikes/generated-app/design/UX.md`: telemetry not analytics; things with their notes; no plans; one new template. **Structure paused until K5** | After K5: fix the template's structure to K5, then pass 1 for Aaron |
| ⓢ | **Span gaps: role check and move** | `fix/operation-span-first` @ `335a369` | #48 | A denied call is traceable without running its handler, and a move belongs to the operation's span | Claude committed the recovered patch and local trace evidence. Independent review found denied payload text exported before authorization, a name collision with a declared `access` step, and contradictory O2 and M1.20 checks | Keep the PR open for the reviewed corrections. Coordinate the refusal and free-text behavior with M1.19 and M1.20 before landing |
| 🏷 | **Naming: Orthograph** | `naming` | #42 | K6 and the name map land and the naming gate passes | Aaron selected Orthograph. The two prose references that failed the existing gate were fixed. All 17 naming tests passed locally on the refreshed branch | Land with fresh CI. Aaron creates the `@orthograph` npm org. The sweep waits for the design PRs listed in K6 |
| 🔁 | **Rename sweep to Orthograph** | (not started) | — | Every living name is Orthograph, `ortho`, `@orthograph/*`; the old-names lint rule covers "forman"; the gates pass | Session `local_114ab810…` is idle pending the K6 design dependencies: #37, #38, #41, #43 and K5 | Start it only after those land. It's one mechanical sweep, like M0 |
| ② | **Skills and workflows (K4)** | `claude/build-skills-8a1083` @ `137081d` | #37 | Aaron answers its four questions; K4 updated and merged | **Parked** (Aaron, DX discussion) | Revisit after K5 |
| ④ | **Portal observability spike** | `spike/portal-observability` @ `ded93d7` | #39 | Merged for the record | Done. A page is a pure function of `model.json` plus a telemetry window, read from the Collector's JSONL files via prove's `FileSource` | Merge for the record |
| — | **work-real spike** | `spike/work-real` @ `af9f18d` | #28 | Merged for the record before M3 | Parked | Merge before M3 |

**Other branches not merged into `main`, all parked and owned by nothing:** `layer/4` and `author/stage4-checks` and
`author/stage4-graph-checks` (kept for the M1 harvest); `author/m0-names`, `build/M0.05` (M0 leftovers: check they're
in `main`, then delete); `build/portal-pro`, `design/kits-decision`, `design/work-blueprint`,
`claude/design-agent-harness-e6e8ff` (older design lines: read each one's last commit before deciding).

### How the pieces relate

```text
                        goal: workable at end of M2
                                   ▲
   M1 the complete model and plugins ──► M2 auth and organizations
     ▲ held until ⓚ, ① layer 1 and ③ pass 1 agree
     │
 ⓚ K5 the whole shape ──► sets ①'s layer order, ③'s structure, ②'s agent kit, M1.01
     │                         ▲ reads 📒 (what is open) and ③'s agent-native reading
 📒 ledger ◄──► ① canon (talk both ways; ① writes, 📒 never edits the canon)
 ③ generated app ── reads ④ (the live data path) ── uses ⑤ (animations)
 🏷 K6 Orthograph ──► 🔁 rename sweep, after ⓚ ① ③ 📒 land
 decided and merged: K2 frame (partly superseded by K5 and K6) · K3 stores and sources · O2 trace gaps · M0
```

### What waits on Aaron

1. **K5's revised round**, PR #44, once the revision lands (only the forks his DX decisions leave open). The critical path; the canon's new seven-layer order (layer 1 · the shape) waits on it too.
2. Create the **`@orthograph` npm org** at his computer.
3. The skills design, PR #37: parked.
4. **Canon layer 1** review, PR #38, after it's re-layered on K5.
5. **The template's pass 1**, PR #41, after K5.

### Next on the critical path

K5 answered and merged → the canon re-layers and the generated app fixes its structure on K5, in parallel → Aaron
agrees canon layer 1 and the template → merge #37, #38 and #41 → the rename sweep → M1 starts with M1.01 (the plugin
descriptor decision), folding in K5. M1.17 to M1.20 (stores, the commit span, untraced text, call counts) run in
parallel. The M1 harvest takes `layer/4` and the two `author/stage4-*` branches.

### Open questions carried by threads

- **Doors:** whether running agent-native's server beside the Worker meets "one thing, not two" (K5 Q1).
- **Secret and private fields over HTTP, the SDK and the CLI** are sent unredacted. Only MCP hides them. No slice
  owns it yet (canon note `answers-are-not-redacted`).
- **Journeys can't force a race** between two calls, so no journey proves a conflict. Tied to M1.18.
- **The Collector without Docker:** a native `otelcol-contrib`, or OTLP straight into the app (③ decides).
- **Journeys aren't in the model** (M1.03), so proof status can't be shown live.
- **191 ledger items are owned by no slice.** After K5, each becomes a slice or a canon question.

## Done

- **Visuals spike and the `visuals` skill:** merged in PR #34 (18 November).
- **This board's last round:** merged in PR #40.

- **M0, land and rename:** merged in PR #32. Forman, `forman`, `@formants/*`, `language-*`, the lint rule against old
  names, the docs as one page. Evidence in [`evidence/M0.02/`](evidence/M0.02/) to [`evidence/M0.06/`](evidence/M0.06/).
- **K3 and O2:** merged in PR #36. Stores of open kinds, sources through adapters; the three trace gaps with their
  slices.
- **Branch triage:** merged in PR #33. The portal-docs spike kept as its own line; idle worktrees and merged branches
  removed.

**Traps carried over from goal 1** (full list in the old handoff): run `pnpm nx reset` then
`NX_DAEMON=false pnpm nx sync` after any generator change; Gate 2's teardown removes every new container with the
framework's prefix, so don't run two gates at once; a killed Gate 2 run can leave its registry container behind.
