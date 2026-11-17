// Which TraceSource a watch reads, and what to call it in the first line.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { Effect } from "effect";
import type { EnvironmentModel } from "@formants/compiler";
import { AxiomSource, FileSource } from "#modules/telemetry/service.js";
import type { TraceSource } from "#modules/telemetry/types.js";
import type { Env, Reader } from "#modules/sinks/types.js";
import { WatchFailed, type SourceName } from "../types.ts";

export interface Chosen {
  readonly reading: TraceSource;
  /** `files .architect/environments/staging/telemetry`, `axiom capxul-real-traces`. */
  readonly from: string;
}

const failed = (message: string) => new WatchFailed({ message });

/** The environment's own Collector's folder: what `env up` made it record. `local` is what `prove --env local` wrote. */
export const folderOf = (environment: string) => (environment === "local" ? ".architect/prove-telemetry" : `.architect/environments/${environment}/telemetry`);

export const choose = (options: {
  readonly root: string;
  readonly environment: string;
  readonly declared: EnvironmentModel;
  readonly source: SourceName;
  readonly env: Env;
  readonly read?: Reader;
}): Effect.Effect<Chosen, WatchFailed> => {
  const { root, environment, declared, source, env, read } = options;
  if (source === "file") {
    const folder = folderOf(environment);
    return existsSync(join(root, folder))
      ? Effect.succeed({ reading: FileSource.open(join(root, folder)), from: `files ${folder}` })
      : Effect.fail(failed(`${environment} has recorded no telemetry (${folder} is not there): \`architect env up ${environment}\`, send it some traffic, then watch`));
  }
  const named = (declared.telemetry ?? []).find((s) => s.sink === "axiom");
  if (named?.sink !== "axiom") {
    return Effect.fail(failed(`${environment} sends nothing to Axiom: name \`Telemetry.sink.axiom({ group })\` in its telemetry list in blueprint/environments/${environment}.ts, or watch the files`));
  }
  return AxiomSource.open({ group: named.group, environment, env, ...(read ? { read } : {}) }).pipe(
    Effect.map((reading): Chosen => ({ reading, from: `axiom ${named.group}-traces` })),
    Effect.mapError((e) => failed(e.message)),
  );
};
