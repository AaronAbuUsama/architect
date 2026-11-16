import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { Effect } from "effect";
import { Compiler, nodeSource } from "@architect/compiler";
import { Build } from "#modules/build/service.js";
import { Collectors, privateKeys } from "#modules/telemetry/service.js";
import { Worlds } from "#modules/world/service.js";
import type { EnvironmentsApi, Up } from "./types.ts";
import { collectorName, telemetryDir } from "./internal/collector.ts";
import { environmentConfig } from "./internal/config.ts";
import { startLogbook } from "./internal/logbook.ts";
import { choosePort, files, reap, writePort } from "./internal/process.ts";
import { NAME, dirOf, failed, io, status } from "./internal/status.ts";
import { ensureSecrets } from "./internal/secrets.ts";

/** The environment as the blueprint declares it, and only one a long-lived workerd can run the revision's bundle for. */
const declared = (root: string, name: string) =>
  Effect.gen(function* () {
    if (!NAME.test(name)) return yield* failed(`"${name}" isn't an environment name`);
    const model = yield* Compiler.model.pipe(
      Effect.provide(nodeSource(root)),
      Effect.mapError((e) => failed(e._tag === "BlueprintInvalid" ? `the blueprint is invalid:\n  - ${e.problems.join("\n  - ")}` : e.message)),
    );
    const environment = model.environments?.[name];
    const known = Object.keys(model.environments ?? {}).filter((n) => n !== "local");
    if (!environment) return yield* failed(`no environment "${name}" in blueprint/environments/ (there is ${known.join(", ") || "none"})`);
    if (name === "local") return yield* failed(`"local" is not kept running: it is what \`architect dev\` and \`architect prove --env local\` start`);
    return { environment, strip: privateKeys(model) };
  });

const up: EnvironmentsApi["up"] = ({ root: given, name, port, revision, policy }) =>
  Effect.gen(function* () {
    const root = resolve(given);
    const dir = dirOf(root, name);
    if (name === "logbook") {
      if (!NAME.test(name)) return yield* failed(`"${name}" isn't an environment name`);
      const running = yield* status(root, name);
      if (running.state === "up") return running;
      if (!policy) return yield* failed("the logbook needs a policy: ARCHITECT_OIDC_ISSUER, ARCHITECT_OIDC_REPOSITORY, ARCHITECT_OIDC_REF and ARCHITECT_OIDC_WORKFLOW");
      return yield* startLogbook(dir, port, policy);
    }
    const { environment, strip } = yield* declared(root, name);
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
    const chosen = yield* choosePort(dir, port).pipe(Effect.mapError(failed));
    // An environment that hosts worlds has its own collector, which lives until `down`.
    const hosts = environment.lifetimeMs !== null;
    const otlp = hosts
      ? yield* Collectors.launch({ dir: telemetryDir(dir), name: collectorName(dir), strip }).pipe(Effect.mapError((e) => failed(`${name} needs Docker for its collector: ${e.message}`)))
      : undefined;
    yield* io(`${dir}`, () => {
      ensureSecrets(f.secrets, Object.keys(environment.secrets));
      writeFileSync(f.config, environmentConfig(root, readFileSync(base, "utf8"), {
        name, revision: built.revision, sha256: built.sha256, main: built.main, ...(otlp ? { worlds: { otlp } } : {}),
      }));
      writeFileSync(f.bundle, JSON.stringify({ revision: built.revision, sha256: built.sha256 }) + "\n");
      writePort(dir, chosen);
    });
    const launched = yield* Worlds.launch({
      config: f.config, state: f.state, port: chosen, log: f.log, pidFile: f.pid, envFile: f.secrets, ready: "/_architect/bundle",
    }).pipe(
      Effect.tapError(() => reap(dir)),
      Effect.mapError((e) => failed(`${name} didn't start: ${e.message}`)),
    );
    return {
      state: "up", name, url: launched.url, port: chosen, pid: launched.pid, revision: built.revision, sha256: built.sha256,
      ...(hosts ? { telemetry: telemetryDir(dir) } : {}),
    } satisfies Up;
  });

const down: EnvironmentsApi["down"] = ({ root, name }) =>
  Effect.gen(function* () {
    if (!NAME.test(name)) return yield* failed(`"${name}" isn't an environment name`);
    yield* reap(dirOf(root, name));
  });

export const Environments: EnvironmentsApi = { up, down, status: ({ root, name }) => status(root, name) };
