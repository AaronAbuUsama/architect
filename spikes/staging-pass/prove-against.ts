// Spike code. Can `ortho prove` reach a deployed URL? The CLI has no flag for it (`--env` is local|test), but the library has
// `Prove.against`, which only `promote` calls. Two runs of it against the deployed URL, as far as each goes:
//   plain   : as it stands (run 2 showed: ERR_INVALID_PROTOCOL, because prove posts sign-ups with node:http, which refuses https).
//   shimmed : node:http's request made to speak https, and a telemetry folder fed from the sink Worker (traces.jsonl, logs.jsonl,
//             metrics.jsonl, polled every 500 ms), which is what a cloud Collector would have to be. No database state: D1 has no file.
// usage (from packages/cli): tsx ../../spikes/staging-pass/prove-against.ts <url> <sink-url> <evidence-dir> plain|shimmed
import { mkdirSync, writeFileSync } from "node:fs";
import http from "node:http";
import https from "node:https";
import { syncBuiltinESMExports } from "node:module";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { Cause, Effect } from "effect";

const [url, sink, dir, mode, state] = process.argv.slice(2) as [string, string, string, "plain" | "shimmed", string | undefined];
const telemetry = resolve(dir, `telemetry-${mode}`);
mkdirSync(telemetry, { recursive: true });

if (mode === "shimmed") {
  const original = http.request;
  (http as { request: unknown }).request = (target: unknown, ...rest: unknown[]) =>
    typeof target === "string" && target.startsWith("https:") ? (https.request as Function)(target, ...rest) : (original as Function)(target, ...rest);
  syncBuiltinESMExports();
}
const { Prove } = await import("../../packages/prove/src/index.ts");
const { NodeServices } = await import(pathToFileURL(resolve(import.meta.dirname, "../../packages/cli/node_modules/@effect/platform-node/dist/index.js")).href);

const pull = async () => {
  for (const signal of ["traces", "logs", "metrics"]) {
    try { writeFileSync(resolve(telemetry, `${signal}.jsonl`), await (await fetch(`${sink}/dump/${signal}`)).text()); } catch { /* the next tick tries again */ }
  }
};
const timer = mode === "shimmed" ? setInterval(pull, 500) : undefined;

const lines: string[] = [];
const exit = await Effect.runPromiseExit(
  Prove.against({ root: resolve(import.meta.dirname, "../../examples/plugged-in"), url, telemetry, ...(state ? { state } : {}), say: (line: string) => Effect.sync(() => { lines.push(line); console.log(line); }) }).pipe(Effect.provide(NodeServices.layer)),
);
if (timer) { clearInterval(timer); await pull(); }
const summary = exit._tag === "Success" ? { passed: exit.value.passed, results: exit.value.results.length } : { failure: Cause.pretty(exit.cause).slice(0, 3000) };
console.log(JSON.stringify(summary));
writeFileSync(resolve(dir, `prove-against-${mode}.json`), JSON.stringify({ summary, lines }, null, 2));
process.exit(0);
