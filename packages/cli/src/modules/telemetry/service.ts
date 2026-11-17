import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { Effect } from "effect";
import { FileSource, TraceTrees, Viewer } from "@architect/prove";
import type { Said, TelemetryCommandApi } from "./types.ts";

const ID = /^[0-9a-f]{32}$/;
const refused = (err: string, exit = 2): Said => ({ out: "", err: `${err.trimEnd()}\n`, exit });

/** The folders a Collector wrote traces to, for one environment or all: prove's, dev's, and each environment's own. */
const foldersOf = (root: string, env: string | undefined): ReadonlyArray<string> => {
  const own = join(root, ".architect/environments");
  const environments = existsSync(own) ? readdirSync(own).map((n) => ({ name: n, dir: join(own, n, "telemetry") })) : [];
  const all = [{ name: "local", dir: join(root, ".architect/prove-telemetry") }, { name: "local", dir: join(root, ".architect/dev-telemetry") }, ...environments];
  return all.filter((f) => (env === undefined || f.name === env) && existsSync(f.dir)).map((f) => f.dir);
};

const checked = (id: string) =>
  !ID.test(id) ? refused(`"${id}" isn't a trace id: it is 32 hexadecimal characters, in the x-trace-id header of every response`) : undefined;

export const TelemetryCommand: TelemetryCommandApi = {
  view: () =>
    Viewer.start().pipe(
      Effect.map((v): Said => ({
        out: [
          `viewer ${v.url}  (${v.anonymous ? "no login" : "login admin / admin"})`,
          `then: architect dev, or architect prove --view; open Explore, choose Tempo, paste a trace id`,
          `a collector started from now on also sends here; architect telemetry stop removes the viewer`,
        ].join("\n") + "\n",
        err: "",
        exit: 0,
      })),
      Effect.catchTag("ViewerFailed", (e) => Effect.succeed(refused(e.message))),
    ),
  stop: () => Viewer.stop().pipe(Effect.map((): Said => ({ out: "viewer stopped\n", err: "", exit: 0 }))),
  trace: ({ root, id, env }) =>
    Effect.gen(function* () {
      const bad = checked(id);
      if (bad) return bad;
      const dirs = foldersOf(root, env);
      const found = dirs.length === 0 ? undefined : yield* FileSource.open(dirs).find(id);
      return found === undefined
        ? refused(`no trace ${id} in ${dirs.length === 0 ? `any telemetry folder of this project${env ? ` for ${env}` : ""} (prove writes .architect/prove-telemetry)` : dirs.map((d) => d.replace(`${root}/`, "")).join(", ")}`, 1)
        : { out: TraceTrees.render(id, found).join("\n") + "\n", err: "", exit: 0 } satisfies Said;
    }),
  open: ({ id }) =>
    Effect.gen(function* () {
      const bad = checked(id);
      if (bad) return bad;
      const viewing = yield* Viewer.running();
      if (!viewing) return refused("the viewer isn't running: start it with `architect telemetry view`, then run what you want to look at");
      const link = Viewer.link(viewing, id);
      return { out: `${link}\n`, err: "", exit: 0, open: link } satisfies Said;
    }),
};
