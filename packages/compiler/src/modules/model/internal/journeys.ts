import { NotAllowed, type Allowed, type Assertion, type Call, type Thing } from "orthograph";
import { ErrorNames, EventNames, Scripting } from "orthograph/server";
import type { AllowedModel, FieldsModel, JourneyModel, OperationModel, StartingWorldModel } from "../types.ts";
import type { Layout } from "./layout.ts";

const data = (value: unknown): unknown => {
  if (Scripting.isRef(value)) return { ref: Scripting.pathOf(value) };
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(data);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, data(v)]));
  return value;
};

const publicData = (values: Readonly<Record<string, unknown>>, fields: FieldsModel | undefined) =>
  Object.fromEntries(Object.entries(values).map(([key, value]) => [
    key, fields?.[key]?.visibility && !Scripting.isRef(value) ? { redacted: true } : data(value),
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
    return operation === undefined ? undefined : {
      actor: call.actor, operation, payload: publicData(call.payload, operations[operation]?.payload),
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
        const missing = "kind" in error && error.kind === "not-found" ? things.get(error.thing) : undefined;
        const fields = "fields" in error ? error.fields : undefined;
        return {
          kind: check.kind,
          error: thing !== undefined ? `${thing}.notFrom` : missing !== undefined ? `${missing}.notFound`
            : error === NotAllowed ? NotAllowed.name : ErrorNames.nameOf(error as Parameters<typeof ErrorNames.nameOf>[0]),
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
