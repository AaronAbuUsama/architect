import { Cause, Deferred, Effect, Exit, Fiber, Layer, Ref } from "effect";
import { describe, expect, it } from "vitest";
import { Blueprint } from "orthograph";
import { EventNames } from "orthograph/server";
import { BusyLive } from "#modules/work/service.js";
import { Handlers, Reads } from "#modules/handler/service.js";
import type { Handler } from "#modules/handler/types.js";
import { storeMemory } from "./service.ts";
import { Records } from "./types.ts";

const Amount = Blueprint.value(Blueprint.uint(128));
const Person = Blueprint.thing({ description: "Someone.", fields: { id: Blueprint.id("per") } });
const Purse = Blueprint.thing({ description: "Money.", fields: { id: Blueprint.id("pur"), member: Person.fields.id, spent: Amount } });
const Spent = Blueprint.event({ purse: Purse.fields.id, amount: Amount });
EventNames.name(Spent, "Spent");
const Opened = Blueprint.event({ purse: Purse.fields.id });
const machine = Blueprint.machine(Purse, {
  states: ["active"],
  moves: { open: { from: [], to: "active", emits: Opened }, spend: { from: ["active"], to: "active", emits: Spent } },
  notFrom: { exit: 40 },
});
const holder = Blueprint.role(Purse, { rule: (p, who) => p.member === who.person });
const spend = Blueprint.operation(Purse, {
  description: "Spend.", payload: { purse: Purse.fields.id, amount: Amount }, answer: { spent: Amount },
  move: machine.moves.spend, allowed: [holder], idempotent: "request",
});
const get = Blueprint.read(Purse, { by: "id", fields: ["member", "spent", "state"], allowed: [holder] });
const spender: Handler<typeof spend, Records> = ({ purse, amount }, { move }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    const spent = ((yield* records.find(Purse, purse))!["spent"] as bigint) + amount;
    yield* records.update(Purse, purse, { spent });
    yield* move();
    return { spent };
  });
const olga = { kind: "person", person: "per_olga" } as const;
const bob = { kind: "person", person: "per_bob" } as const;
const world = () => storeMemory([[Purse, { id: "pur_1", member: "per_olga", spent: 0n, state: "active" }]]);
const served = Handlers.serve({ name: "purse.spend", operation: spend, handler: spender, notFrom: "PurseNotActive" });

describe("a request key", () => {
  it("the same key twice is one call: the same answer, one event, spent once", async () => {
    const memory = world();
    const [a, b] = await Effect.runPromise(Effect.all([
      served.run({ purse: "pur_1" as never, amount: 100n }, olga, "coffee-1"),
      served.run({ purse: "pur_1" as never, amount: 100n }, olga, "coffee-1"),
    ], { concurrency: "unbounded" }).pipe(Effect.provide(Layer.mergeAll(BusyLive, memory.layer))));
    expect([a, b]).toEqual([{ spent: 100n }, { spent: 100n }]);
    expect(memory.rows[0]!.instance["spent"]).toBe(100n);
    expect(memory.entries).toHaveLength(1);
  });

  it("returns the saved answer if a same-key attempt sees the other call's write and refuses", () => {
    class AlreadySpent extends Blueprint.error({}, { exit: 3 }) {}
    const spendOnce = Blueprint.operation(Purse, {
      description: "Spend from this purse once.",
      payload: spend.payload,
      answer: spend.answer,
      errors: [AlreadySpent],
      allowed: [Blueprint.signedIn],
      idempotent: "request",
    });
    const memory = world();
    return Effect.runPromise(Effect.gen(function* () {
      const beforeRead = yield* Deferred.make<void>();
      const committed = yield* Deferred.make<void>();
      const firstAttempt = yield* Ref.make(true);
      const handler: Handler<typeof spendOnce, Records> = ({ purse, amount }) =>
        Effect.gen(function* () {
          // By the time the first attempt reaches its handler, its request lookup has missed.
          if (yield* Ref.getAndSet(firstAttempt, false)) {
            yield* Deferred.succeed(beforeRead, undefined);
            yield* Deferred.await(committed);
          }
          const records = yield* Records;
          const row = yield* records.find(Purse, purse);
          if (row?.["spent"] !== 0n) return yield* new AlreadySpent({});
          yield* records.update(Purse, purse, { spent: amount });
          return { spent: amount };
        });
      const call = Handlers.serve({ name: "purse.spend-once", operation: spendOnce, handler })
        .run({ purse: "pur_1" as never, amount: 100n }, olga, "one-spend");
      const delayed = yield* Effect.forkChild(call);
      yield* Deferred.await(beforeRead);
      const winner = yield* call;
      yield* Deferred.succeed(committed, undefined);
      const replay = yield* Effect.exit(Fiber.join(delayed));

      expect(winner).toEqual({ spent: 100n });
      expect(replay).toEqual(Exit.succeed(winner));
      expect(memory.rows[0]).toMatchObject({ version: 1, instance: { spent: 100n } });
    }).pipe(Effect.provide(Layer.mergeAll(BusyLive, memory.layer))));
  });

  it("another key, or no key, is another call", async () => {
    const memory = world();
    await Effect.runPromise(Effect.all([
      served.run({ purse: "pur_1" as never, amount: 100n }, olga, "a"),
      served.run({ purse: "pur_1" as never, amount: 100n }, olga, "b"),
      served.run({ purse: "pur_1" as never, amount: 100n }, olga),
    ]).pipe(Effect.provide(Layer.mergeAll(BusyLive, memory.layer))));
    expect(memory.rows[0]!.instance["spent"]).toBe(300n);
  });
});

describe("a read", () => {
  const read = Reads.serve({ name: "purse.get", read: get });
  it("answers the fields it names, with the state, to someone its role allows", async () => {
    const answer = await Effect.runPromise(read.run({ id: "pur_1" }, olga).pipe(Effect.provide(world().layer)));
    expect(answer).toEqual({ member: "per_olga", spent: 0n, state: "active" });
  });
  it("refuses someone else, and refuses a missing id the same way", async () => {
    for (const [who, id] of [[bob, "pur_1"], [olga, "pur_9"]] as const) {
      const exit = await Effect.runPromiseExit(read.run({ id }, who).pipe(Effect.provide(world().layer)));
      expect(Exit.isFailure(exit) && Cause.squash(exit.cause)).toMatchObject({ _tag: "NotAllowed" });
    }
  });
});
