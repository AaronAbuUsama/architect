// A warm world's record: when it is found, and when it is not (ST1.24). The end-to-end check is e2e/m1/30-st1-24-warm-world.test.ts.
import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync, existsSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect } from "effect";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Warm } from "./service.ts";
import { fingerprint } from "./internal/source.ts";

const root = mkdtempSync(join(tmpdir(), "warm-"));
mkdirSync(join(root, "src"), { recursive: true });
writeFileSync(join(root, "src/handler.ts"), "export {};\n");
let server: Server;
let url = "";

beforeAll(async () => {
  server = createServer((_, response) => response.writeHead(200, { "content-type": "application/json" }).end("{}"));
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  url = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
});
afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
  rmSync(root, { recursive: true, force: true });
});

const record = (over: Partial<{ pid: number; url: string; startedAt: number; sources: string }> = {}) => ({ pid: process.pid, url, collector: "http://127.0.0.1:1", telemetry: join(root, ".ortho/dev-telemetry"), startedAt: Date.now() + 1000, sources: fingerprint(root), ...over });
const published = <A>(r: ReturnType<typeof record>, use: () => Promise<A>) =>
  Effect.runPromise(Effect.scoped(Warm.publish(root, r).pipe(Effect.andThen(Effect.promise(use)))));
const found = () => Effect.runPromise(Warm.find(root));

describe("warm", () => {
  it("finds the record of a live dev whose world answers and whose source is older than it, and removes it when dev stops", async () => {
    const r = record();
    expect(await published(r, found)).toEqual(r);
    expect(existsSync(join(root, ".ortho/dev.json"))).toBe(false);
    expect(await found()).toBeUndefined();
  });

  it("does not find a record whose process is gone, or whose world does not answer", async () => {
    expect(await published(record({ pid: 2 ** 22 + 1 }), found)).toBeUndefined();
    expect(await published(record({ url: "http://127.0.0.1:1" }), found)).toBeUndefined();
  });

  it("does not find a record once the source changed after dev began: the world may not have reloaded it", async () => {
    const later = new Date(Date.now() + 60_000);
    utimesSync(join(root, "src/handler.ts"), later, later);
    expect(await published(record(), found)).toBeUndefined();
  });

  it("does not find a record once a source file was added or deleted after dev began, though no file is newer (a rename is both)", async () => {
    const past = new Date(Date.now() - 60_000);
    const helper = join(root, "src/helper.ts");
    utimesSync(join(root, "src/handler.ts"), past, past);
    const before = record();
    expect(await published(before, found), "nothing changed").toEqual(before);
    writeFileSync(helper, "export const helper = 1;\n");
    utimesSync(helper, past, past);
    expect(await published(before, found), "an added file").toBeUndefined();
    const withHelper = record();
    expect(await published(withHelper, found), "the helper was there when dev began").toEqual(withHelper);
    rmSync(helper);
    expect(await published(withHelper, found), "a deleted file").toBeUndefined();
  });

  it("empties the collector's folder when it resets", async () => {
    const telemetry = join(root, ".ortho/dev-telemetry");
    mkdirSync(telemetry, { recursive: true });
    writeFileSync(join(telemetry, "traces.jsonl"), "{}\n");
    // The world's door is not there to answer (the Worker's own test covers it), so the reset fails, after the folder is emptied.
    const result = await Effect.runPromise(Effect.result(Warm.reset(record({ url: "http://127.0.0.1:1" }))));
    expect(result._tag).toBe("Failure");
    expect(existsSync(join(telemetry, "traces.jsonl"))).toBe(false);
  });
});
