// Planted fixture (G4, S-04). Compiled on its own by records/find-by.test.ts, never by the package's typecheck. `findBy` takes a
// field only when the thing declares it unique: the first lines compile, and each `@ts-expect-error` line hides exactly one error.
// SPELLING: the `unique:` line below is G4's first spelling. A builder who settles on `Blueprint.unique(...)` changes only it.
import { Effect } from "effect";
import { Blueprint } from "orthograph";
import { Records } from "../../../src/modules/records/types.ts";

const Handle = Blueprint.thing({
  description: "A name someone holds.",
  fields: { id: Blueprint.id("hdl"), name: Blueprint.text({ max: 40 }), note: Blueprint.text({ max: 40 }) },
  unique: { name: { while: ["claimed"] } },
});

export const program = Effect.gen(function* () {
  const records = yield* Records;
  // A declared unique field, with a value of its own type: accepted, and the answer may be there or not.
  const held = yield* records.findBy(Handle, "name", "ada");
  const name: string | undefined = held ? String(held["name"]) : undefined;
  // @ts-expect-error `note` is a field, but not declared unique
  yield* records.findBy(Handle, "note", "x");
  // @ts-expect-error `nickname` is not a field at all
  yield* records.findBy(Handle, "nickname", "x");
  // @ts-expect-error the value is the field's own type, not a number
  yield* records.findBy(Handle, "name", 7);
  return name;
});
