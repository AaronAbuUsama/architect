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

1. **Docs first.** The docs canon (MDX) is the spec the code is built to. **M1 is held** until canon layer 1 is
   agreed. K5 is agreed.
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
   and every example change to follow it. The 📐 growing-example thread designs it as K8, including what the app
   looks like at each stage, the React hooks slice (designed in `frame/projections.md:261`, owned by no slice), and
   whether generated actions really make us compatible with agent-native apps. Until K8 lands, the sign-up sheet
   (`examples/signup`) stays the canon's first example and acme the tests' fixture. The earlier mini DAO example
   (governance, private membership) is folded into stages 3 and 4 or retired by K8.
8. **Operations DX (K5):** an operation-level `emits:` lands in the same commit as its writes, only on success, and a
   call that writes nothing emits nothing (Q5 = B; built in M3.16). Steps may be declared optional, and eval 6 still
   checks their order. The scaffold writes a wired function: each step in order, the move, a stub per refusal, every
   hole a `Handlers.blank` that `prove --empty` shows red. `ortho check` warns when a required step never runs
   (all three in M1.26).
9. **Chains are designed together:** Solidity, Noir and Solana, including contracts we don't write (K7, the war game
   thread). Our own contracts only; other people's are sources behind adapters. K5's Q4 waits on K7.
10. **The name is Orthograph**, the command `ortho`, the npm scope `@orthograph` (the org exists), with "blueprint"
    kept (K6). The rename sweep has run: the code says it too.

### Every open line

Five threads, and the conductor (the ledger's closes when #50 merges).

| # | Line | Branch | PR | Done when | State now | Next |
|---|---|---|---|---|---|---|
| ① | **Docs canon (MDX)** | `claude/docs-canon-cf2c38` | #38 merged (layer 1) | Pass 2, every page in layers, checked against the ledger before each layer | Layer 1 merged at `b600bb8`. Pass 2 is running locally: the tickets example proves (six journeys, seven operations), three page rewrites in progress | Opens the next canon PR; takes K8's example changes once they land |
| ⛓ | **Chain languages war game (K7)** | `spike/chain-languages` | none yet | K7 recorded with its spike evidence, and its batch of questions put to Aaron, together with the wallet plugin's scope | EVM and Solana spikes done; waiting on the Aztec spike (holds port 8880). Found: `wallet.link` needs auth (M2), today's wallet values are EVM-only, linking a private Aztec account to a person undoes its privacy | Opens a PR and brings Aaron the K7 and wallet round |
| 🧭 | **The growing example (K8)** | `design/growing-example` | none yet | K8 written with each stage's capabilities, pieces, slices, app shape and check; `milestones.md` maps the stages and defines v1.0, with the React hooks slice and the agent-native findings in M1.22 and M1.23; starter and example changes as slices; canon changes listed for the conductor; one PR merged | Started 18 November evening | Grills Aaron on the stages and what the app looks like at each |
| 🧭 | **M1 plugin path** | `m1` | none (M1 lands as one PR at Gate M1) | M1.01, M1.02, M1.05 to M1.08 and M1.10 on `m1`, each green with its check; check `01` passes through one `ortho add feature`; checks `05` and `06` pass; a 🔍 pass so far; a demo from a fresh starter in `design/goals/03-m1-plugin-path.md` | Started 18 November evening on Aaron's yes | Writes goal 3, then M1.01, the plugin descriptor decision |
| 📒 | **Ledger** | `claude/ledger-canon-k5` | #50 | The ledger matches the merged canon and rename | 🔍 passed at `57f5c89`; 626 items, 190 owned by nothing, 60 high; new row FOR-18 (rule 7 only partly in place) | Merges itself when CI is green |

**Closed, branches kept:**
- **#48, span fixes (O3).** It edited journeys and evals, which a builder may not do, and its review found four
  faults. O3's draft stays on `fix/operation-span-first`. M1.18 to M1.20 pick up the work, with journey changes made
  by their authors.
- **#28, the work-real spike.** Its answer is on `main` in [`../spikes/work-real/README.md`](../spikes/work-real/README.md).
  The D1 array fix is ledger STO-23, owned by M1.17. The fuller work app is FAC-15. The work system is parked.

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

1. **The K8 rounds** from the growing-example thread: the stages and what the app looks like at each.
2. **The K7 and wallet round** from the war game, when it opens its PR.
3. **The portal design (M1.25)**, any time now; it must come before M1.13.
4. **Canon's two open choices:** entity or actor, and ticketing.

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
