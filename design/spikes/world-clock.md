The design holds. Stepping from timer to timer and waiting until the world is quiet keeps Effect's clock, the timers, durable sleeps and Anvil in step to the millisecond. A full simulated year takes 50–81 ms of real time, and 10 runs out of 10 gave the same timeline. It only works under three rules:

- **Every handler, workflow and keeper job must be counted work.** `TestClock`'s own wait for woken fibers doesn't cover a fiber that is waiting on I/O, so it can't tell when the world is quiet.
- **Raw `Effect.sleep` must be banned in handlers by a lint rule.** With raw sleeps the chain ran from 335 days ahead to 30 days behind Effect's clock, wakes were lost, runs stopped matching each other, or the world deadlocked.
- **Anvil must run with `anvil_setBlockTimestampInterval 0`.** Without it, Anvil's clock follows the wall clock between moves.

Also, the brief's monthly formula `floor(now / 30 days)` resets about 39 hours after the grant, not a month after. The period has to be anchored somewhere, and that is a blueprint decision.

The spike is in `/tmp/spike-clock` (types check clean); the repository was not touched.

```
TO THE CONDUCTOR
```

## README.md

```markdown
# Spike: one stepped clock for a world (Effect clock, timers, durable sleeps, Anvil)

Throwaway spike for Architect, 16 November 2026. Not part of capxul-next. Runs in `/tmp/spike-clock`:
`npm install`, `npx tsc -p .`, `node --experimental-strip-types --no-warnings src/main.ts [runs]`.
Pinned: effect 4.1.2, typescript 5.9.3, @types/node 22.19.1, Node 22.23, Anvil 1.9.0. No viem (raw JSON-RPC).

## Question

Can "a month passes" and "a year passes" move Effect's clock, our timers, durable sleeps and a local Anvil chain
together, so that every piece of code that wakes sees the same time, deterministically, in seconds of real time?

## What was built

- `Chain`: Anvil over JSON-RPC. `moveTo(ms)` = `evm_setNextBlockTimestamp(s)` + `evm_mine`; `blockTimeMs` = latest
  block's timestamp. Anvil starts with `--timestamp T0` and `anvil_setBlockTimestampInterval [0]`.
- `Timers`: one table. `at(at, owner, name, work)` (the keeper's alarm), `sleep(owner, span)` (durable sleep: a row
  plus a Deferred), `due(target)`, `take(at)`.
- `Busy`: a token count. Counted work is started with `spawn`. A durable sleep hands its token back while parked; the
  timer that wakes it takes a token *for* it before opening the Deferred, so a woken fiber is never uncounted.
- `World`: `advance(span)` = wait quiet; target = now + span; loop { earliest due timer at or before target; move the
  chain, then `TestClock.setTime`; fire every timer due then; wait quiet }; move to target; wait quiet. A quiet wait
  that exceeds a real-time limit (via `TestClock.withLive`) fails with `NeverQuiet`.
- Stand-ins: an allowance (grant schedules `expire` at grant + 1 calendar year through `Timers.at`; spend works out a
  lazy period `floor(now / 30 days)`), a durable workflow (sleep 30 days, read chain + clock, record, repeat) and a
  raw workflow using `Effect.sleep`.

## What was found

1. **A year passes: yes.** From 2026-11-01T09:00Z, `advance("1 year")`: the durable workflow wakes 12 times
   (2026-12-01 ... 2027-10-27); at every wake Effect's clock, the chain's latest block and the timer's due time are equal
   to the millisecond. `expire` fires at 2027-11-01T09:00Z exactly, after wake 12; a spend then is refused as expired.
   13 controller steps. 50 to 81 ms real per run; 10 of 10 runs produced the identical timeline.
2. **A month passes: yes, but the brief's period formula is wrong for "monthly".** Spend 80, then 30 is refused before
   the advance and accepted after `advance("1 month")`. But `floor(now / 30 days)` counts periods from the Unix epoch:
   for a grant at 2026-11-01T09:00Z the boundary falls 39 hours later (2026-11-03T00:00Z, period 691 to 692), so the
   reset is seen after 3 days, not a month (scenario 2). Counting from the grant, `floor((now - grantedAt) / 30 days)`
   resets exactly at +30 days (scenario 2b). The period's anchor is a blueprint decision.
3. **Quiescence is required, at both ends of a step.**
   - Without waiting for quiet *before* looking for timers, `advance` misses a workflow that was forked but has not yet
     run far enough to set its timer: it jumps to the 1-year `expire`, and the next move to 30 days is refused by Anvil
     (scenario 1x: `Timestamp error: ... lower than previous block's timestamp`). Same race after every wake.
   - `TestClock`'s own "wait for woken fibers" only covers work scheduled synchronously on its scheduler; a woken fiber
     that awaits I/O (any fetch, so any RPC or SQL) escapes it. So `TestClock` cannot be the quiescence detector; a
     counted-work service like `Busy` is needed, and every handler, workflow and keeper job must run as counted work.
4. **Raw `Effect.sleep` breaks the model; a lint rule must forbid it in handlers.**
   - Uncounted, chain moved first (3a): a raw sleeper only wakes when the controller happens to step; `TestClock.setTime`
     wakes it at its own instant (e.g. 2026-12-16) but the chain is already at the controller's step (2026-12-31):
     **chain ahead by 15 days**; its next sleep is counted from the step, so a 45-day loop woke 6 times in a year
     instead of 8. The order of raw wakes against durable wakes depended on RPC latency: **0 of 9** repeat runs matched
     the first.
   - Uncounted, Effect clock moved first (3a'): raw sleepers read the chain before it moves: **chain behind by 15 to 30
     days**; 7 of 9 repeats matched. Either order is wrong for raw sleepers; only the ordering of the lag changes.
   - Alone, no durable timers (3c): the controller jumps straight to the target; `TestClock` wakes the sleeper at
     2026-12-01 but its RPC returns after the clock reached 2027-11-01: **chain ahead 335 days, 1 wake instead of 12**.
   - Inside counted work (3b): the world never goes quiet (the fiber holds its token while sleeping on `TestClock`,
     which only the controller moves): `NeverQuiet` after the real-time limit (2 s). It is a deadlock, not a lag.
5. **Anvil's timestamp rules.** `evm_setNextBlockTimestamp` refuses a time lower than the latest block; an equal time
   is accepted (several blocks may share a timestamp). By default Anvil's clock keeps running on wall time after a
   move: a plain `evm_mine` or a transaction 2 s later gets +2 s. `anvil_setBlockTimestampInterval [0]` stops that:
   every later block, mined or by transaction, keeps the last set timestamp, so the chain stands still between steps.
   Anvil only has whole seconds; a step instant that is not a whole second is refused by `Chain.moveTo` here. Each
   step mines one empty block. Anvil starts in about 70 ms.
6. **`TestClock` notes (effect 4.1.2).** It starts at epoch 0 (set it to T0 first). `setTime` wakes raw sleepers at
   their own instants inside its loop, one by one, before returning. Its "test is using time but not advancing"
   warning is one-shot: after the first `setTime` it never fires again, so it did not flag the 3b deadlock.
   `Duration` has no months or years ("1 month" is not a Duration input); calendar spans were done with
   `DateTime.add({ months | years })` in UTC.

## Measurements (10 runs each, real ms per run, Anvil startup excluded)

| Scenario | Real ms | Same as first run |
|---|---|---|
| 1. a year (12 wakes, expire, 13 steps) | 50 to 81 | 9/9 |
| 2. a month, epoch period | 10 to 21 | 9/9 |
| 2b. a month, period from grant | 11 to 17 | 9/9 |
| 3a. raw sleeps, chain first | 48 to 67 | 0/9 |
| 3a'. raw sleeps, clock first | 42 to 65 | 7/9 |
| 3c. raw sleep alone | 6 to 10 | 9/9 (deterministically wrong) |
| 3b. raw sleep in counted work | 2005 (the quiet limit) | 9/9 (NeverQuiet) |

## The decision it supports

The proposal holds: one world clock, every wait through `Timers`, and a controller that steps from timer to timer and
waits for quiet keeps Effect's clock, the timers, durable sleeps and Anvil in agreement to the millisecond,
deterministically, at about 5 ms of real time per step. It needs three rules the design must state: (a) all handler,
workflow and keeper work runs as counted work (quiescence is a service, not `TestClock`); (b) raw `Effect.sleep` (and
any other timer: `Schedule` delays, `setTimeout`) is forbidden in handlers by lint, waits go through `Timers.sleep`;
(c) Anvil is run with timestamp interval 0, and instants are whole seconds.

## Open risks

- Real durable sleeps (Cloudflare Workflows' `step.sleep`, DO alarms) are not exercised here; a stepped world needs a
  `Timers` implementation in each runtime that records rather than sleeps, and a way for the controller to know a
  workflow instance is parked rather than running (Busy across processes: a counter in the world's database or a
  per-instance status).
- Quiescence across processes (Core, a Frappe site, the indexer) needs every process to report work in flight; a
  process that does background work outside counted work makes the world "quiet" too early.
- The database's `now()` is not stepped here; it must read the world's clock (as `app.clock` does today) or be banned.
- Same-instant ordering: timers due at one instant fire in the order they were set; anything that depends on order
  between owners needs a declared rule.
- Calendar spans vs 30-day periods, and the period anchor (epoch vs grant), are decisions, not facts.
- Moving the chain mines a block per step; a year of daily timers is 365 blocks (cheap on Anvil, but it changes block
  numbers that code may read).
```

## package.json

```json
{
  "name": "spike-clock",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "scripts": {
    "types": "tsc -p .",
    "spike": "node --experimental-strip-types --no-warnings src/main.ts"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "dependencies": {
    "effect": "4.1.2",
    "typescript": "5.9.3"
  },
  "type": "module",
  "devDependencies": {
    "@types/node": "22.19.1"
  }
}
```

## tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noEmit": true,
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "erasableSyntaxOnly": true,
    "skipLibCheck": true,
    "types": ["node"]
  },
  "include": ["src"]
}
```

## src/time.ts

```ts
// Instants and spans of the world's time. Effect's Duration has no months or years, so "a month" and "a year" are
// calendar spans worked out from the world's now with DateTime (in UTC). That choice is the spike's, not settled.
import * as DateTime from "effect/DateTime";
import * as Duration from "effect/Duration";

export const DAY = 86_400_000;
export const iso = (ms: number): string => DateTime.formatIso(DateTime.makeUnsafe(ms));
export const ms = (instant: string): number => DateTime.toEpochMillis(DateTime.makeUnsafe(instant));

export type Span = `${number} month` | `${number} months` | `${number} year` | `${number} years` | Duration.Input;

/** The instant `span` after `from`. */
export const after = (from: number, span: Span): number => {
  if (typeof span === "string") {
    const m = /^(\d+) (month|months|year|years)$/.exec(span);
    if (m) {
      const n = Number(m[1]);
      const parts = m[2].startsWith("month") ? { months: n } : { years: n };
      return DateTime.toEpochMillis(DateTime.add(DateTime.makeUnsafe(from), parts));
    }
  }
  return from + Duration.toMillis(span as Duration.Input);
};
```

## src/busy.ts

```ts
// Quiescence. A fiber doing the world's work holds a token; the world is quiet when no token is held. A durable sleep
// gives its token back while it is parked, and the timer that wakes it takes one on its behalf *before* waking it, so
// there is no instant at which a woken fiber is running but uncounted.
import * as Context from "effect/Context";
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

export class Busy extends Context.Service<
  Busy,
  {
    readonly enter: Effect.Effect<void>;
    readonly leave: Effect.Effect<void>;
    readonly count: Effect.Effect<number>;
    /** Start `work` as the world's work: counted from now until it ends or parks. */
    readonly spawn: <A, E, R>(work: Effect.Effect<A, E, R>) => Effect.Effect<void, never, R>;
    /** Wait until no work is in flight. */
    readonly quiet: Effect.Effect<void>;
  }
>()("spike/Busy") {}

export const BusyLive = Layer.sync(Busy, () => {
  let count = 0;
  let waiters: Array<Deferred.Deferred<void>> = [];
  const enter = Effect.sync(() => {
    count++;
  });
  const leave = Effect.suspend(() => {
    count--;
    if (count < 0) return Effect.die(new Error("busy count below zero"));
    if (count > 0) return Effect.void;
    const ready = waiters;
    waiters = [];
    return Effect.forEach(ready, (d) => Deferred.succeed(d, undefined), { discard: true });
  });
  const quiet = Effect.suspend(() => {
    if (count === 0) return Effect.void;
    const d = Deferred.makeUnsafe<void>();
    waiters.push(d);
    return Deferred.await(d);
  });
  return Busy.of({
    enter,
    leave,
    count: Effect.sync(() => count),
    spawn: (work) => Effect.andThen(enter, Effect.forkDetach(Effect.ensuring(work, leave))).pipe(Effect.asVoid),
    quiet,
  });
});
```

## src/timers.ts

```ts
// The one timer service. In a real world `at` would set a Durable Object alarm and `sleep` would be a workflow's
// durable sleep; in a stepped world both are rows in the world's own table (here an array), fired by the controller.
import * as Clock from "effect/Clock";
import * as Context from "effect/Context";
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { Busy } from "./busy.ts";
import { after, type Span } from "./time.ts";

export interface Timer {
  readonly id: number;
  readonly at: number;
  readonly owner: string;
  readonly name: string;
  /** Run by the controller at `at`; returns at once (the work it starts is counted by Busy). */
  readonly fire: Effect.Effect<void>;
}

export class Timers extends Context.Service<
  Timers,
  {
    /** Fire `work` at the instant `at` (the keeper's alarm). */
    readonly at: <E>(at: number, owner: string, name: string, work: Effect.Effect<void, E>) => Effect.Effect<number>;
    /** A durable sleep: park until the controller fires it. Must be called from counted work. */
    readonly sleep: (owner: string, span: Span) => Effect.Effect<void>;
    /** The earliest instant a timer is due at or before `target`, if any. */
    readonly due: (target: number) => Effect.Effect<number | undefined>;
    /** Remove and return every timer due at exactly `at`, in the order they were set. */
    readonly take: (at: number) => Effect.Effect<ReadonlyArray<Timer>>;
    readonly pending: Effect.Effect<ReadonlyArray<Omit<Timer, "fire">>>;
  }
>()("spike/Timers") {}

export const TimersLive = Layer.effect(
  Timers,
  Effect.gen(function* () {
    const busy = yield* Busy;
    const table: Array<Timer> = [];
    let next = 1;
    const add = (at: number, owner: string, name: string, fire: Effect.Effect<void>) =>
      Effect.sync(() => {
        const id = next++;
        table.push({ id, at, owner, name, fire });
        return id;
      });
    return Timers.of({
      at: (at, owner, name, work) => add(at, owner, name, busy.spawn(Effect.ignore(work))),
      sleep: (owner, span) =>
        Effect.gen(function* () {
          const now = yield* Clock.currentTimeMillis;
          const woken = yield* Deferred.make<void>();
          // The controller takes the token for us, then wakes us.
          yield* add(after(now, span), owner, "sleep", Effect.andThen(busy.enter, Deferred.succeed(woken, undefined)));
          yield* busy.leave;
          yield* Deferred.await(woken);
        }),
      due: (target) =>
        Effect.sync(() => {
          let best: number | undefined;
          for (const t of table) if (t.at <= target && (best === undefined || t.at < best)) best = t.at;
          return best;
        }),
      take: (at) =>
        Effect.sync(() => {
          const hit = table.filter((t) => t.at === at).sort((a, b) => a.id - b.id);
          for (const t of hit) table.splice(table.indexOf(t), 1);
          return hit;
        }),
      pending: Effect.sync(() => table.map(({ fire: _, ...rest }) => rest).sort((a, b) => a.at - b.at)),
    });
  }),
);
```

## src/chain.ts

```ts
// The local chain's clock: Anvil over raw JSON-RPC. Anvil is started with --timestamp T0 and its block-time interval
// set to 0 (anvil_setBlockTimestampInterval), so its time stands still between moves instead of following the wall.
import * as Context from "effect/Context";
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

export class ChainError extends Data.TaggedError("ChainError")<{ readonly method: string; readonly message: string }> {}

export class Chain extends Context.Service<
  Chain,
  {
    /** Mine a block at exactly `ms` (whole seconds). Refuses to go back. */
    readonly moveTo: (ms: number) => Effect.Effect<void, ChainError>;
    /** The latest block's timestamp, in epoch ms. */
    readonly blockTimeMs: Effect.Effect<number, ChainError>;
    readonly rpc: (method: string, params: ReadonlyArray<unknown>) => Effect.Effect<unknown, ChainError>;
  }
>()("spike/Chain") {}

let rpcId = 0;
export const ChainLive = (url: string) =>
  Layer.sync(Chain, () => {
    const rpc = (method: string, params: ReadonlyArray<unknown>) =>
      Effect.tryPromise({
        try: () =>
          fetch(url, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ jsonrpc: "2.0", id: ++rpcId, method, params }),
          }).then((r) => r.json() as Promise<{ result?: unknown; error?: { message: string } }>),
        catch: (e) => new ChainError({ method, message: String(e) }),
      }).pipe(
        Effect.flatMap((body) =>
          body.error ? Effect.fail(new ChainError({ method, message: body.error.message })) : Effect.succeed(body.result),
        ),
      );
    const blockTimeMs = rpc("eth_getBlockByNumber", ["latest", false]).pipe(
      Effect.map((b) => Number.parseInt((b as { timestamp: string }).timestamp, 16) * 1000),
    );
    return Chain.of({
      rpc,
      blockTimeMs,
      moveTo: (ms) =>
        ms % 1000 !== 0
          ? Effect.fail(new ChainError({ method: "moveTo", message: `${ms} is not a whole second` }))
          : Effect.andThen(rpc("evm_setNextBlockTimestamp", [ms / 1000]), rpc("evm_mine", [])).pipe(Effect.asVoid),
    });
  });
```

## src/recorder.ts

```ts
// The timeline every piece of code writes to: what happened, at Effect's clock, the chain's latest block time, and
// the instant it was due, if it had one.
import * as Clock from "effect/Clock";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { iso } from "./time.ts";

export interface Entry {
  readonly who: string;
  readonly what: string;
  readonly clock: string;
  readonly chain?: string;
  readonly due?: string;
  /** For a raw sleeper: Effect's clock the moment its sleep returned, before it did anything else. */
  readonly woke?: string;
}

export class Recorder extends Context.Service<
  Recorder,
  {
    readonly add: (who: string, what: string, extra?: { chain?: number; due?: number; woke?: number }) => Effect.Effect<void>;
    readonly entries: Effect.Effect<ReadonlyArray<Entry>>;
  }
>()("spike/Recorder") {}

export const RecorderLive = Layer.sync(Recorder, () => {
  const entries: Array<Entry> = [];
  return Recorder.of({
    add: (who, what, extra) =>
      Effect.map(Clock.currentTimeMillis, (now) => {
        entries.push({
          who,
          what,
          clock: iso(now),
          ...(extra?.chain !== undefined ? { chain: iso(extra.chain) } : {}),
          ...(extra?.due !== undefined ? { due: iso(extra.due) } : {}),
          ...(extra?.woke !== undefined ? { woke: iso(extra.woke) } : {}),
        });
      }),
    entries: Effect.sync(() => entries.slice()),
  });
});
```

## src/world.ts

```ts
// The world controller: steps every clock together like a discrete-event simulation.
import * as Clock from "effect/Clock";
import * as Context from "effect/Context";
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as TestClock from "effect/testing/TestClock";
import { Busy } from "./busy.ts";
import { Chain, type ChainError } from "./chain.ts";
import { Recorder } from "./recorder.ts";
import { after, type Span } from "./time.ts";
import { Timers } from "./timers.ts";

export class NeverQuiet extends Data.TaggedError("NeverQuiet")<{ readonly at: number; readonly busy: number }> {}

export class World extends Context.Service<
  World,
  {
    readonly now: Effect.Effect<number>;
    /** Move every clock to `ms` and wait until quiet (no timers fired). */
    readonly moveTo: (ms: number) => Effect.Effect<void, ChainError | NeverQuiet>;
    readonly advance: (span: Span) => Effect.Effect<{ readonly steps: number }, ChainError | NeverQuiet>;
  }
>()("spike/World") {}

export interface WorldOptions {
  /** Wait for quiet after each step (true in the design; false shows what goes wrong without it). */
  readonly waitQuiet: boolean;
  /** Real-time limit on a quiet wait before the controller reports the world never went quiet. */
  readonly quietLimit: string;
  /** Which clock moves first at each step (the design: the chain). */
  readonly order?: "chain-first" | "clock-first";
}

export const WorldLive = (options: WorldOptions) =>
  Layer.effect(
    World,
    Effect.gen(function* () {
      const busy = yield* Busy;
      const timers = yield* Timers;
      const chain = yield* Chain;
      const rec = yield* Recorder;

      const quiet = (at: number) =>
        options.waitQuiet
          ? busy.quiet.pipe(
              Effect.timeoutOrElse({
                duration: options.quietLimit as `${number} seconds`,
                orElse: () => Effect.flatMap(busy.count, (n) => Effect.fail(new NeverQuiet({ at, busy: n }))),
              }),
              TestClock.withLive,
            )
          : Effect.void;

      // The chain first, then Effect's clock: TestClock.setTime wakes raw Effect.sleep fibers synchronously.
      const moveClocks = (ms: number) =>
        options.order === "clock-first"
          ? Effect.andThen(TestClock.setTime(ms), chain.moveTo(ms))
          : Effect.andThen(chain.moveTo(ms), TestClock.setTime(ms));

      const moveTo = (ms: number) => Effect.andThen(moveClocks(ms), quiet(ms));

      const advance = (span: Span) =>
        Effect.gen(function* () {
          // Work started before the advance (a forked workflow) may not have set its timer yet.
          yield* quiet(yield* Clock.currentTimeMillis);
          const target = after(yield* Clock.currentTimeMillis, span);
          yield* rec.add("world", `advance ${String(span)} to target`, { due: target });
          let steps = 0;
          for (;;) {
            const at = yield* timers.due(target);
            if (at === undefined) break;
            yield* moveClocks(at);
            for (const t of yield* timers.take(at)) yield* t.fire;
            yield* quiet(at);
            steps++;
          }
          yield* moveTo(target);
          return { steps };
        });

      return World.of({ now: Clock.currentTimeMillis, moveTo, advance });
    }),
  );
```

## src/things.ts

```ts
// Stand-ins: an allowance (expiry by the keeper's timer, lazy monthly reset) and two workflows, one that sleeps
// durably and one that sleeps with raw Effect.sleep.
import * as Clock from "effect/Clock";
import * as Effect from "effect/Effect";
import { Busy } from "./busy.ts";
import { Chain } from "./chain.ts";
import { Recorder } from "./recorder.ts";
import { after, DAY } from "./time.ts";
import { Timers } from "./timers.ts";

/** The period a spend falls in. `fromGrant` false is the brief's floor(now / 30 days), counted from the epoch. */
export const periodOf = (now: number, grantedAt: number, fromGrant: boolean) =>
  Math.floor((fromGrant ? now - grantedAt : now) / (30 * DAY));

export const makeAllowance = (owner: string, limit: number, fromGrant: boolean) =>
  Effect.gen(function* () {
    const timers = yield* Timers;
    const chain = yield* Chain;
    const rec = yield* Recorder;
    const grantedAt = yield* Clock.currentTimeMillis;
    const expiresAt = after(grantedAt, "1 year");
    const state = { period: periodOf(grantedAt, grantedAt, fromGrant), spent: 0, expired: false };
    yield* rec.add(owner, `grant limit ${limit}/period, expires`, { due: expiresAt });
    yield* timers.at(
      expiresAt,
      owner,
      "expire",
      Effect.gen(function* () {
        state.expired = true;
        yield* rec.add(owner, "expire", { chain: yield* chain.blockTimeMs, due: expiresAt });
      }),
    );
    const spend = (amount: number) =>
      Effect.gen(function* () {
        const now = yield* Clock.currentTimeMillis;
        const period = periodOf(now, grantedAt, fromGrant);
        let outcome: string;
        if (state.expired) outcome = "refused: expired";
        else {
          if (period !== state.period) {
            state.period = period;
            state.spent = 0;
          }
          if (state.spent + amount > limit) outcome = `refused: over limit (spent ${state.spent} in period ${period})`;
          else {
            state.spent += amount;
            outcome = `ok (spent ${state.spent} in period ${period})`;
          }
        }
        yield* rec.add(owner, `spend ${amount}: ${outcome}`);
        return outcome;
      });
    return { spend, grantedAt, expiresAt };
  });

/** A workflow that loops: durable-sleep 30 days, then read the chain and Effect's clock. Started as counted work. */
export const durableWorkflow = (owner: string) =>
  Effect.gen(function* () {
    const busy = yield* Busy;
    const timers = yield* Timers;
    const chain = yield* Chain;
    const rec = yield* Recorder;
    yield* busy.spawn(
      Effect.gen(function* () {
        for (let i = 1; ; i++) {
          const due = after(yield* Clock.currentTimeMillis, "30 days");
          yield* timers.sleep(owner, "30 days");
          const chainTime = yield* chain.blockTimeMs;
          yield* rec.add(owner, `wake ${i}`, { chain: chainTime, due });
        }
      }),
    );
  });

/** The same loop with raw Effect.sleep. `counted` starts it as the world's work, as a handler would be. */
export const rawWorkflow = (owner: string, every: `${number} days`, counted: boolean) =>
  Effect.gen(function* () {
    const busy = yield* Busy;
    const chain = yield* Chain;
    const rec = yield* Recorder;
    const loop = Effect.gen(function* () {
      for (let i = 1; ; i++) {
        const due = after(yield* Clock.currentTimeMillis, every);
        yield* Effect.sleep(every);
        const woke = yield* Clock.currentTimeMillis;
        const chainTime = yield* chain.blockTimeMs;
        yield* rec.add(owner, `wake ${i}`, { chain: chainTime, due, woke });
      }
    });
    if (counted) yield* busy.spawn(loop);
    else yield* Effect.forkDetach(loop);
  });
```

## src/scenarios.ts

```ts
// The four proofs, each a program over one fresh world.
import * as Effect from "effect/Effect";
import { Chain } from "./chain.ts";
import { Recorder } from "./recorder.ts";
import { Timers } from "./timers.ts";
import { World } from "./world.ts";
import { durableWorkflow, makeAllowance, rawWorkflow } from "./things.ts";

const settle = Effect.gen(function* () {
  const rec = yield* Recorder;
  const chain = yield* Chain;
  const timers = yield* Timers;
  const world = yield* World;
  yield* rec.add("world", "end", { chain: yield* chain.blockTimeMs });
  return { entries: yield* rec.entries, pending: yield* timers.pending, now: yield* world.now };
});

/** 1: a year passes over an allowance and a durable workflow. */
export const year = Effect.gen(function* () {
  const world = yield* World;
  const allowance = yield* makeAllowance("allowance", 100, false);
  yield* durableWorkflow("workflow");
  yield* allowance.spend(80);
  yield* world.advance("1 year");
  yield* allowance.spend(10);
  return yield* settle;
});

/** 2: spending before and after a month passes, with the brief's epoch period and with a period counted from grant. */
export const month = (fromGrant: boolean) =>
  Effect.gen(function* () {
    const world = yield* World;
    const allowance = yield* makeAllowance(fromGrant ? "allowance(from grant)" : "allowance(epoch)", 100, fromGrant);
    yield* allowance.spend(80);
    yield* allowance.spend(30);
    yield* world.advance("1 day");
    yield* allowance.spend(30);
    yield* world.advance("2 days");
    yield* allowance.spend(30);
    yield* world.advance("27 days");
    yield* allowance.spend(30);
    return yield* settle;
  });

/** 3a: raw Effect.sleep beside the durable workflow, not counted as the world's work. */
export const rawUncounted = Effect.gen(function* () {
  const world = yield* World;
  yield* durableWorkflow("durable");
  yield* rawWorkflow("raw-30d", "30 days", false);
  yield* rawWorkflow("raw-45d", "45 days", false);
  yield* world.advance("1 year");
  return yield* settle;
});

/** 3c: raw Effect.sleep alone: no durable timer stops the controller on the way. */
export const rawAlone = Effect.gen(function* () {
  const world = yield* World;
  yield* rawWorkflow("raw-30d", "30 days", false);
  yield* world.advance("1 year");
  return yield* settle;
});

/** 3b: raw Effect.sleep inside counted work, as a handler would hold it. */
export const rawCounted = Effect.gen(function* () {
  const world = yield* World;
  yield* durableWorkflow("durable");
  yield* rawWorkflow("raw-30d", "30 days", true);
  const outcome = yield* Effect.result(world.advance("1 year"));
  const rec = yield* Recorder;
  yield* rec.add("world", `advance ended: ${outcome._tag === "Failure" ? JSON.stringify(outcome.failure) : "ok"}`);
  return yield* settle;
});
```

## src/main.ts

```ts
// Entry file: starts a fresh Anvil per run, builds the world over it, runs each scenario N times (argv[2], default 2).
import { spawn, type ChildProcess } from "node:child_process";
import { setTimeout as wait } from "node:timers/promises";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as TestClock from "effect/testing/TestClock";
import { BusyLive } from "./busy.ts";
import { Chain, ChainLive } from "./chain.ts";
import { RecorderLive } from "./recorder.ts";
import { ms } from "./time.ts";
import { TimersLive } from "./timers.ts";
import { WorldLive, type WorldOptions } from "./world.ts";
import * as S from "./scenarios.ts";

const T0 = ms("2026-11-01T09:00:00Z");
let port = 8700;
const RUNS = Number(process.argv[2] ?? 2);

async function startAnvil(): Promise<{ url: string; proc: ChildProcess }> {
  const p = port++;
  const proc = spawn("anvil", ["--port", String(p), "--timestamp", String(T0 / 1000), "--silent"], { stdio: "ignore" });
  const url = `http://127.0.0.1:${p}`;
  for (let i = 0; i < 100; i++) {
    try {
      const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: '{"jsonrpc":"2.0","id":0,"method":"eth_chainId","params":[]}' });
      if (r.ok) return { url, proc };
    } catch {}
    await wait(50);
  }
  throw new Error("anvil did not start");
}

type Program = Effect.Effect<unknown, unknown, any>;

async function run(name: string, program: Program, options: WorldOptions = { waitQuiet: true, quietLimit: "3 seconds" }) {
  const { url, proc } = await startAnvil();
  const base = Layer.mergeAll(BusyLive, RecorderLive, ChainLive(url));
  const timers = TimersLive.pipe(Layer.provideMerge(base));
  const world = WorldLive(options).pipe(Layer.provideMerge(timers));
  const all = world.pipe(Layer.provideMerge(TestClock.layer()));
  const start = performance.now();
  const setup = Effect.gen(function* () {
    const chain = yield* Chain;
    yield* chain.rpc("anvil_setBlockTimestampInterval", [0]);
    yield* TestClock.setTime(T0);
    return yield* program;
  });
  try {
    const exit = await Effect.runPromiseExit(Effect.provide(setup, all) as Effect.Effect<unknown>);
    const result = exit._tag === "Success" ? exit.value : { failed: String(exit.cause), entries: [], pending: [] };
    return { name, realMs: Math.round(performance.now() - start), result };
  } finally {
    proc.kill();
  }
}

const show = (r: { name: string; realMs: number; result: any }) => {
  console.log(`\n=== ${r.name}: ${r.realMs} ms real`);
  if (r.result.failed) console.log(`FAILED: ${r.result.failed.split("\n")[0]}`);
  for (const e of r.result.entries) {
    const lag = e.chain ? (ms(e.woke ?? e.clock) - ms(e.chain)) / 86_400_000 : undefined;
    const late = e.due ? (ms(e.clock) - ms(e.due)) / 86_400_000 : undefined;
    console.log(
      `${e.clock}  ${e.who.padEnd(22)} ${e.what.padEnd(48)} chain=${e.chain ?? "-".padEnd(24)} due=${e.due ?? "-".padEnd(24)}` +
        (e.woke && e.woke !== e.clock ? `  woke=${e.woke}` : "") +
        (lag !== undefined && lag !== 0 ? (lag > 0 ? `  CHAIN BEHIND ${lag}d` : `  CHAIN AHEAD ${-lag}d`) : "") +
        (late !== undefined && late !== 0 && !e.what.startsWith("grant") && !e.what.startsWith("advance") ? `  OFF DUE ${late}d` : ""),
    );
  }
  console.log(`pending timers: ${r.result.pending.length}`);
};

const scenarios: Array<[string, Program, WorldOptions?]> = [
  ["1. a year passes", S.year],
  ["1x. a year passes, controller NOT waiting for quiet", S.year, { waitQuiet: false, quietLimit: "3 seconds" }],
  ["2. a month passes (brief's epoch period)", S.month(false)],
  ["2b. a month passes (period from grant)", S.month(true)],
  ["3a. raw Effect.sleep, uncounted", S.rawUncounted],
  ["3a'. raw Effect.sleep, uncounted, Effect clock moved before the chain", S.rawUncounted, { waitQuiet: true, quietLimit: "3 seconds", order: "clock-first" }],
  ["3c. raw Effect.sleep alone, no durable timers", S.rawAlone],
  ["3b. raw Effect.sleep inside counted work", S.rawCounted, { waitQuiet: true, quietLimit: "2 seconds" }],
];

for (const [name, program, options] of scenarios) {
  const a = await run(name, program, options);
  show(a);
  let b = a;
  let identical = 0;
  const times: Array<number> = [a.realMs];
  for (let i = 1; i < RUNS; i++) {
    const r = await run(name, program, options);
    times.push(r.realMs);
    if (JSON.stringify(a.result) === JSON.stringify(r.result)) identical++;
    else b = r;
  }
  const same = b === a;
  console.log(`runs: ${RUNS}; identical to the first: ${identical}/${RUNS - 1}; real ms per run: ${times.join(", ")}`);
  if (!same) {
    const ea = a.result as any, eb = b.result as any;
    ea.entries.forEach((e: unknown, i: number) => {
      if (JSON.stringify(e) !== JSON.stringify(eb.entries[i])) console.log(`  differs at ${i}:`, JSON.stringify(e), "vs", JSON.stringify(eb.entries[i]));
    });
  }
}
```

## Scenario 1 timeline (identical in 10 of 10 runs)

```
2026-11-01T09:00Z  allowance  grant limit 100/period, expires          due=2027-11-01T09:00Z
2026-11-01T09:00Z  allowance  spend 80: ok (spent 80 in period 691)
2026-11-01T09:00Z  world      advance 1 year                           due=2027-11-01T09:00Z
2026-12-01T09:00Z  workflow   wake 1    chain=2026-12-01T09:00Z  due=2026-12-01T09:00Z
2026-12-31T09:00Z  workflow   wake 2    chain=2026-12-31T09:00Z  due=2026-12-31T09:00Z
2027-01-30T09:00Z  workflow   wake 3    chain=2027-01-30T09:00Z  due=2027-01-30T09:00Z
2027-03-01T09:00Z  workflow   wake 4    chain=2027-03-01T09:00Z  due=2027-03-01T09:00Z
2027-03-31T09:00Z  workflow   wake 5    chain=2027-03-31T09:00Z  due=2027-03-31T09:00Z
2027-04-30T09:00Z  workflow   wake 6    chain=2027-04-30T09:00Z  due=2027-04-30T09:00Z
2027-05-30T09:00Z  workflow   wake 7    chain=2027-05-30T09:00Z  due=2027-05-30T09:00Z
2027-06-29T09:00Z  workflow   wake 8    chain=2027-06-29T09:00Z  due=2027-06-29T09:00Z
2027-07-29T09:00Z  workflow   wake 9    chain=2027-07-29T09:00Z  due=2027-07-29T09:00Z
2027-08-28T09:00Z  workflow   wake 10   chain=2027-08-28T09:00Z  due=2027-08-28T09:00Z
2027-09-27T09:00Z  workflow   wake 11   chain=2027-09-27T09:00Z  due=2027-09-27T09:00Z
2027-10-27T09:00Z  workflow   wake 12   chain=2027-10-27T09:00Z  due=2027-10-27T09:00Z
2027-11-01T09:00Z  allowance  expire    chain=2027-11-01T09:00Z  due=2027-11-01T09:00Z
2027-11-01T09:00Z  allowance  spend 10: refused: expired
```