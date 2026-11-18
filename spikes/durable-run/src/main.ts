import assert from "node:assert/strict";
import { once } from "node:events";
import { readFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { builtinModules, SourceMap } from "node:module";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { build } from "esbuild";
import { convertV4MiniflareOptions, Miniflare } from "miniflare";
import { Effect } from "effect";
import { layer as signup, sheet } from "../../../examples/signup/generated/sdk/src/index.ts";

const here = (relative: string) => fileURLToPath(new URL(relative, import.meta.url));
const compat = { compatibilityDate: "2026-11-01", compatibilityFlags: ["nodejs_compat"] };
const runCompat = process.argv.includes("--no-node-compat") ? { ...compat, compatibilityFlags: [] } : compat;
const expires = AbortSignal.timeout(40_000);

function deadline<T>(work: Promise<T>) {
  return Promise.race([work, once(expires, "abort").then(() => { throw new Error("Spike deadline"); })]);
}

async function bundle(entry: string, instrument = false) {
  const result = await build({
    entryPoints: [here(entry)], outfile: "worker.js",
    bundle: true, write: false, metafile: true, platform: "browser", format: "esm",
    conditions: ["workerd", "worker", "browser"],
    external: ["cloudflare:*", "node:*", ...builtinModules],
    minify: true, sourcemap: instrument ? "external" : false,
  });
  const js = result.outputFiles.find((file) => file.path.endsWith(".js"))!;
  const map = result.outputFiles.find((file) => file.path.endsWith(".map"));
  return { js, map: map && new SourceMap(JSON.parse(map.text)), meta: result.metafile };
}

type Case = {
  mode: "baseline" | "tool-cut" | "model-cut";
  sheet: string;
  models: string[];
  joins: Array<{ key: string | undefined; status: number; body: string }>;
  interrupted: ReturnType<typeof Promise.withResolvers<void>>;
  resumed: ReturnType<typeof Promise.withResolvers<void>>;
  timerFired: ReturnType<typeof Promise.withResolvers<void>>;
  release: ReturnType<typeof Promise.withResolvers<void>>;
};

async function text(req: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

async function serve(req: IncomingMessage, res: ServerResponse, sample: Case, signupUrl: URL) {
  const path = req.url!;
  const input = await text(req);
  assert.equal(req.headers.authorization, undefined);
  if (path.endsWith("/timer-fired")) {
    sample.timerFired.resolve();
    res.writeHead(204).end();
    return;
  }
  if (path.endsWith("/chat/completions")) {
    const { messages, tools, stream, model } = JSON.parse(input);
    assert.equal(model, "scripted");
    assert.equal(stream, true);
    assert.deepEqual(tools.map((t: { function: { name: string } }) => t.function.name), ["sheet_join"]);
    const followedTool = messages.at(-1)?.role === "tool";
    if (followedTool) assert.match(messages.at(-1).content, /Places left: 3/);
    sample.models.push(followedTool ? "after-tool" : "choose-tool");
    if (sample.mode === "model-cut" && sample.models.length === 1) {
      sample.interrupted.resolve();
      await sample.release.promise;
      res.destroy();
      return;
    }
    if (sample.mode === "model-cut" && sample.models.length === 2) sample.resumed.resolve();
    const delta = followedTool
      ? { content: "Joined once." }
      : { tool_calls: [{ index: 0, id: "call_join", type: "function",
          function: { name: "sheet_join", arguments: JSON.stringify({ sheet: sample.sheet }) } }] };
    const chunk = (delta: object, finish_reason: string | null) => JSON.stringify({
      id: "chatcmpl-local", object: "chat.completion.chunk", created: 1, model: "scripted",
      choices: [{ index: 0, delta, finish_reason }],
    });
    res.writeHead(200, { "content-type": "text/event-stream" });
    res.write(`data: ${chunk({ role: "assistant", ...delta }, null)}\n\n`);
    if (sample.mode === "baseline" && followedTool) await deadline(sample.timerFired.promise);
    res.end(`data: ${chunk({}, followedTool ? "stop" : "tool_calls")}\n\ndata: [DONE]\n\n`);
    return;
  }
  assert.ok(path.endsWith("/sheet/join"), path);
  const key = req.headers["idempotency-key"];
  assert.equal(typeof key, "string");
  const answer = await fetch(new URL("/sheet/join", signupUrl), {
    method: "POST", headers: { "content-type": "application/json", "idempotency-key": key }, body: input,
  });
  const body = await answer.text();
  sample.joins.push({ key, status: answer.status, body });
  assert.equal(answer.status, 200, body);
  if (sample.mode === "tool-cut" && sample.joins.length === 1) {
    sample.interrupted.resolve();
    await sample.release.promise;
    res.destroy();
    return;
  }
  if (sample.mode === "tool-cut" && sample.joins.length === 2) sample.resumed.resolve();
  res.writeHead(answer.status, { "content-type": "application/json" }).end(body);
}

function locateSites(map: SourceMap, counts: Record<string, number>) {
  const sites: Record<string, number> = {};
  for (const [site, n] of Object.entries(counts)) {
    const match = site.match(/:(\d+):(\d+)\)?$/);
    const origin = match && map.findEntry(Number(match[1]) - 1, Number(match[2]) - 1);
    const source = origin && "originalSource" in origin
      ? `${origin.originalSource?.split("/node_modules/").at(-1)}:${origin.originalLine + 1}`
      : site;
    const label = `${site.split(" ", 1)[0]} ${source}`;
    sites[label] = (sites[label] ?? 0) + n;
  }
  return sites;
}

await Effect.runPromise(Effect.tryPromise(async () => {
  const [app, runner] = await Promise.all([
    bundle("../../../examples/signup/generated/server/main.ts"),
    bundle("../worker/src/main.ts", true),
  ]);
  const output = runner.meta.outputs["worker.js"]!;
  const inputs = Object.entries(output.inputs);
  console.log("Bundle", JSON.stringify({
    minifiedBytes: runner.js.contents.length,
    gzipBytes: gzipSync(runner.js.contents).length,
    piBytes: inputs.filter(([name]) => name.includes("/@earendil-works/")).reduce((n, [, file]) => n + file.bytesInOutput, 0),
    inputModules: inputs.length,
    imports: output.imports,
    nodeImporters: Object.entries(runner.meta.inputs).flatMap(([source, input]) =>
      input.imports.filter(({ path, external }) => external && path.startsWith("node:"))
        .map(({ path }) => [source.split("/node_modules/").at(-1), path])),
    runCompatibilityFlags: runCompat.compatibilityFlags,
  }));

  const signupWorker = new Miniflare(convertV4MiniflareOptions({ ...compat, host: "127.0.0.1", port: 0, modules: true, script: app.js.text,
    d1Databases: { DB: "signup" }, durableObjects: { WORLD: { className: "World", useSQLite: true } },
  }));
  const samples = new Map<string, Case>();
  let runWorker: Miniflare | undefined;
  let signupUrl: URL;
  const server = createServer((req, res) => {
    const sample = samples.get(req.url?.split("/")[1] ?? "");
    if (!sample) { res.writeHead(404).end(); return; }
    void serve(req, res, sample, signupUrl).catch((error) => {
      console.error(error);
      res.writeHead(500).end(String(error));
    });
  });
  try {
    signupUrl = await signupWorker.ready;
    const db = await signupWorker.getD1Database("DB");
    const migration = await readFile(here("../../../examples/signup/generated/server/migrations/0001_things.sql"), "utf8");
    await db.batch(migration.replace(/^--.*$/gm, "").split(";").filter((sql) => sql.trim()).map((sql) => db.prepare(sql)));
    const client = signup(signupUrl.origin);
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    runWorker = new Miniflare(convertV4MiniflareOptions({ ...runCompat, host: "127.0.0.1", port: 0, modules: true, script: runner.js.text,
      durableObjects: { RUN: { className: "Run", useSQLite: true } },
      bindings: { STAND: `http://127.0.0.1:${address.port}` },
    }));
    const runUrl = await runWorker.ready;
    const keys = new Set<string>();
    for (const mode of ["baseline", "tool-cut", "model-cut"] as const) {
      const { sheet: id } = await Effect.runPromise(sheet.open({ title: "Durable run spike", places: 4n }).pipe(Effect.provide(client)));
      const sample: Case = { mode, sheet: id, models: [], joins: [], interrupted: Promise.withResolvers(),
        resumed: Promise.withResolvers(), timerFired: Promise.withResolvers(), release: Promise.withResolvers() };
      samples.set(mode, sample);
      const call = (action: string) => fetch(new URL(`/${mode}/${action}`, runUrl), { signal: expires });
      const start = await call("start");
      assert.equal(start.status, 200, await start.clone().text());
      const initial = await start.json();
      let committedBeforeAbort: number | undefined;
      let beforeAbort: { timeCalls: Record<string, number> } | undefined;
      if (mode !== "baseline") {
        await deadline(sample.interrupted.promise);
        assert.deepEqual(sample.models, ["choose-tool"]);
        if (mode === "tool-cut") {
          assert.equal(sample.joins.length, 1);
          committedBeforeAbort = (await db.prepare("SELECT version FROM sheet WHERE id = ?").bind(id).first<{ version: number }>())?.version;
          assert.equal(committedBeforeAbort, 1);
        } else assert.equal(sample.joins.length, 0);
        beforeAbort = await (await call("probe")).json();
        assert.equal((await call("abort")).status, 500);
        sample.release.resolve();
        // Only an alarm can wake the object between abort and the next observed HTTP call.
        await deadline(sample.resumed.promise);
      }
      const reply = await call("wait");
      assert.equal(reply.status, 200, await reply.clone().text());
      const ended = await reply.json();
      assert.equal(ended.id, initial.id);
      assert.equal(ended.settled.status, "done", JSON.stringify(ended));
      assert.match(JSON.stringify(ended.entries), /Joined once\./);
      if (mode !== "baseline") {
        assert.notEqual(ended.instance, initial.instance);
        assert.ok(ended.alarmEntries > 0);
      }
      const user = ended.entries.find((entry: { kind: string }) => entry.kind === "pi.user");
      assert.ok(user.model[0].timestamp > Date.now() + 86_390_000);
      assert.ok(Math.abs(initial.clock - user.model[0].timestamp) < 10_000);
      assert.ok(ended.clockReads > 0);
      if (mode === "baseline") assert.ok(ended.timerFires > 0);
      const chosen = mode === "model-cut" ? ["choose-tool", "choose-tool", "after-tool"] : ["choose-tool", "after-tool"];
      assert.deepEqual(sample.models, chosen);
      assert.equal(sample.joins.length, mode === "tool-cut" ? 2 : 1);
      assert.deepEqual(sample.joins[0], sample.joins.at(-1));
      const key = sample.joins[0]!.key!;
      assert.match(key, /:call_join$/);
      assert.ok(!keys.has(key), "A provider tool ID can repeat across different runs");
      keys.add(key);
      const row = await db.prepare("SELECT version, taken FROM sheet WHERE id = ?").bind(id).first();
      assert.deepEqual(row, { version: 1, taken: "1" });
      const requests = await db.prepare("SELECT count(*) AS n FROM _requests WHERE substr(key, -length(?)) = ?").bind(key, key).first("n");
      assert.equal(requests, 1);
      console.log(mode, JSON.stringify({
        modelCalls: sample.models, toolAttempts: sample.joins.length, committedBeforeAbort, commits: row.version,
        dedupeRows: requests, instanceChanged: ended.instance !== initial.instance, recoveryAlarms: ended.alarmEntries,
        clockReads: ended.clockReads, timerArms: ended.timerArms, timerFires: ended.timerFires,
        ambientTime: locateSites(runner.map!, ended.timeCalls),
        ambientTimeBeforeAbort: beforeAbort && locateSites(runner.map!, beforeAbort.timeCalls),
      }));
    }
  } finally {
    for (const sample of samples.values()) sample.release.resolve();
    server.close();
    server.closeAllConnections();
    await Promise.all([runWorker?.dispose(), signupWorker.dispose()]);
  }
}));
