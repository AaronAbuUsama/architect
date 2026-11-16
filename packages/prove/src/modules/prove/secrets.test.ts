// L2.P: no secret is ever a span attribute, a log line or a journal entry. Checked on the real thing: acme's journeys on a
// real world (workerd, D1, the generated server) with a real OpenTelemetry Collector, reading the Collector's own files.
// Ports 9100 and 9101 are this file's.
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";
import { Effect } from "effect";
import { afterAll, describe, expect, it } from "vitest";
import { Compiler, nodeSource } from "@architect/compiler";
import { Collectors } from "#modules/telemetry/service.js";
import { Journeys } from "#modules/journeys/service.js";
import { Worlds } from "#modules/world/service.js";
import type { CallRecord } from "#modules/journeys/types.js";
import { Prove } from "./service.ts";

const repo = resolve(import.meta.dirname, "../../../../..");
const acme = resolve(repo, "examples/acme");
const dir = resolve(acme, ".architect/secrets-telemetry");
const PORT = 9100;

const rawOf = (d: string) => ["traces.jsonl", "logs.jsonl"].map((f) => (existsSync(`${d}/${f}`) ? readFileSync(`${d}/${f}`, "utf8") : "")).join("\n");

/** Every secret value these calls carried: the password sent, and the token, key and session answered. */
const secretsOf = (calls: ReadonlyArray<CallRecord>): ReadonlyArray<{ readonly what: string; readonly value: string }> =>
  calls.flatMap((c) => [
    ...(typeof c.payload["password"] === "string" ? [{ what: `${c.operation} password`, value: c.payload["password"] }] : []),
    ...(["token", "key", "session"] as const).flatMap((k) => {
      const v = (c.body as Record<string, unknown> | null)?.[k];
      return c.status === 200 && typeof v === "string" ? [{ what: `${c.operation} answer.${k}`, value: v }] : [];
    }),
  ]);

describe("secrets never reach telemetry (L2.P)", () => {
  it("sign-in and api-key.create leave no password, token, key or session in the Collector's spans or logs", { timeout: 180_000 }, () =>
    Effect.runPromise(Effect.scoped(Effect.gen(function* () {
      const model = yield* Compiler.model.pipe(Effect.provide(nodeSource(acme)), Effect.orDie);
      const project = yield* Journeys.load(acme, model).pipe(Effect.orDie);
      const collector = yield* Collectors.start(dir);
      const { url } = yield* Worlds.start({ root: acme, port: PORT, name: "secrets", otlp: collector.url }).pipe(Effect.orDie);
      const wanted = project.journeys.filter((j) => ["sign up and sign in", "an owner makes an api key"].includes(j.name));
      expect(wanted.length).toBe(2);
      const runs = yield* Effect.forEach(wanted, (j, i) => Journeys.run(project, url, j, i));
      const calls = runs.flatMap((r) => r.calls);
      // A payload the declaration refuses (a password past its 128 characters) is refused before any handler: its value must not
      // be in the refusal's span either, whatever the schema error says.
      const tooLong = `not-a-real-password-${"x".repeat(200)}`;
      const bad = { trace: hex(32, 5), parent: "00000000000000cc" };
      const refused = yield* Effect.promise(() => fetch(`${url}/session/sign-in`, {
        method: "POST", headers: { "content-type": "application/json", traceparent: `00-${bad.trace}-${bad.parent}-01` },
        body: JSON.stringify({ email: "ada@acme.dev", password: tooLong }),
      }));
      expect(refused.status).toBeGreaterThanOrEqual(400);
      yield* collector.traces([...calls.map((c) => ({ trace: c.trace, parent: c.parent })), bad]);

      const secrets = secretsOf(calls);
      // The calls really did carry secrets, so a clean file means something.
      for (const what of ["session.sign-in password", "session.sign-in answer.token", "session.sign-in answer.session", "api-key.create answer.key"]) {
        expect(secrets.some((s) => s.what === what), what).toBe(true);
      }
      const raw = rawOf(dir);
      expect(raw.length).toBeGreaterThan(1000);
      const leaked = [...secrets, { what: "a refused sign-in's password", value: tooLong }].filter((s) => s.value.length >= 8 && raw.includes(s.value)).map((s) => s.what);
      expect(leaked).toEqual([]);
      // And no attribute is even named for a secret field.
      const keys = [...raw.matchAll(/"key":"((?:payload|answer)\.[A-Za-z]+)"/g)].map((m) => m[1]!);
      expect(keys.filter((k) => ["payload.password", "answer.token", "answer.key", "answer.session"].includes(k))).toEqual([]);
      // The journal's entries (every event field the calls journalled) hold no secret either.
      expect(JSON.stringify(calls.flatMap((c) => c.journal))).not.toMatch(/password|token/i);
    }))),
  );
});

/** Every span of every export the Collector wrote, flattened. */
const spansIn = (d: string) =>
  readFileSync(`${d}/traces.jsonl`, "utf8").split("\n").filter((l) => l.trim() !== "").flatMap((l) =>
    (JSON.parse(l).resourceSpans ?? []).flatMap((rs: any) => (rs.scopeSpans ?? []).flatMap((ss: any) => ss.spans ?? []))) as Array<{ name: string; attributes?: Array<{ key: string; value: unknown }> }>;

const hex = (n: number, seed: number) => Array.from({ length: n }, (_, i) => ((i * 7 + seed) % 16).toString(16)).join("");

describe("the Collector's second guard (L2.P)", () => {
  it("deletes the attribute keys it is given from every span and every log, and keeps the rest", { timeout: 60_000 }, () =>
    Effect.runPromise(Effect.scoped(Effect.gen(function* () {
      const guarded = resolve(acme, ".architect/secrets-guard");
      const collector = yield* Collectors.start(guarded, { strip: ["payload.password", "answer.token", "token"] });
      const trace = hex(32, 3);
      const parent = "00000000000000aa";
      const kv = (key: string, v: string) => ({ key, value: { stringValue: v } });
      const span = { traceId: trace, spanId: "00000000000000b1", parentSpanId: parent, name: "session.sign-in", kind: 2, startTimeUnixNano: "1000000000", endTimeUnixNano: "1005000000",
        attributes: [kv("payload.email", "ada@acme.dev"), kv("payload.password", "hunter2-hunter2"), kv("answer.token", "tok-0123456789")] };
      const log = { timeUnixNano: "1002000000", traceId: trace, spanId: "00000000000000b1", body: { stringValue: "signed in" }, attributes: [kv("who", "ada"), kv("token", "tok-0123456789")] };
      const post = (path: string, body: unknown) => Effect.promise(() => fetch(`${collector.url}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }));
      expect((yield* post("/v1/traces", { resourceSpans: [{ resource: { attributes: [] }, scopeSpans: [{ spans: [span] }] }] })).status).toBe(200);
      expect((yield* post("/v1/logs", { resourceLogs: [{ resource: { attributes: [] }, scopeLogs: [{ logRecords: [log] }] }] })).status).toBe(200);
      const got = (yield* collector.traces([{ trace, parent }])).get(trace)!;
      expect(got.spans[0]!.attrs).toEqual({ "payload.email": "ada@acme.dev" });
      expect(got.logs[0]!.attrs).toEqual({ who: "ada" });
      expect(rawOf(guarded)).not.toMatch(/hunter2|tok-0123456789/);
    }))),
  );
});

describe("a field declared private(owner) never appears (L2.P)", () => {
  const visible = (from: string) => !basename(from).startsWith(".");
  const scratch = resolve(acme, "test/tmp/private");

  afterAll(() => rmSync(scratch, { recursive: true, force: true }));

  it("leaves `payload.member` off every span of allowance.grant, and prove still passes", { timeout: 180_000 }, async () => {
    const root = join(scratch, "acme");
    rmSync(scratch, { recursive: true, force: true });
    mkdirSync(root, { recursive: true });
    for (const part of ["blueprint", "generated", "implementation", "journeys", "package.json"]) cpSync(join(acme, part), join(root, part), { recursive: true, filter: visible });
    writeFileSync(join(root, "tsconfig.json"), JSON.stringify({ extends: relative(root, join(acme, "tsconfig.json")) }));
    const grant = join(root, "blueprint/things/allowance/verbs/grant.ts");
    writeFileSync(grant, readFileSync(grant, "utf8").replace("member: Allowance.fields.member,", "member: Blueprint.visibility.private(Allowance.fields.member, owner),"));
    expect(readFileSync(grant, "utf8")).toContain("visibility.private");

    const model = await Effect.runPromise(Compiler.model.pipe(Effect.provide(nodeSource(root)), Effect.orDie));
    expect(model.operations["allowance.grant"]?.payload["member"]?.visibility).toEqual({ private: ["organization.owner"] });

    const report = await Effect.runPromise(Effect.scoped(Prove.run({ root, port: 9101 })));
    expect(report.lines.filter((l) => l.includes("✘"))).toEqual([]);
    expect(report.lines.some((l) => l.startsWith("allowance.grant 9 evals ✔ p50 "))).toBe(true);
    expect(report.passed).toBe(true);

    const grants = spansIn(join(root, ".architect/prove-telemetry")).filter((s) => s.name === "allowance.grant");
    expect(grants.length).toBeGreaterThan(0);
    for (const s of grants) {
      const keys = (s.attributes ?? []).map((a) => a.key);
      expect(keys).toContain("payload.organization");
      expect(keys).toContain("payload.limit");
      expect(keys).not.toContain("payload.member");
    }
  });
});
