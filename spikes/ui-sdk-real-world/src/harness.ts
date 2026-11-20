// What every test stands on: Plugged In's local world (`Worlds.start` with a collector, as `ortho prove` makes it:
// wrangler on real workerd, a fresh D1, a new Better Auth secret), the page served on one origin with every other path
// proxied to the world, and headless Chromium. Each piece is stopped by the test that made it.
import { appendFileSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { createServer, request as forward, type Server } from "node:http";
import { createRequire } from "node:module";
import type { AddressInfo } from "node:net";
import { pathToFileURL } from "node:url";
import { chromium, type Browser } from "playwright";

export const PLUGGED_IN = realpathSync(".plugged-in");
export const GOAL = realpathSync(".goal");

/** A module of the goal checkout, by path, so Effect and `orthograph` are the goal's own copies. */
export const goal = <T,>(path: string): Promise<T> => import(pathToFileURL(`${GOAL}/${path}`).href) as Promise<T>;
/** A package as Plugged In resolves it (Effect, mostly). */
export const fromPluggedIn = <T,>(name: string): Promise<T> =>
  import(pathToFileURL(createRequire(`${PLUGGED_IN}/package.json`).resolve(name)).href) as Promise<T>;

type Trace = { readonly spans: ReadonlyArray<{ readonly name: string; readonly attrs: Readonly<Record<string, unknown>> }> };
export type World = {
  readonly url: string;
  /** The spans of one trace, once the collector has it whole. */
  readonly spans: (hop: Hop) => Promise<Trace["spans"]>;
  readonly stop: () => Promise<void>;
};

/**
 * The world as `ortho prove` makes it: a local OTLP collector, then `Worlds.start` with it. (`ortho dev` makes one with no
 * collector, and there the journal is keyed by a trace the caller never sees, so "nothing was written" can't be read back.)
 */
export const startWorld = async (port: number): Promise<World> => {
  const { Effect, Fiber } = await fromPluggedIn<typeof import("effect")>("effect");
  const prove = await goal<{ Worlds: any; Collectors: any }>("packages/prove/src/index.ts");
  const ready = Promise.withResolvers<{ url: string; collector: any }>();
  const fiber = Effect.runFork(
    Effect.scoped(Effect.gen(function* () {
      const collector = yield* prove.Collectors.local(`${PLUGGED_IN}/.ortho/spike-telemetry`, []);
      const { url } = yield* prove.Worlds.start({ root: PLUGGED_IN, port, name: "spike", otlp: collector.url, environment: "local" });
      ready.resolve({ url, collector });
      return yield* Effect.never;
    })).pipe(Effect.tapCause((cause: unknown) => Effect.sync(() => ready.reject(new Error(String(cause)))))),
  );
  const { url, collector } = await ready.promise;
  return {
    url,
    spans: (hop) =>
      Effect.runPromise(collector.traces([{ trace: hop.trace, parent: hop.parent }])).then((found: ReadonlyMap<string, Trace>) => found.get(hop.trace!)?.spans ?? []),
    stop: () => Effect.runPromise(Fiber.interrupt(fiber)).then(() => undefined),
  };
};

/** Who the world says a cast member is. The token stays in memory: never printed, never written. */
export type Person = { readonly person: string; readonly token: string };
export const cast = async (world: World, ...names: Array<string>): Promise<Record<string, Person>> =>
  (await fetch(`${world.url}/_world/cast`, { method: "POST", body: JSON.stringify({ names }) }).then((r) => r.json())) as Record<string, Person>;

/** What reached the world's door: the request as the server got it, and how long the world took to answer. */
export type Hop = {
  readonly method: string; readonly path: string; readonly source: string | null; readonly status: number; readonly ms: number;
  /** From the `traceparent` the page sent: the trace, and the page's own span, which the server's root span is a child of. */
  readonly trace: string | null; readonly parent: string | null;
};

/** The page and its bundle on one origin; any other path goes to the world, and is recorded as it passes. */
export const serve = async (world: World): Promise<{ readonly url: string; readonly hops: Array<Hop>; readonly close: () => Promise<void> }> => {
  const hops: Array<Hop> = [];
  const files: Record<string, readonly [string, string]> = {
    "/": ["dist/index.html", "text/html"], "/main.js": ["dist/main.js", "text/javascript"], "/main.css": ["dist/main.css", "text/css"],
  };
  const server: Server = createServer((req, res) => {
    const path = (req.url ?? "/").split("?")[0]!;
    const file = files[path];
    if (req.method === "GET" && file) {
      res.writeHead(200, { "content-type": file[1] }).end(readFileSync(file[0]));
      return;
    }
    const started = performance.now();
    const target = new URL(req.url ?? "/", world.url);
    const out = forward(target, { method: req.method, headers: { ...req.headers, host: target.host } }, (answer) => {
      hops.push({
        method: req.method ?? "", path, source: (req.headers["x-ortho-source"] as string | undefined) ?? null, status: answer.statusCode ?? 0,
        ms: Math.round((performance.now() - started) * 10) / 10,
        trace: (answer.headers["x-trace-id"] as string | undefined) ?? null, parent: String(req.headers["traceparent"] ?? "").split("-")[2] ?? null,
      });
      res.writeHead(answer.statusCode ?? 502, answer.headers);
      answer.pipe(res);
    });
    req.pipe(out);
  });
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return { url, hops, close: () => new Promise((done) => { server.closeAllConnections(); server.close(() => done()); }) };
};

export const browser = (): Promise<Browser> => chromium.launch({ headless: true });

/** Evidence: one file per test file, overwritten each run. Tokens never reach it. */
export const evidence = (file: string) => {
  mkdirSync("evidence", { recursive: true });
  writeFileSync(`evidence/${file}`, "");
  return (title: string, value: unknown) =>
    appendFileSync(`evidence/${file}`, `## ${title}\n${typeof value === "string" ? value : JSON.stringify(value, null, 1)}\n\n`);
};
