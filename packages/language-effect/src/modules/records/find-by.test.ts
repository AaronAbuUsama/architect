// G4 (S-04), the handler's half: `Records.findBy(thing, field, value)` returns the one instance holding `value` in a unique
// field within the field's scope, or undefined; it sees this call's own writes first; it type-checks only for a declared unique
// field; and the store refuses, at commit, a second holder (a `conflict`, so the call runs again and its `findBy` then sees
// the first). Written by the checks author; the builder never edits this file or test/fixtures/find-by-types/.
//
// SPELLING. `unique: { name: { while: ["claimed"] } }` on `Blueprint.thing` is G4's first spelling. If the builder settles on
// `Blueprint.unique(...)`, they change ONLY the `Handle` declaration below (and the one in test/fixtures/find-by-types/).
//
// The store here is `storeMemory`, the in-memory double a host's store must agree with (same versions, same all-or-nothing
// commit); the real D1 store's half is `packages/host-cloudflare/src/modules/store/unique.test.ts`.
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { Blueprint } from "orthograph";
import { storeMemory, Unit } from "./service.ts";
import { Store } from "./types.ts";

const Handle = Blueprint.thing({
  description: "A name someone holds.",
  fields: { id: Blueprint.id("hdl"), name: Blueprint.text({ max: 40 }), note: Blueprint.text({ max: 40 }) },
  unique: { name: { while: ["claimed"] } },
});
const ada = { id: "hdl_1", name: "ada", note: "first" };

const withStore = <A>(initial: Parameters<typeof storeMemory>[0], f: (store: Store["Service"]) => Effect.Effect<A>) => {
  const memory = storeMemory(initial);
  return Effect.runPromise(Effect.flatMap(Store, f).pipe(Effect.provide(memory.layer))).then((a) => ({ a, memory }));
};
// `findBy` is not in the types yet; the cast keeps this file compiling today so it can run, and fail, as a test.
type Finder = { readonly findBy: (thing: typeof Handle, field: string, value: unknown) => Effect.Effect<{ readonly [k: string]: unknown } | undefined> };
const finder = (unit: { readonly records: unknown }) => unit.records as Finder;

describe("G4 control: what a handler reads today", () => {
  it("finds an instance by id, and a thing declaring nothing unique stores as before", async () => {
    const { a } = await withStore([[Handle, { ...ada, state: "claimed" }]], (store) =>
      Effect.gen(function* () {
        const unit = yield* Unit.make(store);
        return yield* unit.records.find(Handle, "hdl_1");
      }));
    expect(a).toMatchObject({ id: "hdl_1", name: "ada", state: "claimed" });
  });
});

describe("Records.findBy (G4)", () => {
  it("returns the instance holding the value within the scope, and undefined otherwise", async () => {
    const { a } = await withStore([
      [Handle, { ...ada, state: "claimed" }],
      [Handle, { id: "hdl_2", name: "grace", note: "x", state: "released" }],
    ], (store) =>
      Effect.gen(function* () {
        const records = finder(yield* Unit.make(store));
        return {
          held: yield* records.findBy(Handle, "name", "ada"),
          free: yield* records.findBy(Handle, "name", "nobody"),
          // grace is released: out of the scope "while claimed", so no one holds the name
          outOfScope: yield* records.findBy(Handle, "name", "grace"),
        };
      }));
    expect(a.held).toMatchObject({ id: "hdl_1", name: "ada", state: "claimed" });
    expect(a.free).toBeUndefined();
    expect(a.outOfScope).toBeUndefined();
  });

  it("sees this call's own writes first: an insert, a rename, and a move out of the scope", async () => {
    const { a } = await withStore([[Handle, { ...ada, state: "claimed" }]], (store) =>
      Effect.gen(function* () {
        const unit = yield* Unit.make(store);
        const records = finder(unit);
        const before = yield* records.findBy(Handle, "name", "grace");
        yield* unit.records.insert(Handle, { id: "hdl_2" as never, name: "grace", note: "x" }, "claimed");
        const inserted = yield* records.findBy(Handle, "name", "grace");
        yield* unit.records.update(Handle, "hdl_1", { name: "ada2" });
        const renamedAway = yield* records.findBy(Handle, "name", "ada");
        const renamedTo = yield* records.findBy(Handle, "name", "ada2");
        yield* unit.setState(Handle, "hdl_1", "released");
        const released = yield* records.findBy(Handle, "name", "ada2");
        return { before, inserted, renamedAway, renamedTo, released, stored: yield* store.find(Handle, "hdl_1") };
      }));
    expect(a.before).toBeUndefined();
    expect(a.inserted).toMatchObject({ id: "hdl_2", name: "grace" });
    expect(a.renamedAway).toBeUndefined();
    expect(a.renamedTo).toMatchObject({ id: "hdl_1", name: "ada2" });
    expect(a.released).toBeUndefined();
    expect(a.stored?.instance).toMatchObject({ name: "ada", state: "claimed" }); // nothing was written, only seen
  });
});

describe("the store enforces a unique field at commit (G4)", () => {
  it("two calls that both found the name free: the first commit lands and the second is a conflict, writing nothing", async () => {
    const { a, memory } = await withStore([], (store) =>
      Effect.gen(function* () {
        const first = yield* Unit.make(store);
        const second = yield* Unit.make(store);
        // Both look before either commits: neither sees a holder.
        const sawFirst = yield* finder(first).findBy(Handle, "name", "ada");
        const sawSecond = yield* finder(second).findBy(Handle, "name", "ada");
        yield* first.records.insert(Handle, { id: "hdl_1" as never, name: "ada", note: "a" }, "claimed");
        yield* second.records.insert(Handle, { id: "hdl_2" as never, name: "ada", note: "b" }, "claimed");
        yield* second.records.insert(Handle, { id: "hdl_3" as never, name: "other", note: "c" }, "claimed");
        const one = yield* store.commit({ writes: yield* first.writes, entries: [] });
        const two = yield* store.commit({ writes: yield* second.writes, entries: [] });
        // The retry: a fresh attempt now sees the winner.
        const retry = yield* Unit.make(store);
        return { sawFirst, sawSecond, one, two, retried: yield* finder(retry).findBy(Handle, "name", "ada") };
      }));
    expect([a.sawFirst, a.sawSecond]).toEqual([undefined, undefined]);
    expect([a.one, a.two]).toEqual(["committed", "conflict"]);
    expect(a.retried).toMatchObject({ id: "hdl_1", name: "ada" });
    expect(memory.rows.map((r) => r.instance["id"])).toEqual(["hdl_1"]); // the losing commit wrote none of its inserts
  });

  it("the scope frees the name: a released holder and a new claim live together, and a release makes room", async () => {
    const { a } = await withStore([[Handle, { ...ada, state: "claimed" }]], (store) =>
      Effect.gen(function* () {
        const unit = yield* Unit.make(store);
        yield* unit.setState(Handle, "hdl_1", "released");
        const released = yield* store.commit({ writes: yield* unit.writes, entries: [] });
        const again = yield* Unit.make(store);
        yield* again.records.insert(Handle, { id: "hdl_2" as never, name: "ada", note: "b" }, "claimed");
        const claimed = yield* store.commit({ writes: yield* again.writes, entries: [] });
        // A released instance moved back into the scope while the name is held: refused as a conflict, not stored.
        const back = yield* Unit.make(store);
        yield* back.setState(Handle, "hdl_1", "claimed");
        const reclaimed = yield* store.commit({ writes: yield* back.writes, entries: [] });
        return { released, claimed, reclaimed, stored: yield* store.find(Handle, "hdl_1") };
      }));
    expect([a.released, a.claimed, a.reclaimed]).toEqual(["committed", "committed", "conflict"]);
    expect(a.stored?.instance).toMatchObject({ state: "released" });
  });
});

describe("findBy type-checks only for a declared unique field (G4)", () => {
  const repo = resolve(import.meta.dirname, "../../../../..");
  const fixture = join(repo, "packages/language-effect/test/fixtures/find-by-types");
  it("compiles: a unique field is accepted, and a field not declared unique (`note`) or not a field at all is a type error", { timeout: 60_000 }, () => {
    const result = spawnSync(join(repo, "node_modules/.bin/tsc"), ["-p", join(fixture, "tsconfig.json")], { cwd: repo, encoding: "utf8" });
    const errors = result.stdout.split("\n").filter((l) => l.includes("error TS"));
    expect(errors, "the fixture's `@ts-expect-error` lines must each hide exactly one error, and its other lines none").toEqual([]);
  });
});
