// The collector container: started detached on a port Docker picks, removed on release.
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { Effect, Schedule } from "effect";
import { CollectorFailed } from "../types.ts";

/** Pinned in spikes/otlp-from-workerd: published 2026-10-27. */
export const IMAGE = "otel/opentelemetry-collector-contrib:0.164.0";

/**
/** What a collector is started with: attribute keys to delete (L2.P), and the viewer's OTLP address while it runs. */
export interface CollectorOptions {
  readonly strip: ReadonlyArray<string>;
  readonly viewer: string | undefined;
}

/**
 * The collector's config. Every pipeline first drops the person the agent SDK's records name (`user.*`,
 * `organization.id`), then, with `strip` keys, deletes each from every span and log record (L2.P: the second guard
 * behind the runtime's allowlist), before any exporter sees it. While the local viewer runs there is a second
 * `otlphttp` exporter on each pipeline (O1); a viewer that goes away mid-run costs the export, never the run.
 * Keys are written as JSON strings, which YAML reads as the same string.
 */
export const collectorConfig = ({ strip, viewer }: CollectorOptions) => {
  const chain = ["attributes/personal", "resource/personal", ...(strip.length > 0 ? ["attributes/private"] : [])];
  const to = (file: string) => `[${file}${viewer ? ", otlphttp/viewer" : ""}]`;
  return [
    "receivers:", "  otlp:", "    protocols:", "      http:", "        endpoint: 0.0.0.0:4318",
    "processors:",
    "  attributes/personal:", "    actions:", "      - { pattern: '^(user\\..*|organization\\.id)$', action: delete }",
    "  resource/personal:", "    attributes:", "      - { pattern: '^(user\\..*|organization\\.id)$', action: delete }",
    ...(strip.length > 0 ? ["  attributes/private:", "    actions:", ...strip.flatMap((k) => [`      - key: ${JSON.stringify(k)}`, "        action: delete"])] : []),
    "exporters:", "  file/traces:", "    path: /out/traces.jsonl", "    flush_interval: 10ms", "  file/logs:", "    path: /out/logs.jsonl", "    flush_interval: 10ms",
    ...(viewer ? ["  otlphttp/viewer:", `    endpoint: ${viewer}`, "    timeout: 2s", "    retry_on_failure: { enabled: false }", "    sending_queue: { enabled: true, queue_size: 1000 }"] : []),
    "service:", "  pipelines:",
    `    traces: { receivers: [otlp], processors: [${chain.join(", ")}], exporters: ${to("file/traces")} }`,
    `    logs: { receivers: [otlp], processors: [${chain.join(", ")}], exporters: ${to("file/logs")} }`,
    "",
  ].join("\n");
};

const docker = (args: ReadonlyArray<string>) => spawnSync("docker", args, { encoding: "utf8" });

export const runCollector = (dir: string, name: string, options: CollectorOptions) =>
  Effect.gen(function* () {
    writeFileSync(`${dir}/collector.yaml`, collectorConfig(options));
    const start = Effect.sync(() => {
      docker(["rm", "-f", name]);
      return docker([
        "run", "-d", "--rm", "--name", name, "--network", "bridge", "--user", "0:0", "-p", "127.0.0.1::4318",
        "-v", `${dir}:/out`,
        // The config goes inline, not as a mounted file: a file just rewritten may not be visible yet through Docker
        // Desktop's file sharing, and the collector would exit before it answers. collector.yaml is kept to read.
        IMAGE, `--config=yaml:${collectorConfig(options)}`,
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

/** `ortho-collector-<owner pid>-<random>`: the name a collector started by a process carries, scoped to it. */
export const ownedName = (pid: number) => `ortho-collector-${pid}-${Math.floor(Math.random() * 1e9)}`;

const OWNED = /^ortho-collector-(\d+)-\d+$/;

/** Whether a process is still there. Not being allowed to signal it means it is: someone else's, and alive. */
const alive = (pid: number): boolean => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === "EPERM";
  }
};

/**
 * Remove every collector whose owner process is gone: a prove killed before it could clean up leaves its container
 * running for good, and each is a few hundred megabytes. Collectors of a live process, and an environment's own (named
 * for its folder, removed by `env down`), are never touched. Answers the names it removed.
 */
export const sweepOrphans = (): Effect.Effect<ReadonlyArray<string>> =>
  Effect.sync(() => {
    const listed = docker(["ps", "-a", "--filter", "name=ortho-collector-", "--format", "{{.Names}}"]);
    if (listed.status !== 0) return [];
    const orphans = listed.stdout.split("\n").map((n) => n.trim()).filter((n) => {
      const owner = OWNED.exec(n)?.[1];
      return owner !== undefined && !alive(Number(owner));
    });
    for (const n of orphans) docker(["rm", "-f", n]);
    return orphans;
  });
