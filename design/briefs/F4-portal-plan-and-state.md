# F4: the portal as the one place for what's current — plan, lifecycle and the durable state behind it

Status: **proposed** (📐 designer, 17 November 2026). Aaron's direction, same day: the plan belongs in the portal, not in
a separate tool; the portal is the one place that holds what's current; any hand-made status artifact should instead
be generated and always fresh; burn-down and the like should be views over real state. This brief says what the
blueprint, the logbook and the host must add for that, and which state lives where.

It revises `codex-handoff.md` phase 5 ("the plan as blueprint things" in a separate `examples/workbench` project) and
phase 6's storage; the agent fleet itself (manager and workers) is unchanged.

## 1. The rule: declare intent, record facts, derive everything else

Three kinds of state, and each has exactly one home.

| Kind | What it is | Home | Written by |
|---|---|---|---|
| **Intent** | what the system is, and what we mean to finish by when | git: `blueprint/` (declarations and, new, milestones) | people and agents, reviewed |
| **Facts** | what happened: compiled, proved, released, watched, claimed | append-only ledgers in Durable Objects (SQLite) | the compiler's CI step, `prove`, `promote`, `watch`, the fleet |
| **Views** | status, tasks, attention, burn-down, the board | computed on read, never stored | the portal Worker |

Nothing in the third row is ever saved. A task, a "needs attention" item, a percentage, a burn-down point: each is a
function of intent at a revision plus the facts up to a sequence number. That is what makes the portal "automatically
fresh": there is nothing to go stale, because nothing derived is kept.

## 2. Where an operation is in the two loops (the lifecycle column)

`design/decisions.md` fixes the loops: design (ideate, spike, specify until no blanks) and build (build, test, deploy,
watch). Every stage below is derived; none is typed in.

| Stage | True when | Comes from | Today |
|---|---|---|---|
| Ideated | the operation is declared at all | blueprint | ✅ but **a blank operation is dropped from the model** (`compiler/…/describe.ts:44`, "a blank operation is left out") |
| Spiked | a spike's README names it as what its decision supports | blueprint (new `spikes`) | ❌ |
| Specified | its declaration has no blanks | blueprint `model.blanks` | ⚠️ computed (`describe.ts:45`) but not on the portal wire, and only for parts that survive |
| Built | its handler exists and is no longer the untouched scaffold | blueprint (new `implementation`) | ❌ |
| Tested | a recorded pass in `test`, all nine evals | logbook | ⚠️ one aggregate verdict; no per-eval rows (`extensions.evals: unavailable`) |
| Deployed | a recorded pass in each environment up to production, and a release | logbook | ✅ verdicts and releases |
| Watched | the same evals green on the running system | logbook (new `watch` rows) | ❌ |

## 3. What changes in the blueprint (schemaVersion 2)

All additive except the first, which fixes a loss.

1. **Keep blank operations in the model**, marked `blanks: ["move: …", …]`, instead of leaving them out. The portal can't
   show "not specified yet" for something it can't see. Generators already refuse to scaffold a handler for a
   declaration with blanks; they keep doing that by reading the marker.
2. **`implementation` per operation**: `{ file, state: "missing" | "scaffold" | "written", hash }`. The compiler reads
   the handler file: missing, still byte-for-byte the scaffold it rendered (it knows that content), or written. Static,
   per revision, no runtime needed.
3. **`spikes`**: from each `spikes/<name>/README.md` its question, the decision it supports and the declarations it
   names, as `{ name, question, decision, supports: ["operation:allowance.spend", …] }`.
4. **Milestones, a new small declaration kind** in `blueprint/plan/<name>.ts`:
   `Blueprint.milestone({ title, operations: [Allowance.spend, …], until: "production", by: "2026-12-01" })`. Refs, not
   strings, so a renamed operation breaks the build rather than the plan. That's all the plan declares: a task is
   never declared, it is derived (§4).
5. **Two gaps the portal already found**: a role says how it is held (`heldBy: Allowance.fields.member` or a fact), and
   a declared error says when it happens (`when: "…"`), instead of the docs saying "declared in errors.ts".
6. **`revision` carries the commit time** (from git, not a clock), so facts can be laid on a time axis.

## 4. Plan, tasks and burn-down, derived

- **A milestone** is declared (above). **Its tasks** are its operations × the stages they still lack up to `until`:
  `allowance.spend` with `until: "production"` that is specified and built but stale in staging has one task, "prove in
  staging". The Needs attention page in the spike already computes exactly this for the proof stages.
- **Task state on the board** (open, claimed, climbing, proven, failed) is: *proven* from the logbook only (a worker
  can never mark its own task green), *claimed / climbing / failed* from the fleet's facts (§5), *open* otherwise.
- **Burn-down** for a milestone: at each point on the time axis, how many of its tasks were still open, recomputed from
  the ledgers' timestamps. Scope changes (an operation added to a milestone) show as a step, because the milestone's
  declaration is versioned in git like everything else.
- **Missions** are not a separate kind: a goal in `design/goals/` already plays that part. If one is needed later it is a
  milestone of milestones.

## 5. The durable architecture

| Piece | Cloudflare primitive | Holds | Why this shape |
|---|---|---|---|
| **Logbook** (`Book`) | one Durable Object, SQLite (exists) | facts, append-only: verdicts (now with nine eval rows each), releases, compiled revisions (digest, time, blanks count), watch results | one writer orders everything by `seq`; small; signed rows. Shard per project later, not now |
| **Models** | R2 (exists) | each compiled blueprint by digest | immutable; the portal reads the one it judges against |
| **Milestone manager** | one Durable Object per milestone, an *actor* | the fleet's facts for that milestone: which worker claimed which task, attempts, give-ups, each with a time | needs serialised decisions (cap concurrency, reassign once); alarm-driven, survives eviction (H1) |
| **Worker run** | one Durable Object per run, an *actor* | one Pi run's turns, its steps and spans | H1's design, unchanged; its outcome is a verdict in the logbook, not a field it sets |
| **Portal** | the Worker route `/_portal/v1/*` (exists) | nothing | static pages + live slots; computes views from R2 + logbook + managers per request, cached by `(digest, seq)` |
| **Live feed** | WebSocket hibernation on the logbook and each manager | nothing | pushes "seq moved" so open pages refresh their slots; no polling |

**On "cluster" and "actor".** On Cloudflare a Durable Object class *is* an entity type and `idFromName` *is* sharding:
there is no separate cluster to run. Write each one behind an Effect service seam shaped like an `@effect/cluster`
entity (a typed id, typed messages, a handler), so a move off Cloudflare later is one seam, not a rewrite. A Durable
Object is used only where something needs one serialised owner (the logbook, a milestone, a run). Everything that is a
view stays a pure function.

**What is not durable:** tasks, statuses, attention items, percentages, burn-down points, the board's columns. All
recomputed. If a computation gets slow, cache it keyed by `(digest, seq)`; a cache keyed that way can never be wrong.

## 6. What this replaces

- Hand-made status pages (the "state artifact"): the portal's Overview, Plan and Proof pages are that status, always
  current, generated per project.
- `codex-handoff.md` phase 5's separate `examples/workbench` project: the plan lives in the project's own blueprint, so
  there is one place. (The workbench was proposed to avoid touching `@architect/blueprint`; Aaron's 16 November call puts
  the architecture with the building agent, and one small declaration kind is cheaper than a second project.)

## 7. Proposed steps (each with its check)

| Step | Change | Done when |
|---|---|---|
| F4.1 | compiler keeps blank operations, adds `implementation` and `spikes`; wire schemaVersion 2 | acme with one emptied handler and one `Blueprint.todo` shows *built: no* and *specified: no* on the portal |
| F4.2 | logbook: nine eval rows per verdict, `revisions` and `watch` tables, row times from the signed token | `extensions.evals` is no longer `unavailable`; the nine squares are real |
| F4.3 | `Blueprint.milestone` and the derived tasks | a milestone of three operations shows its tasks, matching Needs attention |
| F4.4 | milestone manager DO + board + burn-down | three tasks cross the board; burn-down drops as verdicts land |
| F4.5 | roles `heldBy`, errors `when` | the role and error pages stop showing "not in the blueprint yet" |

## 8. Open risks

- Byte-comparing a handler to its scaffold breaks if a formatter touches the scaffold; compare a normalised form, and
  record the scaffold's hash when rendering.
- Time on a burn-down comes from the signed token's issue time and git commit time; both are facts, but CI queueing
  skews them by minutes. Fine for a burn-down, not for latency.
- One logbook per project is a single writer. At acme's scale that's nothing; revisit with real numbers, not before.
