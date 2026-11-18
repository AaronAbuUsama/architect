import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { Blueprint } from "orthograph";
import { storeMemory, Unit } from "./service.ts";
import { Store } from "./types.ts";

const Box = Blueprint.thing({ description: "A box.", fields: { id: Blueprint.id("box"), items: Blueprint.uint(32) } });

const withStore = <A>(initial: Parameters<typeof storeMemory>[0], f: (store: Store["Service"]) => Effect.Effect<A>) => {
  const memory = storeMemory(initial);
  return Effect.runPromise(Effect.flatMap(Store, f).pipe(Effect.provide(memory.layer))).then((a) => ({ a, memory }));
};

describe("a unit of work", () => {
  it("holds writes back, reads its own writes, and merges them per instance", async () => {
    const { a } = await withStore([[Box, { id: "box_1", items: 1n, state: "open" }]], (store) =>
      Effect.gen(function* () {
        const unit = yield* Unit.make(store);
        yield* unit.records.insert(Box, { id: "box_2" as never, items: 5n });
        yield* unit.records.update(Box, "box_1", { items: 2n });
        yield* unit.records.update(Box, "box_1", { items: 3n });
        yield* unit.setState(Box, "box_1", "shut");
        const seen = yield* unit.records.find(Box, "box_1");
        const stored = yield* store.find(Box, "box_1");
        return { seen, stored, writes: yield* unit.writes };
      }));
    expect(a.seen).toEqual({ id: "box_1", items: 3n, state: "shut" });
    expect(a.stored?.instance).toEqual({ id: "box_1", items: 1n, state: "open" }); // nothing written yet
    expect(a.writes.map((w) => w.kind)).toEqual(["insert", "update"]);
    expect(a.writes[1]).toMatchObject({ id: "box_1", version: 0, changes: { items: 3n }, state: "shut" });
  });

  it("commits all of it, or none of it when a version has moved on", async () => {
    const { a, memory } = await withStore([[Box, { id: "box_1", items: 1n }]], (store) =>
      Effect.gen(function* () {
        const first = yield* Unit.make(store);
        const second = yield* Unit.make(store);
        yield* first.records.update(Box, "box_1", { items: 2n });
        yield* second.records.update(Box, "box_1", { items: 9n });
        yield* second.records.insert(Box, { id: "box_2" as never, items: 0n });
        const one = yield* store.commit({ writes: yield* first.writes, entries: [] });
        const two = yield* store.commit({ writes: yield* second.writes, entries: [] });
        return { one, two, after: yield* store.find(Box, "box_1") };
      }));
    expect([a.one, a.two]).toEqual(["committed", "conflict"]);
    expect(a.after).toEqual({ instance: { id: "box_1", items: 2n }, version: 1 });
    expect(memory.rows.some((r) => r.instance["id"] === "box_2")).toBe(false); // the losing commit wrote nothing
  });
});
