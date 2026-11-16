import { Cause, Effect, Exit, Layer, Tracer } from "effect";
import { describe, expect, expectTypeOf, it } from "vitest";
import { Blueprint } from "@architect/blueprint";
import { ErrorNames } from "@architect/blueprint/server";
import { Busy } from "#modules/work/types.ts";
import { BusyLive } from "#modules/work/service.ts";
import { recordsMemory } from "#modules/records/service.ts";
import { journalMemory } from "#modules/journal/service.ts";
import { Records } from "#modules/records/types.ts";
import { EventNames } from "@architect/blueprint/server";
import { NotAllowed } from "#modules/access/types.ts";
import { Handlers } from "./service.ts";
import { InvalidPayload, type Handler } from "./types.ts";

// A stand-in for acme's allowance, declared here: the runtime never imports a project.
const Amount = Blueprint.value(Blueprint.uint(128));
const Allowance = Blueprint.thing({
  description: "Money a member may spend.",
  fields: { id: Blueprint.id("alw"), member: Blueprint.id("per"), limit: Amount },
});
class AllowanceLimitTooHigh extends Blueprint.error({ cap: Amount }, { exit: 44 }) {}
ErrorNames.name(AllowanceLimitTooHigh, "AllowanceLimitTooHigh"); // what generated code does
const grant = Blueprint.operation(Allowance, {
  description: "Let a member spend, up to a limit.",
  payload: { member: Allowance.fields.member, limit: Allowance.fields.limit },
  answer: { allowance: Allowance.fields.id },
  errors: [AllowanceLimitTooHigh],
  allowed: [Blueprint.signedIn],
  steps: { insert: Blueprint.step.database() },
});

const handler: Handler<typeof grant> = (payload, { steps }) =>
  payload.limit > 1000n
    ? Effect.fail(new AllowanceLimitTooHigh({ cap: 1000n }))
    : steps.insert(Effect.succeed({ allowance: "alw_1" as never }));

/** The in-memory exporter: every span the runtime opens, kept for the test to read. */
const recording = () => {
  const spans: Array<Tracer.NativeSpan> = [];
  const tracer = Tracer.make({ span: (options) => { const s = new Tracer.NativeSpan(options); spans.push(s); return s; } });
  const journal = journalMemory();
  return { spans, journal, layer: Layer.mergeAll(BusyLive, recordsMemory([]), journal.layer, Layer.succeed(Tracer.Tracer, tracer)) };
};
const ada = { kind: "person", person: "per_ada" } as const;
const served = Handlers.serve({ name: "allowance.grant", operation: grant, handler });

describe("handler wrapper", () => {
  it("runs the handler in a span named after the operation, with its payload as attributes", async () => {
    const { spans, layer } = recording();
    const answer = await Effect.runPromise(Effect.provide(served.call({ member: "per_olga", limit: "500" }, ada), layer));
    expect(answer).toEqual({ allowance: "alw_1" });
    const span = spans.find((s) => s.name === "allowance.grant");
    expect(span?.status._tag).toBe("Ended");
    expect(Object.fromEntries(span!.attributes)).toMatchObject({
      operation: "allowance.grant", "principal.person": "per_ada", "payload.member": "per_olga", "payload.limit": "500",
    });
    const step = spans.find((s) => s.name === "allowance.grant.insert");
    expect(step?.parent._tag === "Some" && step.parent.value.spanId).toBe(span!.spanId);
  });

  it("passes a declared error through, typed, and counts the work until it ends", async () => {
    const { layer } = recording();
    const exit = await Effect.runPromise(Effect.provide(
      Effect.gen(function* () {
        const result = yield* Effect.exit(served.call({ member: "per_olga", limit: "5000" }, ada));
        return { result, count: yield* (yield* Busy).count };
      }), layer));
    expect(exit.count).toBe(0);
    const error = Exit.isFailure(exit.result) ? Cause.squash(exit.result.cause) : undefined;
    expect(error).toBeInstanceOf(AllowanceLimitTooHigh);
    expect(error).toMatchObject({ _tag: "AllowanceLimitTooHigh", cap: 1000n });
    expectTypeOf(served.call).returns.toExtend<Effect.Effect<unknown, AllowanceLimitTooHigh | InvalidPayload | NotAllowed, unknown>>();
  });

  it("refuses an anonymous caller with NotAllowed before the handler runs", async () => {
    const { spans, layer } = recording();
    const exit = await Effect.runPromiseExit(Effect.provide(served.call({ member: "per_olga", limit: "500" }, { kind: "anonymous" }), layer));
    expect(Exit.isFailure(exit) ? Cause.squash(exit.cause) : undefined).toBeInstanceOf(NotAllowed);
    expect(spans.map((s) => s.name)).toEqual([]); // the handler never ran, so it has no span
  });

  it("refuses a payload outside its declaration before the handler runs", async () => {
    const { spans, layer } = recording();
    const exit = await Effect.runPromiseExit(Effect.provide(served.call({ member: "olga", limit: "500" }, ada), layer));
    expect(Exit.isFailure(exit) && Cause.pretty(exit.cause)).toContain("InvalidPayload");
    expect(spans.some((s) => s.name === "allowance.grant.insert")).toBe(false);
  });

  it("an answer outside its declaration dies as the handler's bug", async () => {
    const bad = Handlers.serve({ name: "allowance.grant", operation: grant, handler: () => Effect.succeed({ allowance: "nope" as never }) });
    const exit = await Effect.runPromiseExit(Effect.provide(bad.call({ member: "per_olga", limit: "1" }, ada), recording().layer));
    expect(Exit.isFailure(exit) && Cause.pretty(exit.cause)).toContain("answered outside its declaration");
  });

  describe("moves", () => {
    const Granted = Blueprint.event({ allowance: Allowance.fields.id, limit: Amount });
    EventNames.name(Granted, "Granted");
    const machine = Blueprint.machine(Allowance, { states: ["active"], moves: { grant: { from: [], to: "active", emits: Granted } }, notFrom: { exit: 40 } });
    const moving = Blueprint.operation(Allowance, {
      description: "Grant, with its move.",
      payload: { member: Allowance.fields.member, limit: Allowance.fields.limit },
      answer: { allowance: Allowance.fields.id },
      move: machine.moves.grant,
      allowed: [Blueprint.signedIn],
    });
    const insertAndMove = (to?: string): Handler<typeof moving, Records> => (payload, { move }) =>
      Effect.gen(function* () {
        const records = yield* Records;
        yield* records.insert(Allowance, { id: "alw_7" as never, member: payload.member, limit: payload.limit });
        yield* move(to as never);
        return { allowance: "alw_7" as never };
      });

    it("sets the state and journals the event once the handler answers", async () => {
      const r = recording();
      const s = Handlers.serve({ name: "allowance.grant", operation: moving, handler: insertAndMove() });
      const state = await Effect.runPromise(Effect.gen(function* () {
        yield* s.call({ member: "per_olga", limit: "500" }, ada);
        return (yield* (yield* Records).find(Allowance, "alw_7"))?.state;
      }).pipe(Effect.provide(r.layer)));
      expect(state).toBe("active");
      expect(r.journal.entries).toEqual([
        expect.objectContaining({ operation: "allowance.grant", move: "grant", subject: "alw_7", event: "Granted", fields: { allowance: "alw_7", limit: "500" } }),
      ]);
      expect(r.spans[0]!.attributes.get("move.to")).toBe("active");
      expect(r.spans[0]!.attributes.get("answer.allowance")).toBe("alw_7");
    });

    it("an outcome the move doesn't declare dies, and the span says what was asked", async () => {
      const r = recording();
      const s = Handlers.serve({ name: "allowance.grant", operation: moving, handler: insertAndMove("paused") });
      const exit = await Effect.runPromiseExit(Effect.provide(s.call({ member: "per_olga", limit: "5" }, ada), r.layer));
      expect(Exit.isFailure(exit) && Cause.hasDies(exit.cause)).toBe(true);
      expect(r.spans[0]!.attributes.get("move.to")).toBe("paused");
      expect(String(r.spans[0]!.attributes.get("defect"))).toContain("moved to paused");
      expect(r.journal.entries).toEqual([]);
    });

    it("a refusal is written on the span", async () => {
      const r = recording();
      await Effect.runPromiseExit(Effect.provide(served.call({ member: "per_olga", limit: "5000" }, ada), r.layer));
      expect(r.spans[0]!.attributes.get("refusal")).toBe("AllowanceLimitTooHigh");
    });
  });
});
