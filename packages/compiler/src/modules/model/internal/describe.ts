// Turns the layout into the model: every declaration named, every reference resolved, every entry hashed.
import { Duration } from "effect";
import type { Allowed, Field, FieldsInput, Operation, Read, Value, Visibility } from "orthograph";
import type { AllowedModel, FieldModel, FieldsModel, Model, OperationModel, ThingModel, VisibilityModel } from "../types.ts";
import { Blanks } from "orthograph/server";
import { MACHINE_NUMBER, codeOf, inDeclarationOrder, prefixes, refusalsOf } from "./codes.ts";
import { environmentsOf } from "./environments.ts";
import { hashOf } from "./hash.ts";
import { camel, pascal, type Layout } from "./layout.ts";

/** A module's exports in name order: a namespace's own order differs between loaders, and the model must not. */
const byName = <V>(m: ReadonlyMap<string, V>) => [...m].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

export const describe = (layout: Layout): { model: Model; problems: Array<string> } => {
  const problems = [...layout.problems];
  const valueNames = new Map<Value, string>([...layout.values].map(([n, v]) => [v, n]));
  const thingNames = new Map([...layout.things].flatMap(([n, t]) => (t.thing ? [[t.thing, n] as const] : [])));
  const eventNames = new Map([...layout.things.values()].flatMap((t) => [...t.events].map(([n, e]) => [e, n] as const)));
  const errorNames = new Map([...layout.things.values()].flatMap((t) => [...t.errors].map(([n, e]) => [e, n] as const)));
  const roleNames = new Map(
    [...layout.things.values()].flatMap((t) => [...t.roles].map(([n, r]) => [r, `${t.name}.${n}`] as const)),
  );

  const fieldRef = (f: Field): string | undefined => {
    const thing = thingNames.get(f.of);
    return thing ? `${thing}.${f.key}` : undefined;
  };
  /** Public is the default and is left out; a private role is named as `thing.role`. */
  const visibilityModel = (v: Visibility, where: string): VisibilityModel | undefined =>
    v === "public" ? undefined
    : v === "secret" ? "secret"
    : { private: v.to.map((r) => roleNames.get(r) ?? problem(problems, `${where}: is private to a role not exported from a roles.ts`)) };
  const fieldModel = (input: Field | Value, where: string): FieldModel => {
    const value = input.kind === "field" ? input.value : input;
    const named = valueNames.get(value);
    const ref = input.kind === "field" ? fieldRef(input) : undefined;
    if (input.kind === "field" && !ref) problems.push(`${where}: uses a field of a thing that isn't in the blueprint`);
    const visibility = visibilityModel(input.visibility, where);
    return { value: value.meta, ...(named ? { named } : {}), ...(ref ? { ref } : {}), ...(visibility ? { visibility } : {}) };
  };
  const fieldsModel = (fields: FieldsInput, where: string): FieldsModel =>
    Object.fromEntries(Object.entries(fields).map(([k, f]) => [k, fieldModel(f, `${where} field ${k}`)]));

  // What isn't written yet, by declaration. A blank thing part is described as empty; a blank operation is left out.
  const blanks: Record<string, Array<string>> = {};
  const blankIn = (owner: string, parts: Record<string, unknown>) => {
    const found = Object.entries(parts).flatMap(([k, v]) => (Blanks.isBlank(v) ? [`${k}: ${v.what}`] : []));
    if (found.length > 0) blanks[owner] = [...(blanks[owner] ?? []), ...found];
    return found.length > 0;
  };

  const prefix = prefixes(layout.things, problems);
  const things: Record<string, ThingModel> = {};
  for (const [name, t] of [...layout.things].sort(([a], [b]) => a.localeCompare(b))) {
    if (!t.thing) continue;
    const where = t.base;
    const fields = Object.fromEntries(
      Object.entries(t.thing.fields).map(([k, f]) => [k, fieldModel(f.from ?? f.value, `${where}/thing.ts field ${k}`)]),
    );
    const m = t.machine;
    blankIn(name, {
      description: t.thing.description, states: m?.states,
      ...Object.fromEntries([...t.roles].map(([r, role]) => [`role ${r}`, (role as { rule?: unknown }).rule])),
    });
    const states = m && !Blanks.isBlank(m.states) ? m.states : [];
    const machine = m
      ? {
          states,
          moves: Object.fromEntries(Object.entries(m.moves).map(([k, mv]) => [k, {
            from: mv.from, to: mv.to, emits: eventNames.get(mv.emits) ?? problem(problems, `${where}/machine.ts move ${k}: emits an event not exported from events.ts`),
          }])),
          notFrom: { error: `${pascal(name)}Not${pascal(states[0] ?? "")}`, exit: m.notFrom.exit, code: codeOf(prefix.get(name) ?? "??", MACHINE_NUMBER) },
        }
      : null;
    if (m && m.thing !== t.thing) problems.push(`${where}/machine.ts: is a machine of another thing`);
    const entry = {
      name, identifier: pascal(name), code: prefix.get(name) ?? "??", description: Blanks.isBlank(t.thing.description) ? "" : t.thing.description, fields, lives: t.thing.lives ?? "database", machine,
      events: Object.fromEntries(byName(t.events).map(([n, e]) => [n, fieldsModel(e.fields, `${where}/events.ts ${n}`)])),
      errors: Object.fromEntries(inDeclarationOrder(t.errors).map(([n, e], i) => [n, { fields: fieldsModel(e.fields, `${where}/errors.ts ${n}`), exit: e.exit, code: codeOf(prefix.get(name) ?? "??", i + 1) }])),
      roles: [...t.roles.keys()].sort(),
      ...(t.from ? { from: t.from } : {}),
    };
    things[name] = { ...entry, hash: hashOf(entry) };
  }

  const allowedModel = (a: Allowed, where: string): AllowedModel => {
    if (a.kind === "anyone") return { kind: "anyone" };
    if (a.kind === "signed-in") return { kind: "signed-in" };
    const name = (r: unknown) => roleNames.get(r as never) ?? problem(problems, `${where}: uses a role not exported from a roles.ts`);
    if (a.kind === "role") return { kind: "role", role: name(a) };
    return { kind: "role-of", role: name(a.role), path: a.path };
  };

  const operations: Record<string, OperationModel> = {};
  for (const [thing, t] of [...layout.things].sort(([a], [b]) => a.localeCompare(b))) {
    for (const [verb, { file, declaration: op }] of [...t.verbs].sort(([a], [b]) => a.localeCompare(b))) {
      const parts = op.kind === "read"
        ? { [op.by === "list" ? "where" : "fields"]: op.by === "list" ? op.where : op.fields, allowed: op.allowed }
        : { description: op.description, payload: op.payload, answer: op.answer, allowed: op.allowed, errors: op.errors, steps: op.steps, move: op.move };
      if (blankIn(`${thing}.${verb}`, parts)) continue;
      const model = operationModel(thing, verb, file, op);
      operations[`${thing}.${verb}`] = t.from ? withFrom(model, t.from) : model;
    }
  }

  function operationModel(thing: string, verb: string, file: string, declared: Operation | Read): OperationModel {
    if (declared.thing !== layout.things.get(thing)?.thing) problems.push(`${file}: declares an operation of another thing`);
    if (declared.kind === "read") return readModel(thing, verb, file, declared);
    const op = declared;
    if (op.runs !== "server") problems.push(`${file}: runs "${op.runs}" is not supported yet: ${RUNS_NEEDS[op.runs] ?? "an unknown place"}`);
    const machine = things[thing]?.machine;
    const move = op.move
      ? { key: op.move.key, from: op.move.from, to: op.move.to, emits: eventNames.get(op.move.emits) ?? "?" }
      : null;
    if (op.move && op.move.machine !== layout.things.get(thing)?.machine) problems.push(`${file}: moves another thing's machine`);
    const errors = op.errors.map((e) => errorNames.get(e) ?? problem(problems, `${file}: declares an error not exported from an errors.ts`));
    // Each refusal goes on the wire by its name: two classes of one name in one union can't be told apart.
    for (const tag of new Set(errors.filter((n, i) => errors.indexOf(n) !== i && n !== "?"))) {
      problems.push(`${file}: ${thing}.${verb}'s errors are a union with two classes tagged ${tag}, so the refusal is ambiguous on the wire: rename one`);
    }
    const allowed = op.allowed.map((a) => allowedModel(a, file));
    const refusals = [
      ...errors,
      ...(move && move.from.length > 0 && machine ? [machine.notFrom.error] : []),
      ...(allowed.every((a) => a.kind === "anyone") ? [] : ["NotAllowed"]),
    ];
    const entry = {
      kind: "operation" as const,
      name: `${thing}.${verb}`, thing, verb, identifier: camel(verb), file, description: op.description,
      payload: fieldsModel(op.payload, `${file} payload`), answer: fieldsModel(op.answer, `${file} answer`),
      move, errors, refusals, allowed,
      steps: Object.fromEntries(Object.entries(op.steps).map(([k, s]) => [k, { name: `${thing}.${verb}.${k}`, type: s.type, ...(s.optional ? { optional: true } : {}) }])),
      idempotent: op.idempotent ?? null,
      runs: "server" as const, test: op.test,
      budget: op.budget ? { p95Ms: Duration.toMillis(op.budget.p95) } : null,
    };
    return { ...entry, hash: hashOf(entry) };
  }

  /** A read: answered from the thing's records with no handler, so no move, no steps, no declared errors. */
  function readModel(thing: string, verb: string, file: string, read: Read): OperationModel {
    const allowed = read.allowed.map((a) => allowedModel(a, file));
    const list = read.by === "list";
    const t = layout.things.get(thing);
    if (list && t?.thing?.lives === "actor") problems.push(`${file}: a list read needs a thing that lives in the database, and ${thing} lives as actors`);
    if (list && read.where.includes("state") && !t?.machine) problems.push(`${file}: where "state" needs ${thing} to have a machine`);
    if (list && (!Number.isInteger(read.page) || (read.page ?? 0) < 1 || (read.page ?? 0) > 1000)) problems.push(`${file}: page must be a whole number from 1 to 1000`);
    const payload = Object.fromEntries(Object.entries(fieldsModel(read.payload, `${file} payload`)).map(([k, f]) => [k, read.optional.includes(k) ? { ...f, optional: true as const } : f]));
    const entry = {
      kind: "read" as const,
      name: `${thing}.${verb}`, thing, verb, identifier: camel(verb), file,
      description: list
        ? `List ${thing}s, ${read.order === "newest" ? "newest first" : "oldest first"}, ${read.page} to a page${read.where.length > 0 ? `, filtered by ${read.where.join(", ")}` : ""}.`
        : `Read one ${thing} by its id: ${read.fields.map(String).join(", ")}.`,
      payload, answer: fieldsModel(read.answer, `${file} answer`),
      move: null, errors: [], refusals: allowed.every((a) => a.kind === "anyone") ? [] : ["NotAllowed"], allowed,
      steps: {}, idempotent: null, runs: "server" as const, test: "unit" as const,
      budget: read.budget ? { p95Ms: Duration.toMillis(read.budget.p95) } : null,
      ...(list ? { list: { where: [...read.where], order: read.order ?? "newest", page: read.page ?? 0 } } : {}),
    };
    return { ...entry, hash: hashOf(entry) };
  }

  const refusals = refusalsOf(things, problems);
  const values = Object.fromEntries([...layout.values].sort(([a], [b]) => a.localeCompare(b)).map(([n, v]) => [n, v.meta]));
  const environments = environmentsOf(layout, problems);
  return {
    model: { refusals, values, things, operations, ...(Object.keys(blanks).length > 0 ? { blanks } : {}), ...(Object.keys(environments).length > 0 ? { environments } : {}) },
    problems,
  };
};

/** What an operation that doesn't run on the server needs: a language that does. Only the Effect language exists today. */
const RUNS_NEEDS: Readonly<Record<string, string>> = {
  client: "it needs a language that runs operations on the caller's own device (language-noir, a later language), and this project's only language, language-effect, runs them all on the server",
  chain: "it needs a language that runs operations on a chain (language-solidity, or language-noir on Aztec), and this project's only language, language-effect, runs them all on the server",
};

/** A plugin's operation carries where it came from, in its hash too. */
const withFrom = (op: OperationModel, from: NonNullable<OperationModel["from"]>): OperationModel => {
  const { hash: _, ...entry } = op;
  return { ...entry, from, hash: hashOf({ ...entry, from }) };
};

const problem = (problems: Array<string>, p: string): string => {
  problems.push(p);
  return "?";
};
