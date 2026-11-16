The answer is yes to both questions, but only with a lock. Input gates alone do not stop the race once a handler awaits something slow. I ran everything locally under `wrangler dev`, in `/tmp/spike-actor`. Nothing in the repository changed, no cloud resources were created and nothing was spent. The test script ran twice with the same results, and `tsc` passes.

- **No await between read and write:** two spends of 300 against 500 at the same moment give exactly one success. The other is refused with `AllowanceExceeded { remaining: 200 }`.
- **50 ms await between read and write, no lock:** the race happens. Both spends succeed, two spend events are logged, and `spent` ends at 300 instead of 600. That is a lost update.
- **50 ms await with the fix:** an Effect `Semaphore` of 1 around every move fixes it, and so does `blockConcurrencyWhile`. A further run of 10 spends of 100 against 500, each with a 20 ms await, gave exactly 5 successes and ended `exhausted`.
- **Revoke then spend:** refused with `AllowanceNotActive { state: "revoked" }`.
- **World index:** `listActive(org)` was correct and caught up after every one of 9 moves across two organisations (18 checks).
- **Timing:** a spend including the hop to the world, over 50 calls, measured p50 about 7 ms and p95 about 10 ms, locally only.

The main open risk is that the thing's write and the world's index can fall out of step if the hop to the world fails; the README below covers that and the others.

TO THE CONDUCTOR

## README: spike-actor (Durable Object per thing + world index, in Effect 4)

**Question.** Can each thing instance be its own Durable Object, with a world Durable Object holding an index, give us (1) moves that never race, even when the handler awaits something slow between reading and writing (a stand-in for a chain call), and (2) correct reads across things from the world's index? Written in Effect 4.

**What I tried.**
- A Worker with two SQLite-backed Durable Object classes (`new_sqlite_classes`): `Allowance` and `World`, called through Durable Object RPC stubs.
- Pinned versions: `effect@4.1.2`, `wrangler@4.154.0`, `typescript@5.9.3`. There are no other dependencies; the runtime types come from `wrangler types`.
- `Allowance` keeps one row (`allowance`) and an event log (`events`). `grant`, `spend` and `revoke` are each one `Effect.gen` program that:
  1. reads the row (`ctx.storage.sql.exec`, synchronous, wrapped in `Effect.sync`);
  2. checks the machine (a `from` table of the states each move may start from);
  3. checks the limit;
  4. optionally waits `slowMs` (`Effect.sleep`, a timer);
  5. writes the row and appends the event;
  6. calls `world.record(event)` and waits for the world's answer.
- Refusals are `Schema.TaggedError` classes. In effect 4.1.2 the name is `Schema.TaggedError`; there is no `TaggedErrorClass`.
- At the RPC edge, `Effect.runPromise` runs the program and refusals become plain `{ ok: false, refusal: { _tag, ...fields } }` data. Error classes thrown across Durable Object RPC do not keep their fields, so they are not thrown.
- Each request picks a guard: `none`, `semaphore` (an Effect `Semaphore.makeUnsafe(1)` per object instance, `withPermits(1)` around the whole move) or `bcw` (`ctx.blockConcurrencyWhile`).
- `World` keeps `idx(id, organization, member, limit, spent, state, version)` with an index on `(organization, state)`. It applies a snapshot only when its `version` is newer, so events arriving out of order cannot roll the view back. `listActive(org)` reads from `idx`.
- A small `fetch` router exposes all of this over HTTP, and `test.mjs` in Node drives it against `wrangler dev` (local).

**What I found.**
1. **No await between read and write: no race.** SQL storage calls are synchronous, so the read, the check and the write run as one uninterrupted step. Two spends of 300 against 500 fired together: exactly one succeeds, the other gets `AllowanceExceeded { remaining: 200 }`.
2. **A timer await between read and write, no guard: the race happens.** Both spends succeeded, two spend events were logged (three in total with the grant), and `spent` ended at 300 instead of 600: a lost update. That result is now labelled "RACE REPRODUCED" in the test.
   - Input gates do not cover this. They hold back new requests only while a storage operation is pending. A timer, and also `fetch` or an RPC to another object (which a real chain call would be), opens the gate, and a second request can run in between.
   - The guard must cover the whole move, from the read to the end of the write.
3. **The fix works.** The framework should generate a per-object Effect `Semaphore(1)` around every move. With it, two spends of 300 against 500 give one success. Ten spends of 100 against 500, each with a 20 ms await, give exactly 5 successes, `spent` 500 and state `exhausted`.
   - `blockConcurrencyWhile` also works, but it blocks every request to the object, reads included.
   - The semaphore blocks only moves, so reads such as `get` and `events` stay free. I recommend the semaphore.
4. **The machine and its refusals work.**
   - Revoke, then spend: `AllowanceNotActive { state: "revoked" }`.
   - Spend on an allowance that was never granted: `AllowanceNotActive { state: "none" }`.
   - Grant on an existing allowance: `AllowanceExists { state }`. This is a refusal I added that the brief did not name.
5. **The world's index works.** Five allowances across two organisations. After each grant, a spend that left one active, one exhausted and two revokes, I checked `listActive` for both organisations: all 18 checks were correct right away. They are caught up because each move waits for `world.record` before it answers. The index also carries `spent` and `limit`.
6. **Surprise in Effect 4.** `Effect.gen(this, function*…)` did not type-check inside a class with arrow-function properties. I used `const self = this` instead.

**Measurements.** Local `wrangler dev` (workerd on loopback), 50 sequential spends, each including the RPC hop to the world and its SQL write, timed from the Node client:

| Guard | p50 | p95 | max |
|---|---|---|---|
| none | 7.2 ms | 9.2 ms | 10.4 ms |
| semaphore | 7.0 ms | 9.8 ms | 12.7 ms |

The semaphore adds no measurable cost when there is no contention. These are not production numbers: on Cloudflare the hop between the two objects may cross colocations.

**The decision it supports.** A Durable Object per thing, with an Effect `Semaphore(1)` around every move (generated by the framework, not written by hand), gives moves that cannot race even when they await something. A world object holding a versioned index gives correct reads across things. Adopt it, with the risks below handled.

**Open risks.**
- **The thing and the index can disagree.** The thing writes its own SQLite, then calls the world. If that call fails (the world is down, it times out, the object is evicted), the thing has moved and the index has not. The framework needs an outbox: write the event to an `outbox` table in the same synchronous step as the state, deliver it to the world, mark it delivered, and retry with the Durable Object `alarm()`. The index already ignores duplicates and out-of-order events by `version`. This spike does not build the outbox.
- **The lock is held during the world hop.** A slow world slows every move of that thing. With an outbox, the lock could be released before delivery, but the index would then lag, and `listActive` would no longer be caught up right after each move.
- **One world object is a throughput bottleneck.** Every move of every thing goes through one single-threaded object. The planned index object per organisation is needed under load. A query across organisations would then need to fan out, or a second-level index.
- **The lock lives in memory.** That is safe because an object instance is single-threaded and Cloudflare does not evict it mid-request. But a crash between the write and the world call is the outbox risk above.
- **A request into a locked move waits with no limit.** The framework should put a timeout on getting the permit.
- **Chain calls cannot be undone.** A chain call inside a move that then fails after the chain has accepted it is not covered here. That needs a pending state in the machine (for example `spending`), not just a lock.
- **Only tried locally.** I have not tried this on deployed Cloudflare or under real network latency. The behaviour of input gates is documented and should match; the timings will not.

### wrangler.jsonc
```jsonc
{
  "name": "spike-actor",
  "main": "src/worker.ts",
  "compatibility_date": "2025-10-01",
  "durable_objects": {
    "bindings": [
      { "name": "ALLOWANCE", "class_name": "Allowance" },
      { "name": "WORLD", "class_name": "World" }
    ]
  },
  "migrations": [{ "tag": "v1", "new_sqlite_classes": ["Allowance", "World"] }]
}
```

### tsconfig.json (run `npx wrangler types` first to generate worker-configuration.d.ts)
```json
{
  "compilerOptions": {
    "target": "es2022", "module": "es2022", "moduleResolution": "bundler",
    "strict": true, "noEmit": true, "skipLibCheck": true,
    "types": ["./worker-configuration.d.ts"]
  },
  "include": ["src"]
}
```

### src/model.ts
```ts
// The declarations Architect would generate from the blueprint: values, the machine, refusals, events.
import { Schema } from "effect";

export const AllowanceState = Schema.Literals(["active", "exhausted", "revoked"]);
export type AllowanceState = typeof AllowanceState.Type;

export class AllowanceNotActive extends Schema.TaggedError<AllowanceNotActive>()("AllowanceNotActive", {
  state: Schema.Union([AllowanceState, Schema.Literal("none")]),
}) {}
export class AllowanceExceeded extends Schema.TaggedError<AllowanceExceeded>()("AllowanceExceeded", {
  remaining: Schema.Number,
}) {}
export class AllowanceExists extends Schema.TaggedError<AllowanceExists>()("AllowanceExists", {
  state: AllowanceState,
}) {}
export type Refusal = AllowanceNotActive | AllowanceExceeded | AllowanceExists;

export interface Snapshot {
  readonly id: string;
  readonly organization: string;
  readonly member: string;
  readonly limit: number;
  readonly spent: number;
  readonly state: AllowanceState;
  readonly version: number; // bumps on every move; the world applies only newer snapshots
}

export type Move = "grant" | "spend" | "revoke";
export interface AllowanceEvent {
  readonly move: Move;
  readonly amount: number | null;
  readonly snapshot: Snapshot;
}

// The machine: which states each move may start from. `null` is "no instance yet".
export const from: Record<Move, ReadonlyArray<AllowanceState | null>> = {
  grant: [null],
  spend: ["active"],
  revoke: ["active", "exhausted"],
};

// What crosses the RPC edge: refusals as plain tagged data (DO RPC does not keep error classes' fields).
export type Result<A> = { ok: true; value: A } | { ok: false; refusal: { _tag: string; [k: string]: unknown } };

// How a move is guarded against interleaving, chosen per request for the spike.
export type Guard = "none" | "semaphore" | "bcw";
```

### src/allowance.ts
```ts
// One Durable Object per allowance. It owns its row and its event log in the object's SQLite storage.
import { DurableObject } from "cloudflare:workers";
import { Duration, Effect, Semaphore } from "effect";
import {
  AllowanceExceeded, AllowanceExists, AllowanceNotActive, from,
  type AllowanceEvent, type AllowanceState, type Guard, type Move, type Refusal, type Result, type Snapshot,
} from "./model";

interface Options { readonly guard: Guard; readonly slowMs: number }

export class Allowance extends DurableObject<Env> {
  // One permit: what the framework would generate around every move of every thing.
  private readonly lock = Semaphore.makeUnsafe(1);

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.storage.sql.exec(`CREATE TABLE IF NOT EXISTS allowance (
      k INTEGER PRIMARY KEY CHECK (k = 1), id TEXT, organization TEXT, member TEXT,
      lim INTEGER, spent INTEGER, state TEXT CHECK (state IN ('active','exhausted','revoked')), version INTEGER)`);
    ctx.storage.sql.exec(`CREATE TABLE IF NOT EXISTS events (
      seq INTEGER PRIMARY KEY AUTOINCREMENT, move TEXT, amount INTEGER, snapshot TEXT)`);
  }

  // ---- Effect programs ----

  private read = Effect.sync((): Snapshot | null => {
    const rows = this.ctx.storage.sql.exec("SELECT * FROM allowance WHERE k = 1").toArray();
    const r = rows[0];
    return r === undefined ? null : {
      id: String(r.id), organization: String(r.organization), member: String(r.member),
      limit: Number(r.lim), spent: Number(r.spent), state: r.state as AllowanceState, version: Number(r.version),
    };
  });

  private write = (s: Snapshot, move: Move, amount: number | null) => Effect.sync(() => {
    this.ctx.storage.sql.exec(
      `INSERT INTO allowance (k,id,organization,member,lim,spent,state,version) VALUES (1,?,?,?,?,?,?,?)
       ON CONFLICT(k) DO UPDATE SET spent=excluded.spent, state=excluded.state, version=excluded.version`,
      s.id, s.organization, s.member, s.limit, s.spent, s.state, s.version);
    this.ctx.storage.sql.exec("INSERT INTO events (move, amount, snapshot) VALUES (?,?,?)",
      move, amount, JSON.stringify(s));
    return { move, amount, snapshot: s } satisfies AllowanceEvent;
  });

  // The machine check: a move from a state it cannot start from is refused with that state.
  private allowed = (move: Move, s: Snapshot | null) =>
    from[move].includes(s?.state ?? null)
      ? Effect.void
      : s === null
        ? Effect.fail(new AllowanceNotActive({ state: "none" }))
        : move === "grant"
          ? Effect.fail(new AllowanceExists({ state: s.state }))
          : Effect.fail(new AllowanceNotActive({ state: s.state }));

  // Stands in for a chain call between reading the state and writing it.
  private slow = (ms: number) => (ms > 0 ? Effect.sleep(Duration.millis(ms)) : Effect.void);

  private tellWorld = (e: AllowanceEvent) => Effect.promise(() => {
    const world = this.env.WORLD.get(this.env.WORLD.idFromName("world"));
    return world.record(e);
  });

  private grantP = (id: string, organization: string, member: string, limit: number, o: Options) => {
    const self = this;
    return Effect.gen(function* () {
      const s = yield* self.read;
      yield* self.allowed("grant", s);
      yield* self.slow(o.slowMs);
      const e = yield* self.write({ id, organization, member, limit, spent: 0, state: "active", version: 1 }, "grant", null);
      yield* self.tellWorld(e);
      return e.snapshot;
    });
  };

  private spendP = (amount: number, o: Options) => {
    const self = this;
    return Effect.gen(function* () {
      const s = yield* self.read;
      yield* self.allowed("spend", s);
      const cur = s!;
      const remaining = cur.limit - cur.spent;
      if (amount > remaining) return yield* new AllowanceExceeded({ remaining });
      yield* self.slow(o.slowMs);
      const spent = cur.spent + amount;
      const next: Snapshot = { ...cur, spent, state: spent === cur.limit ? "exhausted" : "active", version: cur.version + 1 };
      const e = yield* self.write(next, "spend", amount);
      yield* self.tellWorld(e);
      return e.snapshot;
    });
  };

  private revokeP = (o: Options) => {
    const self = this;
    return Effect.gen(function* () {
      const s = yield* self.read;
      yield* self.allowed("revoke", s);
      yield* self.slow(o.slowMs);
      const e = yield* self.write({ ...s!, state: "revoked", version: s!.version + 1 }, "revoke", null);
      yield* self.tellWorld(e);
      return e.snapshot;
    });
  };

  // ---- the RPC edge: guard, run, turn refusals into data ----

  private run<A>(o: Options, program: Effect.Effect<A, Refusal>): Promise<Result<A>> {
    const guarded = o.guard === "semaphore" ? this.lock.withPermits(1)(program) : program;
    const asResult = guarded.pipe(
      Effect.map((value): Result<A> => ({ ok: true, value })),
      Effect.catch((r: Refusal) => Effect.succeed<Result<A>>({ ok: false, refusal: { ...r, _tag: r._tag } })),
    );
    const go = () => Effect.runPromise(asResult);
    return o.guard === "bcw" ? this.ctx.blockConcurrencyWhile(go) : go();
  }

  grant(id: string, organization: string, member: string, limit: number, o: Options) {
    return this.run(o, this.grantP(id, organization, member, limit, o));
  }
  spend(amount: number, o: Options) { return this.run(o, this.spendP(amount, o)); }
  revoke(o: Options) { return this.run(o, this.revokeP(o)); }
  get() { return Effect.runPromise(this.read); }
  events() {
    return this.ctx.storage.sql.exec("SELECT seq, move, amount FROM events ORDER BY seq").toArray();
  }
}
```

### src/world.ts
```ts
// The world: things send their events up; it keeps the index, a derived view across things.
import { DurableObject } from "cloudflare:workers";
import { Effect } from "effect";
import type { AllowanceEvent, Snapshot } from "./model";

export class World extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.storage.sql.exec(`CREATE TABLE IF NOT EXISTS idx (
      id TEXT PRIMARY KEY, organization TEXT, member TEXT, lim INTEGER, spent INTEGER, state TEXT, version INTEGER)`);
    ctx.storage.sql.exec("CREATE INDEX IF NOT EXISTS idx_org_state ON idx (organization, state)");
  }

  // Applies a snapshot only if it is newer than what the index holds, so events that arrive out of order
  // (two moves of one thing racing on the hop up) cannot roll the view back.
  private apply = (s: Snapshot) => Effect.sync(() => {
    this.ctx.storage.sql.exec(
      `INSERT INTO idx (id,organization,member,lim,spent,state,version) VALUES (?,?,?,?,?,?,?)
       ON CONFLICT(id) DO UPDATE SET spent=excluded.spent, state=excluded.state, version=excluded.version
       WHERE excluded.version > idx.version`,
      s.id, s.organization, s.member, s.limit, s.spent, s.state, s.version);
  });

  record(e: AllowanceEvent) { return Effect.runPromise(this.apply(e.snapshot)); }

  listActive(organization: string) {
    return Effect.runPromise(Effect.sync(() =>
      this.ctx.storage.sql
        .exec("SELECT id, member, lim AS 'limit', spent, state FROM idx WHERE organization = ? AND state = 'active' ORDER BY id", organization)
        .toArray()));
  }
}
```

### src/worker.ts
```ts
// The router: a thin HTTP front so a Node script can drive the objects.
import type { Guard } from "./model";
export { Allowance } from "./allowance";
export { World } from "./world";

const json = (v: unknown, status = 200) =>
  new Response(JSON.stringify(v), { status, headers: { "content-type": "application/json" } });

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const [, kind, id, verb] = url.pathname.split("/");
    const q = url.searchParams;
    const o = { guard: (q.get("guard") ?? "none") as Guard, slowMs: Number(q.get("slowMs") ?? 0) };
    if (kind === "world" && id === "active") {
      const world = env.WORLD.get(env.WORLD.idFromName("world"));
      return json(await world.listActive(q.get("org") ?? ""));
    }
    if (kind === "allowance" && id) {
      const a = env.ALLOWANCE.get(env.ALLOWANCE.idFromName(id));
      switch (verb) {
        case "grant": return json(await a.grant(id, q.get("org")!, q.get("member")!, Number(q.get("limit")), o));
        case "spend": return json(await a.spend(Number(q.get("amount")), o));
        case "revoke": return json(await a.revoke(o));
        case "get": return json(await a.get());
        case "events": return json(await a.events());
      }
    }
    return json({ error: "not found" }, 404);
  },
} satisfies ExportedHandler<Env>;
```

### test.mjs (run `npx wrangler dev --local --port 8787`, then `node test.mjs`)
```js
// Drives `wrangler dev` (local). Usage: node test.mjs [baseUrl]
const BASE = process.argv[2] ?? "http://127.0.0.1:8787";
const run = Math.random().toString(36).slice(2, 8); // fresh ids per run
const call = async (path) => (await fetch(BASE + path)).json();
const q = (o) => new URLSearchParams(Object.entries(o).map(([k, v]) => [k, String(v)])).toString();
const A = (id, verb, o = {}) => call(`/allowance/${run}-${id}/${verb}?${q(o)}`);
let failures = 0;
const check = (name, cond, detail) => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "  " + JSON.stringify(detail) : ""}`);
  if (!cond) failures++;
};

// 1 and 2: two spends of 300 at once, against 500, under each guard and delay.
const race = async (label, guard, slowMs, expectRace = false) => {
  const id = `race-${label}`;
  await A(id, "grant", { org: "o1", member: "m", limit: 500, guard });
  const [a, b] = await Promise.all([A(id, "spend", { amount: 300, guard, slowMs }), A(id, "spend", { amount: 300, guard, slowMs })]);
  const ok = [a, b].filter((r) => r.ok).length;
  const refused = [a, b].find((r) => !r.ok);
  const row = await A(id, "get");
  const events = await A(id, "events");
  const pass = ok === 1 && refused?.refusal._tag === "AllowanceExceeded" && refused.refusal.remaining === 200 && row.spent === 300;
  if (expectRace) return check(`race guard=${guard} slowMs=${slowMs}: RACE REPRODUCED (both succeed, lost update)`, !pass && ok === 2,
    { succeeded: ok, spent: row.spent, events: events.length });
  check(`race guard=${guard} slowMs=${slowMs}: exactly one spend, other AllowanceExceeded{200}`, pass,
    { succeeded: ok, refusal: refused?.refusal, spent: row.spent, events: events.length });
};
await race("plain", "none", 0);
await race("slow", "none", 50, true);
await race("slow-sem", "semaphore", 50);
await race("slow-bcw", "bcw", 50);

// A heavier race: 10 spends of 100 against 500, with the delay, semaphore on.
{
  const id = "race10";
  await A(id, "grant", { org: "o1", member: "m", limit: 500, guard: "semaphore" });
  const rs = await Promise.all(Array.from({ length: 10 }, () => A(id, "spend", { amount: 100, guard: "semaphore", slowMs: 20 })));
  const row = await A(id, "get");
  check("10 concurrent spends of 100 against 500 (semaphore, slow): 5 succeed, state exhausted",
    rs.filter((r) => r.ok).length === 5 && row.spent === 500 && row.state === "exhausted",
    { succeeded: rs.filter((r) => r.ok).length, spent: row.spent, state: row.state });
}

// 3: revoke, then spend.
{
  await A("rv", "grant", { org: "o1", member: "m", limit: 100 });
  const r = await A("rv", "revoke");
  const s = await A("rv", "spend", { amount: 1 });
  check("revoke then spend: AllowanceNotActive{revoked}", r.ok && !s.ok && s.refusal._tag === "AllowanceNotActive" && s.refusal.state === "revoked", s.refusal);
  const g = await A("rv", "grant", { org: "o1", member: "m", limit: 100 });
  check("grant on an existing allowance refused", !g.ok, g.refusal);
  const n = await A("never", "spend", { amount: 1 });
  check("spend on no allowance: AllowanceNotActive{none}", !n.ok && n.refusal.state === "none", n.refusal);
}

// 4: the world's index across two organisations, checked right after every move.
{
  const orgX = `X-${run}`, orgY = `Y-${run}`;
  const expected = { [orgX]: new Set(), [orgY]: new Set() };
  const verify = async (after) => {
    for (const org of [orgX, orgY]) {
      const got = (await call(`/world/active?${q({ org })}`)).map((r) => r.id).sort();
      const want = [...expected[org]].sort();
      check(`listActive(${org[0]}) after ${after}`, JSON.stringify(got) === JSON.stringify(want), { got: got.length, want: want.length });
    }
  };
  const ids = { [orgX]: ["x1", "x2", "x3"], [orgY]: ["y1", "y2"] };
  for (const org of [orgX, orgY]) for (const id of ids[org]) {
    await A(id, "grant", { org, member: id, limit: 100 }); expected[org].add(`${run}-${id}`); await verify(`grant ${id}`);
  }
  await A("x1", "spend", { amount: 40 }); await verify("x1 spend 40 (still active)");
  await A("x1", "spend", { amount: 60 }); expected[orgX].delete(`${run}-x1`); await verify("x1 exhausted");
  await A("x2", "revoke"); expected[orgX].delete(`${run}-x2`); await verify("x2 revoked");
  await A("y1", "revoke"); expected[orgY].delete(`${run}-y1`); await verify("y1 revoked");
  const x3 = (await call(`/world/active?${q({ org: orgX })}`))[0];
  check("index row carries spent/limit", x3?.spent === 0 && x3?.limit === 100, x3);
}

// 5: timing of a spend including the hop to the world.
const pct = (xs, p) => xs.slice().sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor((p / 100) * xs.length))];
for (const guard of ["none", "semaphore"]) {
  const id = `time-${guard}`;
  await A(id, "grant", { org: "t", member: "m", limit: 1_000_000, guard });
  const ms = [];
  for (let i = 0; i < 50; i++) {
    const t = performance.now();
    const r = await A(id, "spend", { amount: 1, guard });
    ms.push(performance.now() - t);
    if (!r.ok) check("timed spend ok", false, r);
  }
  console.log(`TIME  spend guard=${guard} n=50  p50=${pct(ms, 50).toFixed(2)}ms  p95=${pct(ms, 95).toFixed(2)}ms  max=${Math.max(...ms).toFixed(2)}ms`);
}
console.log(failures === 0 ? "\nALL CHECKS PASS" : `\n${failures} CHECK(S) FAILED`);
```

### Output of the last run (the `listActive` lines are left out: all 18 passed)
```
PASS  race guard=none slowMs=0: exactly one spend, other AllowanceExceeded{200}  {"succeeded":1,"refusal":{"_tag":"AllowanceExceeded","remaining":200},"spent":300,"events":2}
PASS  race guard=none slowMs=50: RACE REPRODUCED (both succeed, lost update)  {"succeeded":2,"spent":300,"events":3}
PASS  race guard=semaphore slowMs=50: exactly one spend, other AllowanceExceeded{200}  {"succeeded":1,"refusal":{"_tag":"AllowanceExceeded","remaining":200},"spent":300,"events":2}
PASS  race guard=bcw slowMs=50: exactly one spend, other AllowanceExceeded{200}  {"succeeded":1,"refusal":{"_tag":"AllowanceExceeded","remaining":200},"spent":300,"events":2}
PASS  10 concurrent spends of 100 against 500 (semaphore, slow): 5 succeed, state exhausted  {"succeeded":5,"spent":500,"state":"exhausted"}
PASS  revoke then spend: AllowanceNotActive{revoked}  {"_tag":"AllowanceNotActive","state":"revoked"}
PASS  grant on an existing allowance refused  {"_tag":"AllowanceExists","state":"revoked"}
PASS  spend on no allowance: AllowanceNotActive{none}  {"_tag":"AllowanceNotActive","state":"none"}
PASS  index row carries spent/limit  {"id":"bq4b2r-x3","member":"x3","limit":100,"spent":0,"state":"active"}
TIME  spend guard=none n=50  p50=7.24ms  p95=9.20ms  max=10.39ms
TIME  spend guard=semaphore n=50  p50=6.98ms  p95=9.77ms  max=12.69ms

ALL CHECKS PASS
```