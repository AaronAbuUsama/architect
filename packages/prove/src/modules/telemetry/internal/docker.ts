// The collector container: started detached on a port Docker picks, removed on release.
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { Effect, Schedule } from "effect";
import { CollectorFailed } from "../types.ts";

/** Pinned in spikes/otlp-from-workerd: published 2026-10-27. */
export const IMAGE = "otel/opentelemetry-collector-contrib:0.164.0";

/**
 * The collector's config. With `strip` keys, an `attributes` processor sits in both pipelines and deletes each key from
 * every span and log record before the file exporter sees it (L2.P): the second guard behind the runtime's allowlist.
 * Keys are written as JSON strings, which YAML reads as the same string.
 */
export const collectorConfig = (strip: ReadonlyArray<string>) => {
  const guarded = strip.length > 0;
  const processors = guarded ? ["      processors: [attributes/private]"] : [];
  return [
    "receivers:", "  otlp:", "    protocols:", "      http:", "        endpoint: 0.0.0.0:4318",
    ...(guarded ? ["processors:", "  attributes/private:", "    actions:", ...strip.flatMap((k) => [`      - key: ${JSON.stringify(k)}`, "        action: delete"])] : []),
    "exporters:", "  file/traces:", "    path: /out/traces.jsonl", "    flush_interval: 10ms", "  file/logs:", "    path: /out/logs.jsonl", "    flush_interval: 10ms",
    "service:", "  pipelines:",
    "    traces:", "      receivers: [otlp]", ...processors, "      exporters: [file/traces]",
    "    logs:", "      receivers: [otlp]", ...processors, "      exporters: [file/logs]",
    "",
  ].join("\n");
};

const docker = (args: ReadonlyArray<string>) => spawnSync("docker", args, { encoding: "utf8" });

export const runCollector = (dir: string, name: string, strip: ReadonlyArray<string> = []) =>
  Effect.gen(function* () {
    writeFileSync(`${dir}/collector.yaml`, collectorConfig(strip));
    const start = Effect.sync(() => {
      docker(["rm", "-f", name]);
      return docker([
        "run", "-d", "--rm", "--name", name, "--user", "0:0", "-p", "127.0.0.1::4318",
        "-v", `${dir}:/out`, "-v", `${dir}/collector.yaml:/etc/otelcol/config.yaml:ro`,
        IMAGE, "--config=/etc/otelcol/config.yaml",
      ]);
    });
    // Docker Desktop's file sharing can lag a moment behind a file just written ("mkdir ... no such file"): another try is enough.
    const run = yield* start.pipe(
      Effect.flatMap((r) => (r.status !== 0 && /no such file|mount/i.test(r.stderr) ? Effect.fail(r) : Effect.succeed(r))),
      Effect.retry({ schedule: Schedule.spaced("1 second"), times: 3 }),
      Effect.catch((r: ReturnType<typeof docker>) => Effect.succeed(r)),
    );
    if (run.status !== 0) return yield* new CollectorFailed({ message: `docker couldn't start the collector: ${(run.stderr || run.stdout).trim()}` });
    const port = docker(["port", name, "4318/tcp"]).stdout.trim().split("\n")[0]?.split(":").pop() ?? "";
    if (!/^\d+$/.test(port)) return yield* new CollectorFailed({ message: `the collector started but published no port` });
    return `http://127.0.0.1:${port}`;
  });

export const removeCollector = (name: string) => Effect.sync(() => void docker(["rm", "-f", name]));
