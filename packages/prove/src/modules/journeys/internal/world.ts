// Talking to a local world over HTTP: cast people, call operations with a trace prefixed by the caller, read facts.
import { randomBytes } from "node:crypto";
import { request } from "node:http";
import { Effect, Layer, Option, Schema } from "effect";
import type { Operation, Read, Principal, Thing } from "@architect/blueprint";
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

/** The world signs `names` up for real; `anonymous` only get an email and a password. */
export const castPeople = (url: string, names: ReadonlyArray<string>, anonymous: ReadonlyArray<string> = []) =>
  fetchJson(`${url}/_world/cast`, { method: "POST", body: JSON.stringify({ names, anonymous }) }).pipe(
    Effect.map((r) => r.body as Record<string, { readonly person?: string; readonly token?: string; readonly email: string; readonly password: string }>),
  );

/**
 * A POST from something that is not a browser. Node's `fetch` adds `Sec-Fetch-*` headers, which Better Auth reads as a
 * browser's first login and so demands an `Origin` for; `node:http` sends none, as `curl` doesn't.
 */
const postJson = (url: string, body: object) =>
  Effect.callback<{ readonly status: number; readonly body: unknown }>((resume) => {
    const text = JSON.stringify(body);
    const req = request(url, { method: "POST", headers: { "content-type": "application/json", "content-length": Buffer.byteLength(text) } }, (res) => {
      let received = "";
      res.on("data", (chunk: Buffer) => (received += chunk.toString()));
      res.on("end", () => resume(Effect.succeed({ status: res.statusCode ?? 0, body: Option.getOrElse(parse(received), () => received) as unknown })));
    });
    req.on("error", () => resume(Effect.succeed({ status: 0, body: null })));
    req.end(text);
  });

const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";
const random = (n: number) => Array.from(randomBytes(n), (b) => ALPHABET[b % 36]).join("");

/**
 * A real environment has no `/_world/cast`: its people sign up and sign in through Better Auth's own routes, with an email
 * and password of their own (never `@world.test`'s fixed ones: a person made here stays in the environment). `anonymous`
 * only get credentials, so a script can sign them up itself. A refusal is the problem as text.
 */
export const signUpPeople = (url: string, names: ReadonlyArray<string>, anonymous: ReadonlyArray<string> = []) =>
  Effect.gen(function* () {
    const cast: Record<string, { person?: string; token?: string; email: string; password: string }> = {};
    for (const name of [...names, ...anonymous]) {
      const member = { email: `${name}.${random(8)}@staging.test`, password: random(24) };
      if (anonymous.includes(name)) {
        cast[name] = member;
        continue;
      }
      const post = (route: string, body: object) => postJson(`${url}/api/auth/${route}`, body);
      const up = yield* post("sign-up/email", { ...member, name });
      const person = (up.body as { user?: { id?: unknown } } | null)?.user?.id;
      if (up.status !== 200 || typeof person !== "string") return yield* Effect.fail(`signing ${name} up answered ${up.status}`);
      const inn = yield* post("sign-in/email", member);
      const token = (inn.body as { token?: unknown } | null)?.token;
      if (inn.status !== 200 || typeof token !== "string") return yield* Effect.fail(`signing ${name} in answered ${inn.status}`);
      cast[name] = { person, token, ...member };
    }
    return cast;
  });

/** Encode the payload by its declaration, call the route, and record what came back. */
export const callOperation = (url: string, name: string, op: Operation | Read, payload: Record<string, unknown>, token: string, request: string | undefined) =>
  Effect.gen(function* () {
    const wire = yield* Schema.encodeUnknownEffect(op.payloadSchema as unknown as Codec)(payload).pipe(Effect.orElseSucceed(() => payload));
    const trace = randomBytes(16).toString("hex");
    const parent = randomBytes(8).toString("hex");
    const [thing, verb] = name.split(".");
    const r = yield* fetchJson(`${url}/${thing}/${verb}`, {
      method: "POST",
      headers: {
        "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}), traceparent: `00-${trace}-${parent}-01`,
        ...(request === undefined ? {} : { "idempotency-key": request }),
      },
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
    update: () => Effect.die(new Error("prove reads the world; it never writes to it")),
  }));

/** Whether the declaration's `allowed` lets this caller make this call, judged on the world's facts. */
export const mayCall = (url: string, tableOf: (thing: Thing) => string | undefined, op: Operation | Read, payload: object, principal: Principal) =>
  Access.check({ allowed: op.allowed, payloadFields: op.payload, payload, principal, thing: op.thing }).pipe(
    Effect.as(true),
    Effect.catchTag("NotAllowed", () => Effect.succeed(false)),
    Effect.provide(factsRecords(url, tableOf)),
  );

export const stateOf = (url: string, table: string, id: string) =>
  fetchJson(`${url}/_world/facts/record?table=${table}&id=${encodeURIComponent(id)}`).pipe(
    Effect.map((r) => (r.body as { state?: unknown } | null)?.state),
  );
