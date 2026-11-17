import { Effect, Schema } from "effect";
import type { Call, Journey, Operation, Principal, Read, StartingWorld, Thing } from "@architect/blueprint";
import { Blueprint } from "@architect/blueprint";
import { Scripting } from "@architect/blueprint/server";
import type { CallRecord, Facts, JourneyRun, JourneysApi, Project, StepResult } from "./types.ts";
import { loadProject } from "./internal/load.ts";
import { callOperation, castPeople, doorFacts, mayCall, signUpPeople, stateOf } from "./internal/world.ts";
import { databaseFacts } from "./internal/database-facts.ts";
import { subjectId } from "./internal/subject.ts";
import { runChecks, show } from "./internal/checks.ts";

type Codec = Schema.Codec<Record<string, unknown>, Record<string, unknown>>;

const nameOfOperation = (project: Project, op: Operation | Read) => [...project.operations].find(([, o]) => o === op)?.[0];
const tableOf = (project: Project) => (thing: Thing) => [...project.things].find(([, t]) => t === thing)?.[0];

const run = (project: Project, url: string, journey: Journey, index: number, how: "world" | "sign-up" = "world", given?: Facts) =>
  Effect.gen(function* () {
    const world = journey.starts === undefined ? undefined : project.startingWorlds.get(journey.starts);
    // A starting world may begin from another: make the oldest first, so each sees what the one before it gave.
    const lineage: Array<StartingWorld> = [];
    for (let w = world; w && !lineage.includes(w); w = w.from === undefined ? undefined : project.startingWorlds.get(w.from)) lineage.unshift(w);
    const missingParent = lineage[0]?.from;
    const calls: Array<CallRecord> = [];
    const steps: Array<StepResult> = [];
    const done = (stopped: string | undefined): JourneyRun => ({ name: journey.name, calls, steps, stopped });
    if (journey.starts !== undefined && !world) return done(`starting world ${journey.starts} is not in blueprint/starting-worlds`);
    if (missingParent !== undefined) return done(`starting world ${lineage[0]!.name} begins from ${missingParent}, which is not in blueprint/starting-worlds`);

    // Each journey has its own people: the same name in two journeys is two people.
    const names = [...new Set([...Object.keys(journey.cast), ...lineage.flatMap((w) => Object.keys(w.cast))])];
    // Cast as anyone: not signed up, so the script can sign them up itself; everyone else is, for real.
    const anyone = names.filter((n) => (journey.cast[n] as { readonly kind?: string } | undefined)?.kind === "anyone" && !lineage.some((w) => n in w.cast));
    const wanted = [names.filter((n) => !anyone.includes(n)).map((n) => `j${index}.${n}`), anyone.map((n) => `j${index}.${n}`)] as const;
    const casting = yield* how === "world"
      ? castPeople(url, ...wanted).pipe(Effect.map((c) => ({ cast: c })))
      : signUpPeople(url, ...wanted).pipe(Effect.map((c) => ({ cast: c })), Effect.catch((problem: string) => Effect.succeed({ problem })));
    if ("problem" in casting) return done(`its people couldn't be made: ${casting.problem}`);
    const cast = casting.cast;
    const people = Object.fromEntries(names.map((n) => [n, cast[`j${index}.${n}`]!]));
    const env: Record<string, unknown> = { cast: people };
    const facts = { facts: given ?? doorFacts(url), tableOf: tableOf(project) };

    const make = (step: string, call: Call) =>
      Effect.gen(function* () {
        const operation = nameOfOperation(project, call.operation) ?? "an undeclared operation";
        const resolved = Scripting.resolve(call.payload, env);
        const payload = resolved.value as Record<string, unknown>;
        const who = people[call.actor];
        const person = who?.person ?? "";
        const principal: Principal = who?.person ? { kind: "person", person: who.person, email: who.email } : { kind: "anonymous" };
        const may = yield* mayCall(facts.facts, facts.tableOf, call.operation, payload, principal);
        const r = yield* callOperation(url, facts.facts, operation, call.operation, payload, people[call.actor]?.token ?? "", call.request);
        const model = project.model.operations[operation];
        const id = model?.move && r.status === 200 ? subjectId(model, r.wire, r.body) : undefined;
        const state = id === undefined ? undefined : yield* stateOf(facts.facts, model!.thing, id);
        const record: CallRecord = {
          journey: journey.name, step, actor: call.actor, person, operation, payload: r.wire, status: r.status, body: r.body,
          trace: r.trace, parent: r.parent, mayCall: may, journal: r.journal, stored: typeof state === "string" ? state : undefined,
        };
        calls.push(record);
        if (r.status === 200) {
          env["last"] = yield* Schema.decodeUnknownEffect(call.operation.answerSchema as unknown as Codec)(r.body).pipe(Effect.orElseSucceed(() => r.body));
        }
        return { record, missing: resolved.missing };
      });

    for (const w of lineage) {
      const script = Scripting.script(Object.fromEntries(names.map((n) => [n, Blueprint.signedIn])));
      for (const call of w.makes(script)) {
        const { record } = yield* make(`starting world ${w.name}`, call);
        if (record.status !== 200) return done(`starting world ${w.name}: ${record.operation} ${record.status === 500 ? "died" : `answered ${record.status}`}: ${show(record.body)}`);
      }
      const gives = Scripting.resolve(w.gives(script), env);
      if (gives.missing.length > 0) return done(`starting world ${w.name} gives nothing at ${gives.missing.join(", ")}`);
      env["world"] = { ...(env["world"] as object | undefined), ...(gives.value as object) };
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

export const Journeys: JourneysApi = { load: loadProject, run, databaseFacts };
