import type { Model } from "#modules/model/types.ts";
import type { CompareApi, Depends } from "./types.ts";
import { diff } from "./internal/diff.ts";

const dependsOn = (model: Model, name: string): Depends => {
  const op = model.operations[name];
  if (!op) return {};
  const thingOf = (ref: string | undefined) => (ref ? [ref.split(".")[0]!] : []);
  const fields = [...Object.values(op.payload), ...Object.values(op.answer), ...Object.values(model.things[op.thing]?.fields ?? {})];
  const roles = op.allowed.flatMap((a) => ("role" in a ? thingOf(a.role) : []));
  const things = [...new Set([op.thing, ...fields.flatMap((f) => thingOf(f.ref)), ...roles])].sort();
  return {
    [`operation:${name}`]: op.hash,
    ...Object.fromEntries(things.flatMap((t) => (model.things[t] ? [[`thing:${t}`, model.things[t]!.hash]] : []))),
  };
};

const hashOf = (model: Model, key: string): string | undefined => {
  const [kind, name] = key.split(/:(.*)/s) as [string, string];
  return kind === "operation" ? model.operations[name]?.hash : kind === "thing" ? model.things[name]?.hash : undefined;
};

export const Compare: CompareApi = { models: diff, dependsOn, hashOf };
