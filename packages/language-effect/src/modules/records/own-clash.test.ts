// G5 section 6.2: a clash among the call's own rows is the handler's bug, found before any look at the store's holders: two inserts of one name are `own`
// even when a committed instance holds the name too. A call that moves the holder out of the name and takes it over is no clash (it follows `orderSteps`).
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { Blueprint } from "orthograph";
import { storeMemory, Unit } from "./service.ts";
import { Store } from "./types.ts";

const B = Blueprint as any;
const Handle = Blueprint.thing({
  description: "A name someone holds.",
  code: "HD",
  fields: { id: Blueprint.id("hdl"), name: Blueprint.text({ max: 40 }) },
});
const oneHolderPerName = B.invariant.unique(Handle.fields.name);
const rules = [{ name: "handle.oneHolderPerName", rule: oneHolderPerName }];

const checked = (initial: ReadonlyArray<readonly [any, any]>, f: (unit: any) => Effect.Effect<void, any, any>) =>
  Effect.runPromise(Effect.flatMap(Store, (store) => Effect.gen(function* () {
    const unit: any = yield* Unit.make(store, rules);
    yield* f(unit);
    return yield* unit.check;
  })).pipe(Effect.provide(storeMemory(initial as any, rules).layer)) as Effect.Effect<any>);

describe("unit.check and the call's own rows (G5 6.2)", () => {
  it("two inserts of one name are the handler's own clash, though a committed holder has the name too", async () => {
    const v = await checked([[Handle, { id: "hdl_0", name: "same" }]], (unit) => Effect.gen(function* () {
      yield* unit.records.insert(Handle, { id: "hdl_1", name: "same" });
      yield* unit.records.insert(Handle, { id: "hdl_2", name: "same" });
    }));
    expect(v).toMatchObject({ rule: "handle.oneHolderPerName", own: true });
  });

  it("one insert of a held name is another's, so a refusal and not own", async () => {
    const v = await checked([[Handle, { id: "hdl_0", name: "same" }]], (unit) => unit.records.insert(Handle, { id: "hdl_1", name: "same" }));
    expect(v).toMatchObject({ rule: "handle.oneHolderPerName", own: false });
  });

  it("updating the holder away and claiming its name breaks nothing", async () => {
    const v = await checked([[Handle, { id: "hdl_0", name: "same" }]], (unit) => Effect.gen(function* () {
      yield* unit.records.update(Handle, "hdl_0", { name: "other" });
      yield* unit.records.insert(Handle, { id: "hdl_1", name: "same" });
    }));
    expect(v).toBeUndefined();
  });
});
