// A step's checks against what its call got back and what the world now holds. Span checks wait for telemetry.
import { Effect } from "effect";
import type { Assertion, NotFound, NotFrom, Refusal, Thing } from "orthograph";
import { ErrorNames, EventNames, Scripting } from "orthograph/server";
import type { CallRecord, Facts } from "../types.ts";
import { stateOf } from "./world.ts";

/** Values as they travel: bigints as text, so `500n` and `"500"` compare equal. */
export const wireOf = (v: unknown): unknown =>
  typeof v === "bigint" ? v.toString()
  : Array.isArray(v) ? v.map(wireOf)
  : typeof v === "object" && v !== null ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, wireOf(x)]))
  : v;
export const show = (v: unknown) => JSON.stringify(wireOf(v));

export const tagOfClass = (cls: unknown): string =>
  ErrorNames.nameOf(cls as never) ?? String((new (cls as new (a: object) => { _tag?: unknown })({}))._tag);

const pascal = (name: string) => name.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join("");

/**
 * A machine's first declared state, whichever shape `states` has. Today `states` is the declared array; ST1.14 (G5 section 1) makes it a record of state references and keeps the
 * array as `declared`. This reads both, so the builder of ST1.14 does not touch this protected file. Once the record has landed it can read `declared[0]` alone.
 */
const firstStateOf = (machine: object): string => {
  const shape = machine as { readonly states?: unknown; readonly declared?: ReadonlyArray<string> };
  const declared = shape.declared ?? (Array.isArray(shape.states) ? (shape.states as ReadonlyArray<string>) : Object.keys((shape.states ?? {}) as object));
  return declared[0] ?? "";
};

/**
 * A refusal check's tag: a declared error's class name, `<Thing>Not<FirstState>` for a machine's own refusal, or
 * `<Thing>NotFound` for a missing instance (a thing's declared error of that name is the same tag, K16 M1.46).
 */
const tagOfRefusal = (error: Refusal, tableOf: (thing: Thing) => string | undefined): string => {
  if ((error as NotFound).kind === "not-found") return `${pascal(tableOf((error as NotFound).thing) ?? "?")}NotFound`;
  if ((error as NotFrom).kind !== "not-from") return tagOfClass(error);
  const machine = (error as NotFrom).machine;
  return `${pascal(tableOf(machine.thing) ?? "?")}Not${pascal(firstStateOf(machine))}`;
};

const subset = (want: Readonly<Record<string, unknown>>, got: unknown) =>
  typeof got === "object" && got !== null && Object.entries(want).every(([k, v]) => show(v) === show((got as Record<string, unknown>)[k]));

/** One failed check: the sentence prove prints, and the two halves of it when it has them. */
export interface Finding { readonly message: string; readonly expected?: string; readonly got?: string }

export const runChecks = (
  checks: ReadonlyArray<Assertion>,
  call: CallRecord,
  env: Readonly<Record<string, unknown>>,
  world: { readonly facts: Facts; readonly tableOf: (thing: Thing) => string | undefined },
) =>
  Effect.gen(function* () {
    const failures: Array<string> = [];
    // The same failures with what was expected and what came back, for prove's structured report.
    const findings: Array<Finding> = [];
    const bad = (message: string, expected?: string, got?: string) => {
      failures.push(message);
      findings.push({ message, ...(expected === undefined ? {} : { expected }), ...(got === undefined ? {} : { got }) });
    };
    const refused = typeof call.body === "object" && call.body !== null && call.status >= 400 ? (call.body as { _tag?: string })._tag : undefined;
    const said = call.status === 200 ? "answered" : refused ? `refused with ${refused}` : `failed with ${call.status}`;
    for (const c of checks) {
      // Only the values inside a check are refs; the declarations it names must stay the very objects they are.
      const refs = c.kind === "emits" || c.kind === "refuses" ? c.fields : c.kind === "is-in" ? c.id : undefined;
      const resolved = Scripting.resolve(refs, env);
      if (resolved.missing.length > 0) {
        bad(`${c.kind}: nothing at ${resolved.missing.join(", ")}`);
        continue;
      }
      const check = (c.kind === "emits" || c.kind === "refuses" ? { ...c, fields: resolved.value } : c.kind === "is-in" ? { ...c, id: resolved.value } : c) as Assertion;
      if (check.kind === "expect") {
        if (call.status !== 200) bad(`expected an answer, ${said}`, "an answer", said);
        else {
          const picked = check.pick(env["last"]);
          if (!check.match.test(String(wireOf(picked)))) bad(`answer ${show(picked)} doesn't match ${check.match}`, String(check.match), show(picked));
        }
      } else if (check.kind === "expect-equal") {
        if (call.status !== 200) bad(`expected an answer, ${said}`, "an answer", said);
        else {
          const picked = check.pick(env["last"]);
          // The expected value may name the script (`s.olga.person`): it means what the run gave it.
          const value = Scripting.resolve(check.value, env).value;
          if (show(picked) !== show(value)) bad(`answer ${show(picked)}, expected ${show(value)}`, show(value), show(picked));
        }
      } else if (check.kind === "refuses") {
        const tag = tagOfRefusal(check.error, world.tableOf);
        if (refused !== tag) bad(`expected refused with ${tag}, ${said}`, `refused with ${tag}`, said);
        else if (!subset(check.fields, call.body)) bad(`refused with ${tag} ${show(call.body)}, expected ${show(check.fields)}`, show(check.fields), show(call.body));
      } else if (check.kind === "emits") {
        const name = EventNames.nameOf(check.event) ?? "?";
        const found = call.journal.find((e) => e.event === name);
        if (!found) bad(`expected ${name}, journal has ${call.journal.map((e) => e.event).join(", ") || "nothing"}`, name, call.journal.map((e) => e.event).join(", ") || "nothing");
        else if (!subset(check.fields, found.fields)) bad(`${name} ${show(found.fields)}, expected ${show(check.fields)}`, show(check.fields), show(found.fields));
      } else if (check.kind === "no-events") {
        if (call.journal.length > 0) bad(`expected no events, journal has ${call.journal.map((e) => e.event).join(", ")}`, "no events", call.journal.map((e) => e.event).join(", "));
      } else if (check.kind === "is-in") {
        const table = world.tableOf(check.thing as Thing);
        const state = table ? yield* stateOf(world.facts, table, String(check.id)) : undefined;
        if (state !== check.state) bad(`${String(check.id)} is in ${state === undefined || state === null ? "no state" : `"${String(state)}"`}, expected "${check.state}"`, `"${check.state}"`, state === undefined || state === null ? "no state" : `"${String(state)}"`);
      }
    }
    const spans = checks.filter((c): c is Extract<Assertion, { kind: "spans" }> => c.kind === "spans");
    return { failures, findings, spans: { present: spans.flatMap((c) => c.present), absent: spans.flatMap((c) => c.absent) } };
  });
