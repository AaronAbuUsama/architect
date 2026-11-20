# K23 grill: time, three questions for Aaron

Asked 20 November 2026. Everything else in [`K23-time.md`](K23-time.md) is decided by the building agent; these three
change when time arrives or what Aaron sees when he runs the app.

**Shared terms.**

- **A world** is one running copy of the app with its own database, people, chain and clock: what a journey runs in,
  and what `ortho dev` gives you.
- **A stepped clock** stands still until something moves it. Moving it a month fires everything due in that month, in
  order, on the server, the chain and every connected service, and waits until the world has settled.
- **A flowing clock** runs by itself, like a real one, but can also be jumped forward.
- **The stages**: Plugged In grows in four. Stage one is names and pages (being climbed now), stage two wallets, stage
  three the vault with budgets per month, stage four the private club.

Decided without you, for the record: real worlds (staging, production, public chains) always run on the real clock;
"every month" counts from the thing's own start date, as you said on 16 November, and a calendar date like "the 25th"
must name its time zone; a connected service that keeps its own clock and can't be moved makes a journey that needs
time to pass through it refuse to run, naming that service; and libraries inside the app that read the clock
themselves, like the sign-in library, are given the world's time too.

## Q1 — When does time get built?

**The problem, in code.** Time sits in the Later list, with a rule that it moves forward once something Capxul needs
depends on it. Capxul's pay runs and budget periods now do, and so does stage three of Plugged In, whose gate spends
"100 a month". Nothing in stage two needs it. Meanwhile the climb of stage one is changing the same packages time
would change (the compiler, the runtime, the world, prove).

```text
# design/milestones.md:554
8. **Time is deferred.** Journeys can't step a month until the world clock lands. That's acceptable until a plugin
   Capxul needs depends on it; then it moves forward as its own milestone.
```

```text
# design/milestones.md:130, the stage 3 gate
ada wears the spender hat at 100 a month and spends 20 alone; ...
```

**What it touches**

| Dependent | Why it cares |
|---|---|
| The stage one climb (goal 3) | it edits the compiler, the runtime and prove right now; building time beside it means two branches in the same files |
| Stage two, wallets | the chain's clock hook touches the same chain package as stage two's relayer and follower |
| Stage three, the vault | its budgets are per month, so its gate cannot pass without time |
| Capxul Next | pay runs and budget periods are time; its plugins are built on Orthograph after v1.0's stages |
| Plugged In's paid membership | a renewal is the first journey time must prove |

**The options**

**Today** — `design/milestones.md`, the Later list:

```text
- **Time**: one clock per world, moves made by time, the keeper, the on-time eval (D6, L5.01 to L5.03, L5.05 to L5.07),
  and agent waits on the world clock (L5.08). Workflows' durable clocks (M3, M5) cover long waits until then.
```

**A · Beside stage two** (recommended)

```text
now           decision and the first failing check land on main (no code)
stage 1 gate  ──┬── stage 2 (wallets) ────────────────┐
                └── M8 time (its own branch, m8) ─────┴── stage 3 (vault) waits on both gates
```

**B · Next, on its own**

```text
stage 1 gate ── M8 time ── stage 2 (wallets) ── stage 3 (vault)
```

**C · Now, beside stage one**

```text
now ──┬── stage 1 climb (goal/stage-1) ──── stage 1 gate ── stage 2
      └── M8 time, building today ────────┘   (both edit the compiler, runtime and prove)
```

**D · Leave it in Later until stage three asks**

```text
stage 1 ── stage 2 ── (stage 3 finds it needs time) ── M8 time ── stage 3
```

**You do X → what happens**

| Scenario | A · Beside stage two | B · Next, alone | C · Now | D · Later |
|---|---|---|---|---|
| You first watch a journey move a month | soon after stage one closes | soon after stage one closes | soonest | after stage two |
| Stage two (wallets) | starts on time | waits for all of time | starts on time | starts on time |
| Merge pain with the stage one climb | none: building starts after it closes | none | high: same files, two branches | none |
| Stage three (budgets per month) | ready when it gets there | ready | ready | stalls while time is built |
| Capxul's time cases have a design to point at | today | today | today | months away |

**Rubric**

| Axis | A · Beside stage two | B · Next, alone | C · Now | D · Later |
|---|---|---|---|---|
| Floor-first | ✅ decision and failing check now, build right after stage one | ✅ same | ✅ soonest | ❌ promise only |
| Reversibility | ✅ order can change at the stage one gate | ✅ | ⚠️ a half-built branch to unwind | ✅ |
| Blast radius | ⚠️ shares the chain package with stage two | ✅ nothing in parallel | ❌ collides with the climb | ✅ |
| Correctness | ✅ stage three can't pass without it, and won't have to wait | ✅ | ⚠️ built on a runtime still moving | ❌ the gap stays open |
| Parallelizability | ✅ two lines of work | ❌ one | ⚠️ two, colliding | ❌ |
| Fit | ✅ risk 8's own rule, and the gates' order | ✅ | ❌ breaks "nothing starts before the gate" | ⚠️ ignores that the trigger has fired |

**Recommendation: A.** The decision and the first failing check land today, building starts the moment stage one
closes, and stage three never waits; the one overlap with stage two is a single hook in the chain package.

## Q2 — When you run the app yourself, how does time behave, and how do you move it?

**The problem, in code.** Today a world you run with `ortho dev` uses the real clock, and nothing can move it:

```ts
// packages/host-cloudflare/src/modules/world/internal/worlds.ts:20
const now = yield* Clock.currentTimeMillis;
```

Journeys will use a stepped clock, which stands still. The question is what you get when you click around the app
yourself, and whether you can push time forward by hand to see next month's renewal or pay run.

**What it touches**

| Dependent | Why it cares |
|---|---|
| `ortho dev`, the world you poke at by hand | which clock it starts with |
| The portal | whether it shows the world's time and a control to move it |
| The command line | whether `ortho clock` exists |
| Live demos to others | whether you can show "a month later" on the spot |

**The options**

**Today** — real time, no control:

```bash
ortho dev
# the app runs on the real clock; a renewal due next month happens next month
```

**A · Flows like real time, and you jump it forward** (recommended)

```bash
ortho dev                       # time flows, one second per second, from now
ortho clock advance "1 month"   # jump: everything due in the month happens, in order, then time flows on
ortho clock                     # world time 2026-12-20 10:42 (real 2026-11-20 10:42), 3 things happened on the way
# the portal's world bar shows the world's time and a "move forward" control, in dev worlds only
```

**B · Stands still until you move it**

```bash
ortho dev                       # time is frozen at the world's start; links added an hour apart share one time
ortho clock advance "1 hour"    # you move it by hand, for everything
```

**C · Real time only; only journeys move time**

```bash
ortho dev                       # as today
ortho clock advance "1 month"   # refused: this world runs on a real clock; write a journey to move time
```

**You do X → what happens**

| Scenario | A · Flows, jump forward | B · Stands still | C · Real only |
|---|---|---|---|
| You add two links a minute apart | a minute apart | the same instant, until you move time | a minute apart |
| You want to see next month's renewal now | one command or one click | one command or one click | write and run a journey |
| You show someone the app | feels real, and you can skip ahead | feels frozen | feels real, can't skip ahead |
| Something due in 10 minutes | happens in 10 minutes | never, until you move time | happens in 10 minutes |

**Rubric**

| Axis | A · Flows, jump | B · Stands still | C · Real only |
|---|---|---|---|
| Floor-first | ✅ the manipulation you asked for, by hand | ✅ | ❌ only in journeys |
| Reversibility | ✅ a flag on the environment | ✅ | ✅ |
| Blast radius | ⚠️ one more slice: the command and a portal control | ⚠️ same | ✅ none |
| Correctness | ✅ a jump runs the same settling as a journey | ✅ | ✅ |
| Fit | ✅ dev feels real, journeys stay exact | ⚠️ dev feels broken | ⚠️ misses "you should be able to manipulate that time" |

**Recommendation: A.** You asked to be able to move time yourself; a flowing clock you can jump keeps the app feeling
real while you use it, and every jump settles exactly as a journey's step does.

## Q3 — Should a world also be able to run fast, a month in a few minutes, in this milestone?

**The problem, in code.** A flowing clock at one second per second is the same machinery as one at a thousand
seconds per second, except for the chain: the local chain follows real time on its own only at normal speed, so a fast
world needs a ticker that sets each block's time. Nothing needs a fast world yet: journeys step, and you can jump.

```ts
// design/spikes/world-clock.md:76, what the chain does on its own
// By default Anvil's clock keeps running on wall time after a move: a plain evm_mine or a transaction 2 s later gets +2 s.
```

**What it touches**

| Dependent | Why it cares |
|---|---|
| Long soak runs | a month of real use in an hour, to find what breaks over time |
| Demos | watching pay runs and renewals happen live, one after another |
| The chain hook | needs a ticker at any speed but normal |

**The options**

**Today** — no fast worlds; the Later list has nothing for them.

**A · Later** (recommended)

```text
design/later.md
- A fast world (a flowing clock at a factor, with a chain ticker): for soak runs and live demos. Waits until a soak
  run or a demo needs it; jumps cover both until then.
```

**B · In this milestone**

```bash
ortho dev --speed 720           # a month an hour; the chain ticks every second to the world's time
```

**You do X → what happens**

| Scenario | A · Later | B · In this milestone |
|---|---|---|
| You want to watch a quarter of pay runs live | jump a month at a time | set the speed and watch |
| Time's gate | one slice smaller | one slice larger, with a chain ticker to prove |
| A soak test of a month | not yet | possible |

**Rubric**

| Axis | A · Later | B · Now |
|---|---|---|
| Floor-first | ✅ nothing needs it yet | ⚠️ builds ahead of need |
| Reversibility | ✅ adds on top of the flowing clock | ✅ |
| Blast radius | ✅ none | ⚠️ the chain hook gains a ticker |
| Correctness | ✅ | ⚠️ blocks share a time between ticks |
| Fit | ✅ the Later rule: ideas wait until something needs them | ⚠️ |

**Recommendation: A.** Jumps give you every moment that matters; a fast world is worth building the day a soak run or
a demo asks for it.

## At a glance

| # | Joint | Recommendation |
|---|---|---|
| 1 | When time gets built | A · beside stage two: decision and failing check now, building from stage one's gate, stage three waits on it |
| 2 | Time when you run the app yourself | A · flows like real time; jump it with `ortho clock` or the portal |
| 3 | A fast world | A · Later |

**Answer key:** reply "K23 all A", or name the ones that differ, for example "K23 A B A".
