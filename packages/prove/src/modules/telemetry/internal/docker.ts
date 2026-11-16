// The collector container: started detached on a port Docker picks, removed on release.
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { Effect } from "effect";
import { CollectorFailed } from "../types.ts";

/** Pinned in spikes/otlp-from-workerd: published 2026-10-27. */
export const IMAGE = "otel/opentelemetry-collector-contrib:0.164.0";

const CONFIG = `receivers:
  otlp:
    protocols:
      http:
        endpoint: 0.0.0.0:4318
exporters:
  file/traces:
    path: /out/traces.jsonl
    flush_interval: 10ms
  file/logs:
    path: /out/logs.jsonl
    flush_interval: 10ms
service:
  pipelines:
    traces: { receivers: [otlp], exporters: [file/traces] }
    logs: { receivers: [otlp], exporters: [file/logs] }
`;

const docker = (args: ReadonlyArray<string>) => spawnSync("docker", args, { encoding: "utf8" });

export const runCollector = (dir: string, name: string) =>
  Effect.gen(function* () {
    writeFileSync(`${dir}/collector.yaml`, CONFIG);
    const run = docker([
      "run", "-d", "--rm", "--name", name, "--user", "0:0", "-p", "127.0.0.1::4318",
      "-v", `${dir}:/out`, "-v", `${dir}/collector.yaml:/etc/otelcol/config.yaml:ro`,
      IMAGE, "--config=/etc/otelcol/config.yaml",
    ]);
    if (run.status !== 0) return yield* new CollectorFailed({ message: `docker couldn't start the collector: ${(run.stderr || run.stdout).trim()}` });
    const port = docker(["port", name, "4318/tcp"]).stdout.trim().split("\n")[0]?.split(":").pop() ?? "";
    if (!/^\d+$/.test(port)) return yield* new CollectorFailed({ message: `the collector started but published no port` });
    return `http://127.0.0.1:${port}`;
  });

export const removeCollector = (name: string) => Effect.sync(() => void docker(["rm", "-f", name]));
