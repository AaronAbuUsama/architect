import { NotAllowed, type Allowed, type Assertion, type Call, type FieldsInput, type Thing } from "orthograph";
import { Blanks, ErrorNames, EventNames, Scripting } from "orthograph/server";
import type { AllowedModel, JourneyModel, OperationModel, StartingWorldModel } from "../types.ts";
import type { Layout } from "./layout.ts";

const data = (value: unknown): unknown => {
  if (Scripting.isRef(value)) return { ref: Scripting.pathOf(value) };
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(data);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, data(v)]));
  return value;
};

/** A payload with each secret field redacted: `secret` says by key (a ref is only a path, so it stays). */
const publicData = (values: Readonly<Record<string, unknown>>, secret: (key: string) => boolean) =>
  Object.fromEntries(Object.entries(values).map(([key, value]) => [
    key, secret(key) && !Scripting.isRef(value) ? { redacted: true } : data(value),
  ]));

export const storiesOf = (
  layout: Layout,
  operations: Readonly<Record<string, OperationModel>>,
  allowed: (rule: Allowed, file: string) => AllowedModel,
) => {
  const names = new Map([...layout.things.values()].flatMap((t) => [...t.verbs].map(([verb, v]) => [v.declaration, `${t.name}.${verb}`] as const)));
  const things = new Map([...layout.things.values()].map((t) => [t.thing, t.name]));
  const refused = new Map([...layout.things.values()].map((t) => [t.machine?.notFrom, t.name]));
  const castOf = (cast: Readonly<Record<string, Allowed>>, file: string) =>
    Object.fromEntries(Object.entries(cast).map(([name, role]) => [name, allowed(role, file)]));

  const callOf = (call: Call) => {
    const operation = names.get(call.operation);
    if (operation === undefined) return undefined;
    // A blank operation has no model to read visibility from, but its payload fields are declared: redact by declaration.
    const declared = (call.operation as { readonly payload?: unknown }).payload;
    const secret = (key: string) => operations[operation] !== undefined
      ? operations[operation].payload[key]?.visibility !== undefined
      : Blanks.isBlank(declared) || (declared as FieldsInput | undefined)?.[key]?.visibility !== undefined || (declared as FieldsInput | undefined)?.[key] === undefined;
    return {
      actor: call.actor, operation, payload: publicData(call.payload, secret),
      ...(call.request === undefined ? {} : { request: call.request }),
    };
  };

  const checkOf = (check: Assertion): { readonly kind: Assertion["kind"]; readonly [key: string]: unknown } => {
    switch (check.kind) {
      case "expect": return { kind: check.kind, match: check.match.source, flags: check.match.flags };
      case "expect-equal": return { kind: check.kind, value: data(check.value) };
      case "emits": return {
        kind: check.kind, event: EventNames.nameOf(check.event),
        fields: Object.fromEntries(Object.entries(check.fields).map(([k, v]) => [k, check.event.fields[k]?.visibility === "public" ? data(v) : { redacted: true }])),
      };
      case "refuses": {
        const error = check.error;
        const thing = "kind" in error && error.kind === "not-from" ? refused.get(error) : undefined;
        const fields = "fields" in error ? error.fields : undefined;
        return {
          kind: check.kind,
          error: thing !== undefined ? `${thing}.notFrom` : error === NotAllowed ? NotAllowed.name : ErrorNames.nameOf(error as Parameters<typeof ErrorNames.nameOf>[0]),
          fields: Object.fromEntries(Object.entries(check.fields).map(([k, v]) => [k, fields?.[k]?.visibility && fields[k]?.visibility !== "public" ? { redacted: true } : data(v)])),
        };
      }
      case "is-in": return { kind: check.kind, thing: things.get(check.thing as Thing), id: data(check.id), state: check.state };
      default: return check;
    }
  };

  const journeys: Record<string, JourneyModel> = {};
  for (const [file, { declaration: j, sourceHash }] of [...layout.journeys].sort(([a], [b]) => a.localeCompare(b))) {
    const cast = castOf(j.cast, file);
    const steps = j.steps(Scripting.script(j.cast)).map((step) => {
      const call = callOf(step.call);
      return call === undefined
        ? { title: step.title, skipped: "operation is outside the model" }
        : { title: step.title, call, checks: step.checks.map(checkOf) };
    });
    journeys[file] = { name: j.name, file, cast, starts: j.starts ?? null, steps, ...(sourceHash ? { sourceHash } : {}) };
  }

  const startingWorlds: Record<string, StartingWorldModel> = {};
  for (const [name, { file, declaration: w, sourceHash }] of layout.startingWorlds) {
    const cast = castOf(w.cast, file);
    const members = { ...w.cast };
    const seen = new Set([name]);
    for (let parent = w.from; parent !== undefined && !seen.has(parent);) {
      seen.add(parent);
      const ancestor = layout.startingWorlds.get(parent)?.declaration;
      for (const [actor, role] of Object.entries(ancestor?.cast ?? {})) members[actor] ??= role;
      parent = ancestor?.from;
    }
    const script = Scripting.script(members);
    startingWorlds[name] = {
      name, file, from: w.from ?? null, cast, ...(sourceHash ? { sourceHash } : {}),
      makes: w.makes(script).map((call) => callOf(call) ?? null), gives: data(w.gives(script)),
    };
  }
  return { journeys, startingWorlds };
};
