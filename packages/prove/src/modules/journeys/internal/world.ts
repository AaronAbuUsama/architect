// Talking to a local world over HTTP: cast people, call operations with a trace prefixed by the caller, read facts.
import { randomBytes } from "node:crypto";
import { Effect, Layer, Option, Schema } from "effect";
import type { Operation, Principal, Thing } from "@architect/blueprint";
import { structOf } from "@architect/blueprint/server";
import { Access, Records, type Instance } from "@architect/target-effect";
import type { CallRecord } from "../types.ts";

type Codec = Schema.Codec<Record<string, unknown>, Record<string, unknown>>;

const parse = Schema.decodeUnknownOption(Schema.fromJsonString(Schema.Unknown));

/** Any answer, JSON or not: a body that isn't JSON is kept as text. */
const fetchJson = (url: string, init?: RequestInit) =>
  Effect.promise(() =>
    fetch(url, init).then((r) => r.text().then((t) => ({ status: r.status, body: Option.getOrElse(parse(t), () => (t === "" ? null : t)) as unknown }))),
  );

export const castPeople = (url: string, names: ReadonlyArray<string>) =>
  fetchJson(`${url}/_world/cast`, { method: "POST", body: JSON.stringify({ names }) }).pipe(
    Effect.map((r) => r.body as Record<string, { readonly person: string; readonly token: string }>),
  );

/** Encode the payload by its declaration, call the route, and record what came back. */
export const callOperation = (url: string, name: string, op: Operation, payload: Record<string, unknown>, token: string) =>
  Effect.gen(function* () {
    const wire = yield* Schema.encodeUnknownEffect(op.payloadSchema as unknown as Codec)(payload).pipe(Effect.orElseSucceed(() => payload));
    const trace = randomBytes(16).toString("hex");
    const parent = randomBytes(8).toString("hex");
    const [thing, verb] = name.split(".");
    const r = yield* fetchJson(`${url}/${thing}/${verb}`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}`, traceparent: `00-${trace}-${parent}-01` },
      body: JSON.stringify(wire),
    });
    const journal = (yield* fetchJson(`${url}/_world/facts/journal?trace=${trace}`)).body as CallRecord["journal"];
    return { wire, status: r.status, body: r.body, trace, parent, journal };
  });

/** Records read from the world's facts: the same rows the server reads, decoded the same way. */
export const factsRecords = (url: string, tableOf: (thing: Thing) => string | undefined) =>
  Layer.succeed(Records, Records.of({
    find: (thing, id) =>
      Effect.gen(function* () {
        const table = tableOf(thing);
        if (!table) return undefined;
        const row = (yield* fetchJson(`${url}/_world/facts/record?table=${table}&id=${encodeURIComponent(id)}`)).body as Record<string, unknown> | null;
        if (!row) return undefined;
        const fields = yield* Schema.decodeUnknownEffect(structOf(thing.fields) as unknown as Codec)(row).pipe(Effect.orDie);
        return (typeof row["state"] === "string" ? { ...fields, state: row["state"] } : fields) as Instance;
      }),
    insert: () => Effect.die(new Error("prove reads the world; it never writes to it")),
    setState: () => Effect.die(new Error("prove reads the world; it never writes to it")),
  }));

/** Whether the declaration's `allowed` lets this caller make this call, judged on the world's facts. */
export const mayCall = (url: string, tableOf: (thing: Thing) => string | undefined, op: Operation, payload: object, principal: Principal) =>
  Access.check({ allowed: op.allowed, payloadFields: op.payload, payload, principal }).pipe(
    Effect.as(true),
    Effect.catchTag("NotAllowed", () => Effect.succeed(false)),
    Effect.provide(factsRecords(url, tableOf)),
  );

export const stateOf = (url: string, table: string, id: string) =>
  fetchJson(`${url}/_world/facts/record?table=${table}&id=${encodeURIComponent(id)}`).pipe(
    Effect.map((r) => (r.body as { state?: unknown } | null)?.state),
  );
