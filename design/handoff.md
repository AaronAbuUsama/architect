# Where everything stands

Kept by the conductor after every merge, decision, new thread or archive, so a fresh agent (Claude or Codex) continues
exactly where the last one stopped. The narrative of goal 1 (layers 1 and 2) is in
[`history/handoff-layers-1-2.md`](history/handoff-layers-1-2.md).
Everything open, promised, deferred or stale, with its source, canon page and owning slice: [`ledger.md`](ledger.md).

## START HERE (18 November 2026): the conductor's handoff

K5, the whole shape, merged on 18 November (PR #44, `78ecf65`). That evening Aaron cut the work down to three threads
and one critical path ("we've got too many chats talking to too many chats"). The conductor merged the finished
record PRs, closed the two that couldn't land, and archived the finished threads. Later that evening the canon's layer
1 (#38, merged by Aaron), naming (#42), the rename sweep (#51) and the ledger round (#47) all merged, and Aaron set the
growing example (direction item 7). The hello world runs on `main`: `examples/signup` checks, proves 9 evals on every
operation, runs under `ortho dev`, and its generated CLI opens, joins and reads a sheet.

### The job you are taking over

You are the **conductor** (`.agents/skills/conductor/SKILL.md`). Aaron, 18 November: "your job is higher level.
understand the big picture and where things are moving and helping me to stay on top of all the threads. here we set
the overall direction and how the bits all relate to each other while keeping a definition of done for all the
threads and how they relate to our goal." So:

- **Don't build.** Each piece of work is a thread with one brief, one branch, one PR and one done-when. You start
  threads, steer them, relate them, and merge or retire them.
- **Keep threads few.** Three at a time is the working number (Aaron, 18 November). Threads report to the conductor,
  not to each other. Merges, closes and small fixes are the conductor's own work, not a new thread.
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

### The goal

**Workable at the end of M2:** plugins mounted and proved, auth and organizations as plugins, the new principals,
secrets by declaration ([`milestones.md`](milestones.md)). Then Aaron builds Capxul's plugins on it. Everything below
is judged by whether it gets us there sooner and truer.

### The direction (Aaron, 17 and 18 November)

1. **Docs first.** The docs canon (MDX) is the spec the code is built to. Canon layer 1 is merged (#38) and
   K5 is agreed, so M1 has started.
2. **Everything falls out of the blueprint.** The blueprint is verbose because agents write it. In return, docs, the
   app, live observability and the agent kit are generated, never configured by hand.
3. **The whole shape is designed together** ([`decisions/K5-the-whole-shape.md`](decisions/K5-whole-shape.md)); the
   details follow in layers.
4. **Agent-native is ported, not used.** Aaron: "drop Agent Native totally … learn from it … port it … as compatible
   as possible. But our own thing." Nothing of agent-native runs or is installed. What it taught us is ported into our
   own Effect code: `defineAction` and its fields and approvals (M1.23), the shell, the chat's surface and screen
   context (M1.24), and the layouts. It stays compatible by names only, so an agent-native app can register our
   generated actions (M1.22 proves this with a type test). Not ported: its Postgres and PGlite, its auth and orgs,
   its MCP, deploy, A2A and telemetry.
5. **Agents are durable, on our own stack.** The portal's chat agent is a durable run, one per chat thread (M4.16).
6. **The portal starts from things and their lifecycles**, then operations, machines, events, errors and notes
   attached to their thing. It shows declared behaviour and lets live evidence light up that same structure.
   **Telemetry, not analytics.** It's designed with Aaron in M1.25, before the portal slice (M1.13). **Parked:** the
   plans and factory surfaces, Dispatch, and the skills design (K4, merged as parked in #37).
7. **One growing example, used everywhere, in stages (Aaron, 18 November evening).** It starts as a linktree where
   people claim a username, then gives those users wallets, then a multisig with budgets, then privacy. Each stage is
   a meta-milestone; all four together are v1.0. Each stage is built from reusable pieces (plugins), and the starter
   and every example change to follow it. The 📐 growing-example thread designed it as K9 ([`decisions/K9-growing-example.md`](decisions/K9-growing-example.md), merged in #55), including what the app
   looks like at each stage, the React hooks slice (designed in `frame/projections.md:261`, owned by no slice), and
   whether generated actions really make us compatible with agent-native apps. Until K9 lands, the sign-up sheet
   (`examples/signup`) stays the canon's first example and acme the tests' fixture. The earlier mini DAO example
   (governance, private membership) is folded into stages 3 and 4 or retired by K9.
8. **Operations DX (K5):** an operation-level `emits:` lands in the same commit as its writes, only on success, and a
   call that writes nothing emits nothing (Q5 = B; built in M3.16). Steps may be declared optional, and eval 6 still
   checks their order. The scaffold writes a wired function: each step in order, the move, a stub per refusal, every
   hole a `Handlers.blank` that `prove --empty` shows red. `ortho check` warns when a required step never runs
   (all three in M1.26).
9. **Chains (K7, merged in #53, all five forks answered by Aaron on 18 November):** EVM now, Solana and Aztec designed and
   built later; every contract function reachable, with generated roles; the wallet's first version in M1 (M1.27 to
   M1.32), signing on every host, linking after auth (M2.13); each wallet declares where its key lives. The EVM chain
   adapter is vendored from `@prb/effect-evm` into `@orthograph/chain-evm` (M1.30; Aaron: "solid on the vendoring
   lets do it"). The earlier line follows.
   **Chains are designed together:** Solidity, Noir and Solana, including contracts we don't write (K7, the war game
   thread). Our own contracts only; other people's are sources behind adapters. K5's Q4 waits on K7.
10. **The name is Orthograph**, the command `ortho`, the npm scope `@orthograph` (the org exists), with "blueprint"
    kept (K6). The rename sweep has run: the code says it too.

### Every open line

Seven lines, and the conductor. K7 (#53) and K9 (#55) are merged; the ledger thread records them.

| # | Line | Branch | PR | Done when | State now | Next |
|---|---|---|---|---|---|---|
| ① | **Docs canon (MDX)** | `claude/docs-canon-cf2c38` | #38 merged (layer 1) | Pass 2, every page in layers, checked against the ledger before each layer | Layer 1 merged at `b600bb8`. Pass 2 is running locally: the tickets example proves (six journeys, seven operations), three page rewrites in progress | Opens the next canon PR; takes K8's example changes once they land |
| 🧭 | **M1 plugin path and wallet path** | `m1` | none (M1 lands as one PR at Gate M1) | M1.01, M1.02, M1.05 to M1.08 and M1.10 on `m1`, each green with its check; check `01` through one `ortho add feature`; then the wallet path (M1.14, M1.27 to M1.32), ending with `acme wallet send` confirmed on Anvil; a 🔍 pass so far | M1.01, M1.02, M1.05 and M1.06 landed. Running its own subagents for M1.28 (wallet journeys, ✍️) and M1.17 (stores). Merges the Codex PRs into `m1` | M1.07 verbs, then M1.08 and M1.10. Tells the conductor when M1.10 lands, so M1.03/M1.04 and M1.26 can start |
| 🤖 | **Codex: O2 trace fixes** (M1.18 to M1.20) | `codex/m1-o2` | into `m1`, not yet | Three slices, each with O2's proof; journey change by a separate author; 🔍 pass; CI green | `codex exec` (gpt-6.2-sol) in worktree `codex-m1-o2`, started 18 November | Opens its PR into `m1`; the M1 lead merges |
| 🤖 | **Codex: `@orthograph/chain-evm`** (M1.30) | `codex/m1-chain-evm` | into `m1`, not yet | Vendored from `@prb/effect-evm` 5.0.3 (MIT notice kept, never a dependency); ERC20 transfer and typed reverts on Anvil; the `viem` lint rule; 🔍 pass; CI green | `codex exec` in worktree `codex-m1-chain-evm`, started 18 November | Opens its PR into `m1`; the M1 lead merges |
| 📐 | **Portal design (M1.25)** | `design/portal` | none yet | `design/portal.md` agreed with Aaron: the first page, a thing's page, an operation's page, the live rail, the chat; inline grills first, then a mock | Round 1 put to Aaron; he answered Q1 (the chat is Pi Durable, with our own layer reaching every action) and Q8 (HeroUI Pro, used privately; clean-room if the licence ever bites). Round 2 adds: everything is an action, the portal's own auth, extensions, and monitoring local, staging and production | Puts Q2 to Q7 back with round 2 |
| 🔗 | **Links stage 1 (Codex, run by Aaron)** | `links/stage-1` | none yet | `examples/links` runs on main's framework, and the starter is its copy, kept identical by a check (Aaron's change to K9: the starter becomes stage 1 as soon as links runs, not at M2.09); then handles as a plugin; then the screens | Prompt given to Aaron 18 November | Opens its first PR into `main` |
| 📐 | **The factory (K10)** | `design/factory` | none yet | K10: the agent layer on Pi Durable that reaches every action (shared by the portal's chat and the building agents), the building agents and their tools, sandboxes and environments, the experiment loop, the seams with the work board and the portal; slices in `milestones.md`; one PR merged | Started 18 November evening; reopens K4's parked factory | Grills Aaron, starting with what his Pi Durable UI session covers |
| 🗂 | **The work board (K11)** | `design/work-board` | none yet | A Kanban components spike on HeroUI Pro; K11: work as a plugin, the manager agent that puts work on the board, dispatch for maximum throughput onto the factory's agents; slices; one PR merged | Started 18 November evening | Spikes the components, then grills Aaron on the board |
| 📒 | **Ledger** | its own branch per round | #58, the K7 and K9 round | The ledger matches what's merged, every item with its source and owner | Recording K7 (#53) and K9 (#55) | Merges each round itself when green |

**The Codex runs** are `codex exec` processes on Aaron's machine, started by the conductor, each in its own worktree
under `.claude/worktrees/codex-*`. They can't receive messages: steer them by commenting on their PRs. Their final
reports land in the conductor's scratchpad and on their PRs.

**Closed, branches kept:**
- **#48, span fixes (O3).** It edited journeys and evals, which a builder may not do, and its review found four
  faults. O3's draft stays on `fix/operation-span-first`. M1.18 to M1.20 pick up the work, with journey changes made
  by their authors.
- **#28, the work-real spike.** Its answer is on `main` in [`../spikes/work-real/README.md`](../spikes/work-real/README.md).
  The D1 array fix is ledger STO-23, owned by M1.17. The fuller work app is FAC-15. The work system is parked.

**Done this evening:** the durable-run spike (Codex, #57): one Pi Durable run per SQLite Durable Object survives
eviction mid-tool-call, one commit and one model call per step; an eviction before the model's reply repeats that
request; the bundle is about 420 KB gzipped. Left for M4: the provider path's 17 ambient clock reads and two timeouts.

**Aaron's aim (18 November):** small, modular, reusable pieces, so we can run lots of experiments and spikes with
plugins and extensions; most won't stick, the kept ones are refactored, and production stays clean.

**Other branches not merged into `main`, all parked and owned by nothing:** `layer/4` and `author/stage4-checks` and
`author/stage4-graph-checks` (kept for the M1 harvest); `author/m0-names`, `build/M0.05` (M0 leftovers: check they're
in `main`, then delete); `build/portal-pro`, `design/kits-decision`, `design/work-blueprint`,
`claude/design-agent-harness-e6e8ff` (older design lines: read each one's last commit before deciding).

### How the pieces relate

```text
                        goal: workable at end of M2
                                   ▲
   M1 the complete model and plugins ──► M2 auth and organizations
     ▲ held until ① layer 1 is agreed; M1.25 portal design before M1.13
     │
 ① canon ◄── K5 (merged) sets its layer order ──► M1.01 plugin mounting first
 ⛓ K7 chains ──► the chain slices only (not on M1's start path)
 🏷 K6 Orthograph + ① ──► 🔁 rename sweep ──► M1
 📒 ledger: what's open, with its owner; read before each canon layer and slice
```

### What waits on Aaron

1. **The portal design rounds (M1.25)** from its 📐 thread; it must come before M1.13.
2. **Canon's two open choices:** entity or actor, and ticketing.

### Next on the critical path

Canon layer 1, naming and the rename sweep are merged, and M1 has started (Aaron's yes, 18 November): the 🧭 thread
runs M1.01 (the plugin descriptor) to M1.10 (`ortho add feature`) on `m1`, folding in K5. M1.17 to M1.20 (stores, the commit span, untraced text, call counts) and M1.26 (the wired scaffold) run in
parallel. K7 runs beside all of this and unblocks the chain slices.

### Open questions carried by threads

- **Secret and private fields over HTTP, the SDK and the CLI** are sent unredacted. Only MCP hides them. No slice
  owns it yet (OPS-01).
- **Operations that run on the caller's device** are refused by the compiler (LAH-02). No slice yet.
- **Journeys can't force a race** between two calls, so no journey proves a conflict (JOU-13). No slice yet.
- **Journeys aren't in the model** (M1.03), so proof status can't be shown live.
- **About 193 ledger items are owned by no slice.** Each becomes a slice or a canon question as its layer comes up.


## Done

- **18 November, late evening:** canon layer 1 (#38), naming (#42), the rename sweep (#51) and the ledger round (#47)
  merged. The growing example set as direction item 7, with its 📐 thread started.
- **18 November, evening cleanup:** K5 merged in PR #44. The generated-app and portal-observability spikes merged
  for the record (#41, #39); the skills design merged as parked (#37); #48 and #28 closed with their branches kept.
- **Visuals spike and the `visuals` skill:** merged in PR #34 (18 November).
- **This board's last round:** merged in PR #40.

- **M0, land and rename:** merged in PR #32. The framework's names (renamed again since, K6), `language-*`, the lint rule against old
  names, the docs as one page. Evidence in [`evidence/M0.02/`](evidence/M0.02/) to [`evidence/M0.06/`](evidence/M0.06/).
- **K3 and O2:** merged in PR #36. Stores of open kinds, sources through adapters; the three trace gaps with their
  slices.
- **Branch triage:** merged in PR #33. The portal-docs spike kept as its own line; idle worktrees and merged branches
  removed.

**Traps carried over from goal 1** (full list in the old handoff): run `pnpm nx reset` then
`NX_DAEMON=false pnpm nx sync` after any generator change; Gate 2's teardown removes every new container with the
framework's prefix, so don't run two gates at once; a killed Gate 2 run can leave its registry container behind.
