import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { Effect } from "effect";
import { Compiler, nodeSource } from "@architect/compiler";
import { Build } from "#modules/build/service.js";
import { Worlds } from "#modules/world/service.js";
import { EnvironmentFailed, type EnvironmentsApi, type Status, type Up } from "./types.ts";
import { environmentConfig } from "./internal/config.ts";
import { anyPort, files, forget, groupAlive, isFree, isWrangler, readPid, readPort, stopGroup, writePort } from "./internal/process.ts";
import { ensureSecrets } from "./internal/secrets.ts";

const NAME = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const failed = (message: string) => new EnvironmentFailed({ message });
const io = <A>(what: string, run: () => A) => Effect.try({ try: run, catch: (e) => failed(`${what}: ${String(e).replace(/^Error: /, "")}`) });

const dirOf = (root: string, name: string) => join(resolve(root), ".architect/environments", name);

/** Environments that are not the project's server on workerd: they have their own worker, built in their own step. */
const OWN_WORKER: Readonly<Record<string, string>> = { logbook: "the logbook is its own worker, built in L2.03" };

/** The environment as the blueprint declares it, and only one a long-lived workerd can run the revision's bundle for. */
const declared = (root: string, name: string) =>
  Effect.gen(function* () {
    if (!NAME.test(name)) return yield* failed(`"${name}" isn't an environment name`);
    if (OWN_WORKER[name]) return yield* failed(OWN_WORKER[name]!);
    const model = yield* Compiler.model.pipe(
      Effect.provide(nodeSource(root)),
      Effect.mapError((e) => failed(e._tag === "BlueprintInvalid" ? `the blueprint is invalid:\n  - ${e.problems.join("\n  - ")}` : e.message)),
    );
    const environment = model.environments?.[name];
    const known = Object.keys(model.environments ?? {}).filter((n) => n !== "local");
    if (!environment) return yield* failed(`no environment "${name}" in blueprint/environments/ (there is ${known.join(", ") || "none"})`);
    if (name === "local") return yield* failed(`"local" is not kept running: it is what \`architect dev\` and \`architect prove --env local\` start`);
    return environment;
  });

const status = (root: string, name: string): Effect.Effect<Status, EnvironmentFailed> =>
  Effect.gen(function* () {
    if (!NAME.test(name)) return yield* failed(`"${name}" isn't an environment name`);
    const dir = dirOf(root, name);
    const pid = readPid(dir);
    if (pid === undefined || !(yield* groupAlive(pid)) || !isWrangler(pid)) return { state: "down" as const, name };
    const port = readPort(dir);
    const bundle = yield* io("its bundle record", () => JSON.parse(readFileSync(files(dir).bundle, "utf8")) as { revision: string; sha256: string });
    if (port === undefined) return { state: "down" as const, name };
    return { state: "up" as const, name, url: `http://127.0.0.1:${port}`, port, pid, ...bundle };
  });

/** Stop whatever the pid file names, and clear what marks the environment as running. */
const reap = (dir: string) =>
  Effect.gen(function* () {
    const pid = readPid(dir);
    if (pid !== undefined && (yield* groupAlive(pid))) yield* stopGroup(pid);
    forget(dir);
  });

const choosePort = (dir: string, wanted: number | undefined) =>
  Effect.gen(function* () {
    if (wanted !== undefined) {
      if (!(yield* isFree(wanted))) return yield* failed(`port ${wanted} is already in use`);
      return wanted;
    }
    const last = readPort(dir);
    return last !== undefined && (yield* isFree(last)) ? last : yield* anyPort;
  });

const up: EnvironmentsApi["up"] = ({ root: given, name, port, revision }) =>
  Effect.gen(function* () {
    const root = resolve(given);
    const environment = yield* declared(root, name);
    const dir = dirOf(root, name);
    const f = files(dir);
    yield* io(`${dir}`, () => mkdirSync(f.state, { recursive: true }));
    const now = yield* status(root, name);
    if (now.state === "up" && (revision === undefined || revision === now.revision)) return now;
    // Not running, or running another bundle: whatever is left of it goes first. The state stays.
    yield* reap(dir);

    const rev = revision ?? (yield* Build.revision(root).pipe(Effect.mapError((e) => failed(e.message))));
    const kept = yield* Build.find(root, rev).pipe(Effect.mapError((e) => failed(e.message)));
    const built = kept ?? (revision !== undefined
      ? yield* failed(`revision ${rev} has no artefact: run \`architect build\` at that commit`)
      : yield* Build.build(root).pipe(Effect.mapError((e) => failed(e.message))));

    const base = join(root, "generated/server/wrangler.jsonc");
    if (!existsSync(base)) return yield* failed(`${base} is missing: run nx sync first`);
    const chosen = yield* choosePort(dir, port);
    yield* io(`${dir}`, () => {
      ensureSecrets(f.secrets, Object.keys(environment.secrets));
      writeFileSync(f.config, environmentConfig(root, readFileSync(base, "utf8"), { name, revision: built.revision, sha256: built.sha256, main: built.main }));
      writeFileSync(f.bundle, JSON.stringify({ revision: built.revision, sha256: built.sha256 }) + "\n");
      writePort(dir, chosen);
    });
    const launched = yield* Worlds.launch({
      config: f.config, state: f.state, port: chosen, log: f.log, pidFile: f.pid, envFile: f.secrets, ready: "/_architect/bundle",
    }).pipe(
      Effect.tapError(() => reap(dir)),
      Effect.mapError((e) => failed(`${name} didn't start: ${e.message}`)),
    );
    return { state: "up", name, url: launched.url, port: chosen, pid: launched.pid, revision: built.revision, sha256: built.sha256 } satisfies Up;
  });

const down: EnvironmentsApi["down"] = ({ root, name }) =>
  Effect.gen(function* () {
    if (!NAME.test(name)) return yield* failed(`"${name}" isn't an environment name`);
    yield* reap(dirOf(root, name));
  });

export const Environments: EnvironmentsApi = { up, down, status: ({ root, name }) => status(root, name) };
