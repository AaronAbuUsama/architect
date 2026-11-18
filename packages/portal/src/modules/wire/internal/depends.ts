// What an operation's proof rests on, from a model's JSON alone: the same as the compiler's `Compare.dependsOn` and
// `hashOf`, kept equal by a conformance test over current and historical models (generators, which may import both).
import type { Depends, ModelCore } from "../types.ts";

const thingOf = (ref: string | undefined): ReadonlyArray<string> => (ref ? [ref.split(".")[0]!] : []);

export const dependsOn = (model: ModelCore, name: string): Depends => {
  const op = model.operations[name];
  if (!op) return {};
  const fields = [...Object.values(op.payload), ...Object.values(op.answer), ...Object.values(model.things[op.thing]?.fields ?? {})];
  const roles = op.allowed.flatMap((a) => thingOf(a.role));
  const things = [...new Set([op.thing, ...fields.flatMap((f) => thingOf(f.ref)), ...roles])].sort();
  return {
    [`operation:${name}`]: op.hash,
    ...Object.fromEntries(things.flatMap((t) => (model.things[t] ? [[`thing:${t}`, model.things[t]!.hash]] : []))),
  };
};

export const hashOf = (model: ModelCore, key: string): string | undefined => {
  const [kind, name] = key.split(/:(.*)/s) as [string, string];
  return kind === "operation" ? model.operations[name]?.hash : kind === "thing" ? model.things[name]?.hash : undefined;
};
