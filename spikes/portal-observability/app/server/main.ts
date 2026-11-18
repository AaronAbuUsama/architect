// The portal's local server: the model, the journey list, and one telemetry query, from the Collector's files or from
// the local viewer. The browser never talks to a backend directly. Entry file: reads argv/env, prints, serves.
//
//   node server/main.ts            (FORMAN_ROOT defaults to examples/acme; port 8793)
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { join, resolve } from "node:path";
import { Effect } from "effect";
import { FileSource } from "../../../../packages/prove/src/index.ts";
import type { JourneyRef, Telemetry, Trace } from "../src/page/model.ts";
import { tempoWindow } from "./tempo.ts";

const root = resolve(process.env["FORMAN_ROOT"] ?? join(import.meta.dirname, "../../../../examples/acme"));
const port = Number(process.env["PORT"] ?? 8793);
const files = FileSource.open([join(root, ".forman/dev-telemetry"), join(root, ".forman/prove-telemetry")]);

const grafana = (): string | undefined => {
  try {
    const out = execFileSync("docker", ["port", "forman-viewer", "3000/tcp"], { encoding: "utf8" }).trim().split("\n")[0] ?? "";
    const p = out.split(":").pop();
    return p && /^\d+$/.test(p) ? `http://127.0.0.1:${p}` : undefined;
  } catch {
    return undefined;
  }
};

/** Stopgap: journeys aren't in the model, so their files are read for a name and the verbs they import. */
const journeys = (): ReadonlyArray<JourneyRef> =>
  readdirSync(join(root, "journeys"))
    .filter((f) => f.endsWith(".ts"))
    .map((f) => {
      const src = readFileSync(join(root, "journeys", f), "utf8");
      const name = /Blueprint\.journey\(\s*"([^"]+)"/.exec(src)?.[1] ?? f;
      const operations = [...src.matchAll(/things\/([a-z-]+)\/verbs\/([a-z-]+)\.ts/g)].map((m) => `${m[1]}.${m[2]}`);
      return { name, file: `examples/acme/journeys/${f}`, operations };
    });

const telemetry = async (source: string, since: number): Promise<Telemetry & { readonly timing: Record<string, number> }> => {
  const now = Date.now();
  const t0 = performance.now();
  if (source === "tempo") {
    const g = grafana();
    if (!g) throw new Error("the local viewer isn't running: forman telemetry view");
    const { traces, searchMs, fetched } = await Effect.runPromise(tempoWindow(g, since, now));
    return { source: "tempo", now, since, traces, timing: { totalMs: performance.now() - t0, searchMs, fetched } };
  }
  const window = await Effect.runPromise(files.window(since, now));
  const traces: Record<string, Trace> = Object.fromEntries(window);
  return { source: "file", now, since, traces, timing: { totalMs: performance.now() - t0 } };
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  const send = (code: number, body: unknown) => {
    res.writeHead(code, { "content-type": "application/json", "cache-control": "no-store" });
    res.end(JSON.stringify(body));
  };
  try {
    if (url.pathname === "/api/model") return send(200, JSON.parse(readFileSync(join(root, "generated/model/model.json"), "utf8")));
    if (url.pathname === "/api/journeys") return send(200, journeys());
    if (url.pathname === "/api/telemetry") {
      const since = Number(url.searchParams.get("since") ?? 30 * 60_000);
      return send(200, await telemetry(url.searchParams.get("source") ?? "file", since));
    }
    if (url.pathname === "/api/viewer") return send(200, { grafana: grafana() ?? null });
    send(404, { error: "no such route" });
  } catch (e) {
    send(502, { error: e instanceof Error ? e.message : String(e) });
  }
});
server.listen(port, "127.0.0.1", () => console.log(`portal server http://127.0.0.1:${port}  root ${root}`));
