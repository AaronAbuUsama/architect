// S-35 (design/goals/03-snags.md): the unique check of one call that wrote n rows costs work in proportion to n, not to n times n. Today `holderOf`
// (internal/holder.ts) walks every row the call has written, once for each row it checks, and each step reads the call's writes again.
//
// Primary, deterministic: how many times the check asks "does this row hold this key" (`holds`) and computes a key (`ruleKey`), counted at the rule module's
// seam while `unit.check` runs. Linear work is a few of each per row; the budget is 6 per row (BUDGET). No clock is involved.
//   Measured on 21 November 2026 (a laptop). Today: 200 rows -> 40,400 looks, 600 rows -> 361,200 (9x for 3x the rows, about n x n); at 3,000 rows the check
//   passes the 18,000 budget after its first rows and is stopped. The planted linear index (a Map from rule and key, built once per check): 4 looks a row,
//   so 800, 2,400 and 12,000 looks for 200, 600 and 3,000 rows (3x for 3x the rows).
// Secondary: the same call finishes within TIME_MS on a CI runner, measured from the start of `unit.check`.
//   Today the 3,000-row check is stopped at the TIME_MS deadline with about 70,000 to 300,000 looks done and about 9,000,000 to go (minutes). The planted
//   linear index took 25 to 46 ms, under a hundredth of TIME_MS (4,000 ms), so a linear build has two orders of room on a slow runner.
//   Not caught, and not claimed: a build that still compares every pair but on keys it worked out once calls neither `holds` nor `ruleKey` and costs only
//   cheap string compares (9 million at 3,000 rows, well under TIME_MS). The snag is the rescan that does real work for each pair, and that is what this pins.
//   The run is stopped by the same seam: a `holds` or `ruleKey` call past the limit or the deadline throws, so a quadratic build fails in seconds, where it
//   would otherwise run for minutes (its work is synchronous, so a test timeout cannot stop it).
// Controls pass today: a real duplicate inside the bulk write, a duplicate of a stored row, a rule's scope (states), `findBy` over the call's written rows,
// and a floor on the counts, so a build that never looks at the written rows cannot pass by counting nothing.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Effect, Exit } from "effect";
import { describe, expect, it, vi } from "vitest";
import { Blueprint } from "orthograph";
import { storeMemory, Unit } from "./service.ts";
import { Store } from "./types.ts";

const seam = vi.hoisted(() => ({ holds: 0, keys: 0, limit: Number.POSITIVE_INFINITY, deadline: Number.POSITIVE_INFINITY }));
vi.mock("./internal/unique.ts", async (original) => {
  const real = await original<typeof import("./internal/unique.ts")>();
  const guard = (what: "holds" | "keys") => {
    seam[what] += 1;
    if (seam.holds + seam.keys > seam.limit) throw new Error(`over the budget: ${seam.holds} holds and ${seam.keys} keys so far`);
    if (performance.now() > seam.deadline) throw new Error(`over the time: ${seam.holds} holds and ${seam.keys} keys so far`);
  };
  return {
    ...real,
    holds: (...args: Parameters<typeof real.holds>) => (guard("holds"), real.holds(...args)),
    ruleKey: (...args: Parameters<typeof real.ruleKey>) => (guard("keys"), real.ruleKey(...args)),
  };
});

const B = Blueprint as any;
const Tag = Blueprint.thing({
  description: "A name someone holds.",
  code: "TG",
  fields: { id: Blueprint.id("tag"), name: Blueprint.text({ max: 40 }) },
});
const machine = Blueprint.machine(Tag, {
  states: ["claimed", "released"],
  moves: { claim: { from: [], to: "claimed", emits: Blueprint.event({}) }, release: { from: ["claimed"], to: "released", emits: Blueprint.event({}) } },
  notFrom: { exit: 60 },
});
const everyState = [{ name: "tag.oneHolderPerName", rule: B.invariant.unique(Tag.fields.name) }];
const whileClaimed = [{ name: "tag.oneClaimerPerName", rule: B.invariant.unique(Tag.fields.name, { while: [machine.states.claimed] }) }];

const N = 3_000;
/** The work the check may do: 6 looks a row. A linear index does 4. */
const BUDGET = (n: number) => 6 * n;
const TIME_MS = 4_000;

type Ran = { verdict: any; holds: number; keys: number; reads: number; ms: number; failed?: string | undefined };

/** Insert `rows` into one call over a store holding `stored`, then run `unit.check`, counting at the seam. `limit` and `ms` stop a runaway build. */
const run = async (
  rules: ReadonlyArray<any>,
  stored: ReadonlyArray<any>,
  rows: ReadonlyArray<{ fields: any; state?: string | undefined }>,
  stop: { limit?: number; ms?: number } = {},
  before?: (unit: any) => Effect.Effect<void, any, any>,
): Promise<Ran> => {
  const memory = storeMemory(stored.map((s) => [Tag, s] as const) as any, rules);
  let reads = 0;
  const program = Effect.gen(function* () {
    const store = yield* Store;
    const counted = {
      ...store,
      find: (...a: Parameters<typeof store.find>) => (reads++, store.find(...a)),
      list: (...a: Parameters<typeof store.list>) => (reads++, store.list(...a)),
    } as typeof store;
    const unit: any = yield* Unit.make(counted, rules);
    for (const r of rows) yield* unit.records.insert(Tag, r.fields, r.state);
    if (before) yield* before(unit);
    reads = 0;
    seam.holds = 0;
    seam.keys = 0;
    seam.limit = stop.limit ?? Number.POSITIVE_INFINITY;
    seam.deadline = performance.now() + (stop.ms ?? Number.POSITIVE_INFINITY);
    const started = performance.now();
    const verdict = yield* Effect.exit(unit.check);
    const took = performance.now() - started;
    seam.limit = Number.POSITIVE_INFINITY;
    seam.deadline = Number.POSITIVE_INFINITY;
    return { verdict, took };
  });
  const { verdict, took } = await Effect.runPromise(program.pipe(Effect.provide(memory.layer)) as Effect.Effect<{ verdict: Exit.Exit<any>; took: number }>);
  return {
    verdict: Exit.isSuccess(verdict) ? verdict.value : undefined,
    holds: seam.holds, keys: seam.keys, reads, ms: took,
    failed: Exit.isFailure(verdict) ? String(verdict.cause) : undefined,
  };
};

const distinct = (n: number, state?: string) => Array.from({ length: n }, (_, i) => ({ fields: { id: `tag_${i}`, name: `name-${i}` }, state }));

describe("S-35: the unique check of a bulk write costs work in proportion to the rows", () => {
  it(`${N} distinct rows in one call: the check keeps to ${BUDGET(N)} key looks (6 a row)`, async () => {
    const r = await run(everyState, [], distinct(N), { limit: BUDGET(N) });
    expect(r.failed, `the check ran past ${BUDGET(N)} (6 x ${N}) looks at the rule's keys: ${r.failed}`).toBeUndefined();
    expect(r.verdict).toBeUndefined();
    expect(r.holds + r.keys).toBeLessThanOrEqual(BUDGET(N));
  }, 60_000);

  it("the count grows with the rows: three times the rows is under four times the looks", async () => {
    const small = await run(everyState, [], distinct(200));
    const large = await run(everyState, [], distinct(600));
    const [a, b] = [small.holds + small.keys, large.holds + large.keys];
    expect(small.verdict).toBeUndefined();
    expect(large.verdict).toBeUndefined();
    // Linear is 3x, quadratic 9x.
    expect(b / a, `200 rows: ${a} looks, 600 rows: ${b} looks`).toBeLessThan(4);
  }, 60_000);

  it(`${N} distinct rows in one call finish within ${TIME_MS} ms`, async () => {
    const r = await run(everyState, [], distinct(N), { ms: TIME_MS });
    expect(r.failed, `the check was still running after ${TIME_MS} ms: ${r.failed}`).toBeUndefined();
    expect(r.ms).toBeLessThan(TIME_MS);
    expect(r.verdict).toBeUndefined();
  }, 60_000);
});

describe("S-35 controls: the check still judges the bulk write", () => {
  it("it is not hollow: every row is looked at at least once, and the answer is no violation", async () => {
    const r = await run(everyState, [], distinct(200));
    expect(r.verdict).toBeUndefined();
    expect(r.holds + r.keys).toBeGreaterThanOrEqual(200);
  });

  it("a real duplicate inside the bulk write is refused as the call's own clash", async () => {
    const r = await run(everyState, [], [...distinct(300), { fields: { id: "tag_dup", name: "name-150" } }]);
    expect(r.verdict).toMatchObject({ rule: "tag.oneHolderPerName", own: true });
  });

  it("a duplicate of a stored row is refused, and it is not the call's own", async () => {
    const r = await run(everyState, [{ id: "tag_stored", name: "name-77" }], distinct(300));
    expect(r.verdict).toMatchObject({ rule: "tag.oneHolderPerName", own: false });
    expect(String(r.verdict.row.id)).toBe("tag_77");
  });

  it("a stored row's key taken by a row of the bulk write that renames into it is refused", async () => {
    const r = await run(everyState, [{ id: "tag_stored", name: "taken" }], distinct(300), {}, (unit) => unit.records.update(Tag, "tag_10", { name: "taken" }));
    expect(r.verdict).toMatchObject({ rule: "tag.oneHolderPerName", own: false });
  });

  it("scope: a duplicate among released rows is no violation, a duplicate among claimed rows is", async () => {
    const released = Array.from({ length: 200 }, (_, i) => ({ fields: { id: `tag_r${i}`, name: `shared-${i % 5}` }, state: "released" }));
    const claimed = distinct(200, "claimed");
    const fine = await run(whileClaimed, [], [...claimed, ...released]);
    expect(fine.verdict).toBeUndefined();
    const clash = await run(whileClaimed, [], [...claimed, { fields: { id: "tag_dup", name: "name-9" }, state: "claimed" }, ...released]);
    expect(clash.verdict).toMatchObject({ rule: "tag.oneClaimerPerName", own: true });
  });

  it("scope: a claimed row taking a released stored row's key is no violation; taking a claimed stored row's key is", async () => {
    const fine = await run(whileClaimed, [{ id: "tag_old", name: "name-5", state: "released" }], distinct(200, "claimed"));
    expect(fine.verdict).toBeUndefined();
    const clash = await run(whileClaimed, [{ id: "tag_old", name: "name-5", state: "claimed" }], distinct(200, "claimed"));
    expect(clash.verdict).toMatchObject({ rule: "tag.oneClaimerPerName", own: false });
  });

  it("findBy over the call's written rows finds the holder: first, middle, last, and none for a name nobody holds", async () => {
    const memory = storeMemory([] as any, everyState);
    const found = await Effect.runPromise(Effect.flatMap(Store, (store) => Effect.gen(function* () {
      const unit: any = yield* Unit.make(store, everyState);
      for (const r of distinct(400)) yield* unit.records.insert(Tag, r.fields, r.state);
      const ids = [];
      for (const name of ["name-0", "name-200", "name-399", "name-nobody"]) ids.push((yield* unit.records.findBy(everyState[0]!.rule, name))?.id);
      return ids;
    })).pipe(Effect.provide(memory.layer)) as Effect.Effect<any>);
    expect(found).toEqual(["tag_0", "tag_200", "tag_399", undefined]);
  });
});
