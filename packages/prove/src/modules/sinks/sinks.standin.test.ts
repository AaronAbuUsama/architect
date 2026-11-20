// The sink, end to end, with a stand-in for Axiom on this machine (never Axiom): an environment names a second sink by
// config alone, acme's prove runs on real workerd, and the stand-in receives the spans and logs with the token and the
// dataset on each, while the token appears in no file the run left.
import { createServer } from "node:http";
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";
import { Effect } from "effect";
import { afterAll, describe, expect, it } from "vitest";
import { Prove } from "#modules/prove/service.js";

const visible = (from: string) => !basename(from).startsWith(".");
const acme = resolve(import.meta.dirname, "../../../../../examples/acme");
const scratch = join(acme, "tmp/sinks-standin");
// Node caches a module by its path, so each test has a copy of its own.
const TOKEN = "standin-token-not-a-real-one";

const copy = (name: string, sinks: string): string => {
  const root = join(scratch, name, "acme");
  rmSync(join(scratch, name), { recursive: true, force: true });
  mkdirSync(root, { recursive: true });
  for (const part of ["blueprint", "generated", "src", "journeys", "package.json"]) cpSync(join(acme, part), join(root, part), { recursive: true, filter: visible });
  writeFileSync(join(root, "tsconfig.json"), JSON.stringify({ extends: relative(root, join(acme, "tsconfig.json")) }));
  const file = join(root, "blueprint/environments/local.ts");
  writeFileSync(file, readFileSync(file, "utf8").replace("[Telemetry.sink.local()]", sinks));
  return root;
};

const files = (dir: string): ReadonlyArray<string> =>
  readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? files(join(dir, n)) : [join(dir, n)]));

/** A server that keeps every request it is sent. */
const standIn = () =>
  new Promise<{ port: number; seen: Array<{ url: string; headers: Record<string, string | string[] | undefined>; body: string }>; close: () => void }>((done) => {
    const seen: Array<{ url: string; headers: Record<string, string | string[] | undefined>; body: string }> = [];
    const server = createServer((req, res) => {
      const chunks: Array<Buffer> = [];
      req.on("data", (c: Buffer) => chunks.push(c));
      req.on("end", () => {
        seen.push({ url: req.url ?? "", headers: req.headers, body: Buffer.concat(chunks).toString("utf8") });
        res.setHeader("content-type", "application/json").end("{}");
      });
    });
    server.listen(0, "127.0.0.1", () => done({ port: (server.address() as { port: number }).port, seen, close: () => server.close() }));
  });

describe("a second sink, by config alone, against a stand-in", () => {
  afterAll(() => rmSync(scratch, { recursive: true, force: true }));

  it("receives acme's spans and logs with the token and dataset, tags every span with the environment, and leaves the token in no file", { timeout: 240_000 }, async () => {
    const edge = await standIn();
    try {
      const root = copy("sends", '[Telemetry.sink.local(), Telemetry.sink.axiom({ group: "capxul-test" })]');
      const env = { AXIOM_TOKEN: TOKEN, AXIOM_DOMAIN: `http://127.0.0.1:${edge.port}` };
      const report = await Effect.runPromise(Effect.scoped(Prove.run({ root, port: 0, env })));
      expect(report.passed).toBe(true);
      expect(report.lines.filter((l) => l.startsWith("axiom "))).toEqual([]);

      const traces = edge.seen.filter((s) => s.url === "/v1/traces");
      const logs = edge.seen.filter((s) => s.url === "/v1/logs");
      expect(traces.length).toBeGreaterThan(0);
      expect(logs.length).toBeGreaterThan(0);
      for (const s of traces) expect([s.headers["authorization"], s.headers["x-axiom-dataset"]]).toEqual([`Bearer ${TOKEN}`, "capxul-test-traces"]);
      for (const s of logs) expect([s.headers["authorization"], s.headers["x-axiom-dataset"]]).toEqual([`Bearer ${TOKEN}`, "capxul-test-logs"]);
      const spans = traces.flatMap((s) => JSON.parse(s.body).resourceSpans.flatMap((rs: any) => rs.scopeSpans.flatMap((ss: any) => ss.spans.map((sp: any) => ({ rs, sp })))));
      expect(spans.some(({ sp }: any) => sp.name === "allowance.grant")).toBe(true);
      expect(spans.some(({ sp }: any) => sp.name === "allowance.grant.insert")).toBe(true);
      // Every span is on a resource that names the environment.
      expect(spans.every(({ rs }: any) => rs.resource.attributes.some((a: any) => a.key === "deployment.environment" && a.value.stringValue === "local"))).toBe(true);
      // Nothing secret-looking went out as an attribute key (L2.P's allowlist), and prove's own span stays local.
      const keys = spans.flatMap(({ sp }: any) => sp.attributes.map((a: any) => a.key as string));
      // `answer.apiKey` is the api key's public id (`key_…`), named like a secret; the secret itself, `answer.key`, is not sent.
      const apiKeys = spans.flatMap(({ sp }: any) => sp.attributes.filter((a: any) => a.key === "answer.apiKey").map((a: any) => a.value.stringValue as string));
      expect(apiKeys.every((v: string) => v.startsWith("key_"))).toBe(true);
      expect(keys.filter((k: string) => /password|token|session|apikey/i.test(k) && k !== "answer.apiKey")).toEqual([]);
      expect(keys).not.toContain("answer.key");
      expect(spans.some(({ sp }: any) => String(sp.name).startsWith("journey."))).toBe(false);

      // The token was read from the environment and handed to the world's process: no file of the run holds it.
      const holders = files(scratch).filter((f) => !f.endsWith(".sqlite") && !f.endsWith(".sqlite-wal") && readFileSync(f).includes(TOKEN));
      expect(holders).toEqual([]);
    } finally {
      edge.close();
    }
  });

  it("skips a sink with no token, with one line, and the run still proves", { timeout: 240_000 }, async () => {
    const root = copy("skips", '[Telemetry.sink.local(), Telemetry.sink.axiom({ group: "no-such-group" })]');
    const report = await Effect.runPromise(Effect.scoped(Prove.run({ root, port: 0, env: { AXIOM_DOMAIN: "http://127.0.0.1:9" } })));
    expect(report.passed).toBe(true);
    expect(report.lines[0]).toBe("axiom no-such-group: skipped, no token (AXIOM_TOKEN, or the keychain item no-such-ingest-group)");
    expect(report.lines.filter((l) => l.startsWith("axiom "))).toHaveLength(1);
  });
});
