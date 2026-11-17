// L2.P: a span's attributes come from an allowlist built from `visibility`. Only a public field's value is one.
import { Effect, Layer, Tracer } from "effect";
import { describe, expect, it } from "vitest";
import { Blueprint } from "@formants/forman";
import { EventNames } from "@formants/forman/server";
import { BusyLive } from "#modules/work/service.js";
import { storeMemory } from "#modules/records/service.js";
import { Records } from "#modules/records/types.js";
import { Handlers } from "../service.ts";
import type { Handler } from "../types.ts";

/** The in-memory exporter: every span the runtime opens, kept for the test to read. */
const recording = () => {
  const spans: Array<Tracer.NativeSpan> = [];
  const tracer = Tracer.make({ span: (options) => { const s = new Tracer.NativeSpan(options); spans.push(s); return s; } });
  const store = storeMemory();
  return { spans, store, layer: Layer.mergeAll(BusyLive, store.layer, Layer.succeed(Tracer.Tracer, tracer)) };
};

const Org = Blueprint.thing({ description: "Who may see a pin.", fields: { id: Blueprint.id("org") } });
const owner = Blueprint.role(Org, { rule: () => true });
const Account = Blueprint.thing({
  description: "Someone's login.",
  fields: { id: Blueprint.id("acc"), name: Blueprint.text(), pin: Blueprint.visibility.private(Blueprint.text(), owner) },
});
const Password = Blueprint.visibility.secret(Blueprint.text());
const Moved = Blueprint.event({ account: Account.fields.id, pin: Account.fields.pin, name: Account.fields.name });
EventNames.name(Moved, "Moved");
const machine = Blueprint.machine(Account, { states: ["open"], moves: { open: { from: [], to: "open", emits: Moved } }, notFrom: { exit: 40 } });
const signIn = Blueprint.operation(Account, {
  description: "Sign in.",
  payload: { name: Account.fields.name, password: Password, pin: Account.fields.pin },
  answer: { account: Blueprint.visibility.secret(Account.fields.id), token: Password, name: Account.fields.name },
  move: machine.moves.open,
  allowed: [Blueprint.anyone],
});
const handler: Handler<typeof signIn, Records> = (payload, { move }) =>
  Effect.gen(function* () {
    yield* (yield* Records).insert(Account, { id: "acc_1" as never, name: payload.name, pin: payload.pin });
    yield* move();
    return { account: "acc_1" as never, token: "tok-secret-9999", name: payload.name };
  });
const payload = { name: "Ada", password: "hunter2-hunter2", pin: "pin-4321" };
const caller = { kind: "anonymous" } as const;

const call = async (h: Handler<typeof signIn, Records> = handler) => {
  const r = recording();
  await Effect.runPromiseExit(Handlers.serve({ name: "account.sign-in", operation: signIn, handler: h }).call(payload, caller).pipe(Effect.provide(r.layer)));
  return r;
};

describe("span attributes are an allowlist of public fields", () => {
  it("writes only public fields: no secret, no private, in the payload or the answer", async () => {
    const { spans } = await call();
    const attributes = Object.fromEntries(spans.find((s) => s.name === "account.sign-in")!.attributes);
    expect(attributes).toMatchObject({ "payload.name": "Ada", "answer.name": "Ada" });
    for (const k of ["payload.password", "payload.pin", "answer.account", "answer.token"]) expect(attributes, k).not.toHaveProperty(k);
    // Not in any span, under any key.
    const everything = JSON.stringify(spans.map((s) => [...s.attributes]));
    for (const v of ["hunter2-hunter2", "pin-4321", "tok-secret-9999", "acc_1"]) expect(everything, v).not.toContain(v);
  });

  it("journals an event's public fields only", async () => {
    const { store } = await call();
    expect(store.entries).toEqual([expect.objectContaining({ event: "Moved", fields: { account: "acc_1", name: "Ada" } })]);
  });

  it("a field the declaration doesn't name is not an attribute either: it fails closed", async () => {
    const { spans } = await call((p, c) => handler(p, c).pipe(Effect.map((a) => ({ ...a, extra: "undeclared-value" }) as never)));
    expect(JSON.stringify(spans.map((s) => [...s.attributes]))).not.toContain("undeclared-value");
  });
});
