// A step's checks against what its call got back and what the world now holds. Span checks wait for telemetry.
import { Effect } from "effect";
import type { Assertion, Thing } from "@architect/blueprint";
import { ErrorNames, EventNames, Scripting } from "@architect/blueprint/server";
import type { CallRecord } from "../types.ts";
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

const subset = (want: Readonly<Record<string, unknown>>, got: unknown) =>
  typeof got === "object" && got !== null && Object.entries(want).every(([k, v]) => show(v) === show((got as Record<string, unknown>)[k]));

export const runChecks = (
  checks: ReadonlyArray<Assertion>,
  call: CallRecord,
  env: Readonly<Record<string, unknown>>,
  world: { readonly url: string; readonly tableOf: (thing: Thing) => string | undefined },
) =>
  Effect.gen(function* () {
    const failures: Array<string> = [];
    const refused = typeof call.body === "object" && call.body !== null && call.status >= 400 ? (call.body as { _tag?: string })._tag : undefined;
    const said = call.status === 200 ? "answered" : refused ? `refused with ${refused}` : `failed with ${call.status}`;
    for (const c of checks) {
      // Only the values inside a check are refs; the declarations it names must stay the very objects they are.
      const refs = c.kind === "emits" || c.kind === "refuses" ? c.fields : c.kind === "is-in" ? c.id : undefined;
      const resolved = Scripting.resolve(refs, env);
      if (resolved.missing.length > 0) {
        failures.push(`${c.kind}: nothing at ${resolved.missing.join(", ")}`);
        continue;
      }
      const check = (c.kind === "emits" || c.kind === "refuses" ? { ...c, fields: resolved.value } : c.kind === "is-in" ? { ...c, id: resolved.value } : c) as Assertion;
      if (check.kind === "expect") {
        if (call.status !== 200) failures.push(`expected an answer, ${said}`);
        else {
          const picked = check.pick(env["last"]);
          if (!check.match.test(String(wireOf(picked)))) failures.push(`answer ${show(picked)} doesn't match ${check.match}`);
        }
      } else if (check.kind === "refuses") {
        const tag = tagOfClass(check.error);
        if (refused !== tag) failures.push(`expected refused with ${tag}, ${said}`);
        else if (!subset(check.fields, call.body)) failures.push(`refused with ${tag} ${show(call.body)}, expected ${show(check.fields)}`);
      } else if (check.kind === "emits") {
        const name = EventNames.nameOf(check.event) ?? "?";
        const found = call.journal.find((e) => e.event === name);
        if (!found) failures.push(`expected ${name}, journal has ${call.journal.map((e) => e.event).join(", ") || "nothing"}`);
        else if (!subset(check.fields, found.fields)) failures.push(`${name} ${show(found.fields)}, expected ${show(check.fields)}`);
      } else if (check.kind === "no-events") {
        if (call.journal.length > 0) failures.push(`expected no events, journal has ${call.journal.map((e) => e.event).join(", ")}`);
      } else if (check.kind === "is-in") {
        const table = world.tableOf(check.thing as Thing);
        const state = table ? yield* stateOf(world.url, table, String(check.id)) : undefined;
        if (state !== check.state) failures.push(`${String(check.id)} is in ${state === undefined || state === null ? "no state" : `"${String(state)}"`}, expected "${check.state}"`);
      }
    }
    const spans = checks.filter((c): c is Extract<Assertion, { kind: "spans" }> => c.kind === "spans");
    return { failures, spans: { present: spans.flatMap((c) => c.present), absent: spans.flatMap((c) => c.absent) } };
  });
