import { Effect, Schema } from "effect";
import type { Call, Journey, Operation, Thing } from "@architect/blueprint";
import { Scripting } from "@architect/blueprint/server";
import type { CallRecord, JourneyRun, JourneysApi, Project, StepResult } from "./types.ts";
import { loadProject } from "./internal/load.ts";
import { callOperation, castPeople, mayCall } from "./internal/world.ts";
import { runChecks, show } from "./internal/checks.ts";

type Codec = Schema.Codec<Record<string, unknown>, Record<string, unknown>>;

const nameOfOperation = (project: Project, op: Operation) => [...project.operations].find(([, o]) => o === op)?.[0];
const tableOf = (project: Project) => (thing: Thing) => [...project.things].find(([, t]) => t === thing)?.[0];

const run = (project: Project, url: string, journey: Journey, index: number) =>
  Effect.gen(function* () {
    const world = journey.starts === undefined ? undefined : project.startingWorlds.get(journey.starts);
    const calls: Array<CallRecord> = [];
    const steps: Array<StepResult> = [];
    const done = (stopped: string | undefined): JourneyRun => ({ name: journey.name, calls, steps, stopped });
    if (journey.starts !== undefined && !world) return done(`starting world ${journey.starts} is not in blueprint/starting-worlds`);

    // Each journey has its own people: the same name in two journeys is two people.
    const names = [...new Set([...Object.keys(journey.cast), ...Object.keys(world?.cast ?? {})])];
    const cast = yield* castPeople(url, names.map((n) => `j${index}.${n}`));
    const people = Object.fromEntries(names.map((n) => [n, cast[`j${index}.${n}`]!]));
    const env: Record<string, unknown> = { cast: Object.fromEntries(names.map((n) => [n, { person: people[n]!.person }])) };
    const facts = { url, tableOf: tableOf(project) };

    const make = (step: string, call: Call) =>
      Effect.gen(function* () {
        const operation = nameOfOperation(project, call.operation) ?? "an undeclared operation";
        const resolved = Scripting.resolve(call.payload, env);
        const payload = resolved.value as Record<string, unknown>;
        const person = people[call.actor]?.person ?? "";
        const principal = { kind: "person", person } as const;
        const may = yield* mayCall(url, facts.tableOf, call.operation, payload, principal);
        const r = yield* callOperation(url, operation, call.operation, payload, people[call.actor]?.token ?? "");
        const record: CallRecord = {
          journey: journey.name, step, actor: call.actor, person, operation, payload: r.wire, status: r.status, body: r.body,
          trace: r.trace, parent: r.parent, mayCall: may, journal: r.journal,
        };
        calls.push(record);
        if (r.status === 200) {
          env["last"] = yield* Schema.decodeUnknownEffect(call.operation.answerSchema as unknown as Codec)(r.body).pipe(Effect.orElseSucceed(() => r.body));
        }
        return { record, missing: resolved.missing };
      });

    if (world) {
      const script = Scripting.script(world.cast);
      for (const call of world.makes(script)) {
        const { record } = yield* make(`starting world ${world.name}`, call);
        if (record.status !== 200) return done(`starting world ${world.name}: ${record.operation} ${record.status === 500 ? "died" : `answered ${record.status}`}: ${show(record.body)}`);
      }
      const gives = Scripting.resolve(world.gives(script), env);
      if (gives.missing.length > 0) return done(`starting world ${world.name} gives nothing at ${gives.missing.join(", ")}`);
      env["world"] = gives.value;
    }

    for (const step of journey.steps(Scripting.script(journey.cast))) {
      const { record, missing } = yield* make(step.title, step.call);
      const checked = yield* runChecks(step.checks, record, env, facts);
      steps.push({
        journey: journey.name, title: step.title, trace: record.trace, spans: checked.spans,
        failures: [...missing.map((m) => `payload: nothing at ${m}`), ...checked.failures],
      });
    }
    return done(undefined);
  });

export const Journeys: JourneysApi = { load: loadProject, run };
