# Where everything stands

Kept by the conductor after every merge, decision, new thread or archive, so a fresh agent (Claude or Codex) continues
exactly where the last one stopped. The narrative of goal 1 (layers 1 and 2) is in
[`history/handoff-layers-1-2.md`](history/handoff-layers-1-2.md).
Everything open, promised, deferred or stale, with its source, canon page and owning slice: [`ledger.md`](ledger.md).

## START HERE (18 November 2026): the conductor's handoff

K5, the whole shape, merged on 18 November (PR #44, `78ecf65`). That evening Aaron cut the work down to three threads
and one critical path ("we've got too many chats talking to too many chats"). The conductor merged the finished
record PRs, closed the two that couldn't land, and archived the finished threads.

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
7. **The worked example is the community workshop mini DAO**: draft text and frozen revisions in D1, one governance
   contract owning proposals, eligibility, one vote per member and the tally, publishing as the cross-owner workflow,
   Noir for private membership with a public tally. The canon's first example is the sign-up sheet
   (`examples/signup`); acme stays the tests' fixture.
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

Three threads, and the conductor.

| # | Line | Branch | PR | Done when | State now | Next |
|---|---|---|---|---|---|---|
| ① | **Docs canon (MDX)** | `claude/docs-canon-cf2c38` | #38 | Pass 1 (outline, template, components, `stores` and `traces`) agreed with Aaron; then pass 2, every page in layers, checked against the ledger before each layer | Re-layering on K5: sign-up sheet as the example, the operations DX above, the port, chain pages waiting on K7. 🔍 review before Aaron | **Aaron reviews layer 1.** Not merged before that |
| ⛓ | **Chain languages war game (K7)** | `spike/chain-languages` | none yet | K7 recorded with its spike evidence, and its batch of questions put to Aaron | Running three local spikes, on main since K5 merged | Opens a PR and brings Aaron the K7 round |
| 🔁 | **Rename sweep to Orthograph** | (not started) | — | Every living name is Orthograph, `ortho`, `@orthograph/*`; the old-names lint rule covers the retired name; the gates pass | Waits on #42 (naming) and #38 (canon) | Starts once both land. One mechanical sweep, like M0 |
| 📒 | **Ledger follow-up** | `claude/ledger-k5` | #47 | The ledger matches the merged K5 | Rebasing on K5; merges itself when green | Then its thread is archived |
| 🏷 | **Naming (K6)** | `naming` | #42 | K6 and the name map on `main` | Main merged in for a fresh CI run. Its only red check was Layer 1's check 4, where an agent writes a handler live, which doesn't depend on a docs-only change | The conductor merges it when green |

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

1. **Canon layer 1** review, PR #38, once it's re-layered on K5. This is the critical path.
2. **The portal design (M1.25)**, any time now; it must come before M1.13.
3. **The K7 round** from the war game, when it opens its PR.

### Next on the critical path

Canon layer 1 agreed → #42 and #38 merged → the rename sweep → M1 starts with M1.01 (the plugin descriptor), folding
in K5. M1.17 to M1.20 (stores, the commit span, untraced text, call counts) and M1.26 (the wired scaffold) run in
parallel. K7 runs beside all of this and unblocks the chain slices.

### Open questions carried by threads

- **Secret and private fields over HTTP, the SDK and the CLI** are sent unredacted. Only MCP hides them. No slice
  owns it yet (OPS-01).
- **Operations that run on the caller's device** are refused by the compiler (LAH-02). No slice yet.
- **Journeys can't force a race** between two calls, so no journey proves a conflict (JOU-13). No slice yet.
- **Journeys aren't in the model** (M1.03), so proof status can't be shown live.
- **About 193 ledger items are owned by no slice.** Each becomes a slice or a canon question as its layer comes up.


## Done

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
