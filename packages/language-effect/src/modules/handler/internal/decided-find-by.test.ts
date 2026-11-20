// G4 (S-04), Codex P2 on #118: the Records a handler is actually given is the unit's, wrapped by `logs.watching` (service.ts), so
// that wrapper must carry `findBy` too: a lookup through it finds the holder, and what it found is learned for the log's
// redaction like any other read. Written by the checks author; the builder never edits this file.
// SPELLING: the `unique:` line is G4's first spelling; a builder who chose another changes only it.
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { Blueprint } from "orthograph";
import { storeMemory, Unit } from "#modules/records/service.js";
import { Store } from "#modules/records/types.js";
import { recordingLogs } from "./decided.ts";

const Handle = Blueprint.thing({
  description: "A name someone holds.",
  fields: { id: Blueprint.id("hdl"), name: Blueprint.text({ max: 40 }) },
  unique: { name: { while: ["claimed"] } },
});

describe("the Records a handler gets (wrapped by logs.watching)", () => {
  it("has a working findBy: the holder in scope, undefined for a free name, and the call's own insert", async () => {
    const memory = storeMemory([[Handle, { id: "hdl_1", name: "ada", state: "claimed" }]]);
    const seen = await Effect.runPromise(Effect.gen(function* () {
      const unit = yield* Unit.make(yield* Store);
      const logs = yield* recordingLogs({}, {});
      const records = logs.watching(unit.records);
      const held = yield* records.findBy(Handle, "name", "ada");
      const free = yield* records.findBy(Handle, "name", "grace");
      yield* records.insert(Handle, { id: "hdl_2" as never, name: "grace" }, "claimed");
      return { held, free, own: yield* records.findBy(Handle, "name", "grace") };
    }).pipe(Effect.provide(memory.layer)));
    expect(seen.held).toMatchObject({ id: "hdl_1", name: "ada" });
    expect(seen.free).toBeUndefined();
    expect(seen.own).toMatchObject({ id: "hdl_2", name: "grace" });
  });
});
