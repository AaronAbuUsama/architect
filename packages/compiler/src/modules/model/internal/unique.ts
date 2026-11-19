// A thing's unique fields (G4): what the model carries, and what the compiler refuses before it does.
import type { Thing } from "orthograph";
import type { ThingModel } from "../types.ts";

/**
 * The model's `unique` for one thing, or undefined when it declares none. Refused, naming the thing's file: a unique field on a
 * thing that lives as actors (one instance per actor has nothing to be unique among), a name that isn't a field, a `while`
 * naming a state the machine lacks, and a `while` on a thing with no machine at all (no states to name).
 */
export const uniqueOf = (thing: Thing, states: ReadonlyArray<string>, hasMachine: boolean, where: string, problems: Array<string>): ThingModel["unique"] => {
  const names = Object.keys(thing.unique);
  if (names.length === 0) return undefined;
  const file = `${where}/thing.ts`;
  if (thing.lives === "actor") problems.push(`${file}: a unique field needs a thing that lives in the database, and this one lives as actors (one instance per actor has nothing to be unique among)`);
  const model: Record<string, { while?: ReadonlyArray<string> }> = {};
  for (const name of names) {
    const scope = thing.unique[name]!;
    if (!(name in thing.fields)) problems.push(`${file}: unique ${name} is not a field of the thing`);
    const lacking = (scope.while ?? []).filter((s) => !states.includes(s));
    if (lacking.length > 0) {
      problems.push(hasMachine
        ? `${file}: unique ${name} is only while ${lacking.map((s) => `"${s}"`).join(", ")}, and the machine has no such state (it has ${states.join(", ")})`
        : `${file}: unique ${name} is only while ${lacking.map((s) => `"${s}"`).join(", ")}, and the thing has no machine, so no states`);
    }
    model[name] = scope.while ? { while: [...scope.while] } : {};
  }
  return model;
};
