// The model, read at view time (so a derived block can't drift), and the derived blocks drawn from it. Pure but for
// the two reads at the top: model.json, cached by its modified time, and a generated action's source.
import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "./config.ts";
import type { Field, Fields, Model, Operation } from "./types.ts";

let cached: { mtime: number; model: Model } | undefined;
export const readModel = (): Model => {
  const file = resolve(config.root, "generated/model/model.json");
  const mtime = statSync(file).mtimeMs;
  if (!cached || cached.mtime !== mtime) cached = { mtime, model: JSON.parse(readFileSync(file, "utf8")) as Model };
  return cached.model;
};

const typeOf = (f: Field) => {
  const v = f.value;
  return v.type === "id" ? `id ${v.prefix}_` : v.type === "uint" ? `uint${v.bits}` : v.type === "text" ? `text ≤${v.max}` : v.type;
};
export const fieldRows = (fields: Fields | undefined) =>
  Object.entries(fields ?? {}).map(([name, f]) => ({ name, type: typeOf(f), named: f.named, ref: f.ref, secret: f.visibility === "secret" }));

const allowedSays = (op: Operation) =>
  (op.allowed ?? []).map((a) => (a.kind === "role" ? a.role! : a.kind === "role-of" ? `${a.role} of its ${a.path}` : a.kind));

/** Every refusal an operation can answer with, and where it comes from. */
export const refusalRows = (model: Model, op: Operation) => {
  const thing = model.things[op.thing];
  return (op.refusals ?? []).map((name) => {
    const declared = Object.entries(model.things).find(([, t]) => t.errors?.[name])?.[1]?.errors?.[name];
    const from =
      name === "NotAllowed" ? `the role check: open only to ${allowedSays(op).join(" or ")}`
      : thing?.machine?.notFrom?.error === name ? `the machine: ${op.move?.key ?? op.verb} moves only from ${op.move?.from.join(", ")}`
      : "the handler (a declared error)";
    return { name, code: model.refusals[name], exit: declared?.exit ?? (thing?.machine?.notFrom?.error === name ? thing.machine.notFrom.exit : undefined), carries: fieldRows(declared?.fields), from };
  });
};

const opsOf = (model: Model, thing: string) => Object.values(model.operations).filter((o) => o.thing === thing);

const actionSource = (op: Operation) => {
  const file = resolve(process.cwd(), "actions", `${op.thing}-${op.verb}.ts`);
  return existsSync(file) ? readFileSync(file, "utf8") : undefined;
};

/** A `<Model of show>` block, drawn from today's model. `undefined` when what it names no longer exists. */
export const modelBlock = (model: Model, of: string, show: string): unknown => {
  const [kind, name = ""] = of.split(":") as [string, string];
  if (kind === "environments") return Object.values(model.environments).map((e) => ({ ...e }));
  if (kind === "operation") {
    const op = model.operations[name];
    if (!op) return undefined;
    switch (show) {
      case "summary": return { name: op.name, description: op.description, kind: op.kind, allowed: allowedSays(op), idempotent: op.idempotent, budget: op.budget, steps: Object.values(op.steps ?? {}), hash: op.hash, action: `${op.thing}-${op.verb}` };
      case "payload": return fieldRows(op.payload);
      case "answer": return fieldRows(op.answer);
      case "move": return op.move;
      case "refusals": return refusalRows(model, op);
      case "action": return { file: `actions/${op.thing}-${op.verb}.ts`, source: actionSource(op) };
    }
    return undefined;
  }
  const [thingName, sub = ""] = name.split(".") as [string, string];
  const t = model.things[thingName];
  if (!t) return undefined;
  if (kind === "thing") {
    switch (show) {
      case "fields": return { description: t.description, code: t.code, lives: t.lives, fields: fieldRows(t.fields) };
      case "operations": return opsOf(model, thingName).map((o) => ({ name: o.name, verb: o.verb, kind: o.kind, description: o.description, allowed: allowedSays(o), budget: o.budget?.p95Ms }));
      case "machine": return t.machine ? { ...t.machine, ops: opsOf(model, thingName).filter((o) => o.move).map((o) => ({ op: o.name, key: o.move!.key })) } : undefined;
      case "events": return Object.entries(t.events ?? {}).map(([e, f]) => ({ name: e, fields: fieldRows(f) }));
      case "errors": return Object.entries(t.errors ?? {}).map(([e, d]) => ({ name: e, code: d.code, exit: d.exit, fields: fieldRows(d.fields) }));
      case "roles": return (t.roles ?? []).map((r) => ({ name: `${thingName}.${r}`, opens: rolesOpen(model, `${thingName}.${r}`) }));
    }
    return undefined;
  }
  if (kind === "event") {
    const f = t.events?.[sub];
    return f ? { name: sub, fields: fieldRows(f), emittedBy: opsOf(model, thingName).filter((o) => o.move?.emits === sub).map((o) => o.name) } : undefined;
  }
  if (kind === "error") {
    const d = t.errors?.[sub];
    return d ? { name: sub, code: d.code, exit: d.exit, fields: fieldRows(d.fields), refusedBy: Object.values(model.operations).filter((o) => o.refusals?.includes(sub)).map((o) => o.name) } : undefined;
  }
  if (kind === "role") return t.roles?.includes(sub) ? { name, opens: rolesOpen(model, name) } : undefined;
  return undefined;
};

/** The operations a role opens: directly (`allowance.grantee`) or through a path (`organization.owner` of its organization). */
export const rolesOpen = (model: Model, role: string) =>
  Object.values(model.operations).filter((o) => o.allowed?.some((a) => a.role === role)).map((o) => o.name);
