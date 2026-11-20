import { join } from "node:path";
import { Effect } from "effect";
import { Portal, Wire } from "@orthograph/portal";
import { FileSource } from "@orthograph/prove";
import type { ProjectPorts } from "../project-evidence/types.ts";
import { proveFresh } from "./internal/prove.ts";
import { toolsList } from "./internal/mcp.ts";
import type { WorldApi } from "./types.ts";

const json = <A>(text: string | undefined): A | undefined => {
  if (text === undefined) return undefined;
  const parsed = Effect.runSync(Effect.try(() => JSON.parse(text) as A).pipe(Effect.orElseSucceed(() => undefined)));
  return parsed;
};

export const World: WorldApi = {
  proveFresh,
  ports: ({ project, report, telemetry, node }): ProjectPorts => ({
    model: Effect.sync(() => json(node.read(join(project, "generated/model/model.json")))),
    generated: Effect.sync(() => {
      const root = join(project, "generated");
      return Object.fromEntries(node.list(root).flatMap((path) => { const text = node.read(join(root, path)); return text === undefined ? [] : [[`generated/${path}`, text] as const]; }));
    }),
    portal: (route) => {
      const wire = json<unknown>(node.read(join(project, "generated/portal/blueprint.json")));
      if (wire === undefined) return Effect.succeed(undefined);
      return Wire.decode(wire).pipe(
        Effect.flatMap((blueprint) => Portal.handle({ blueprint, reader: null, bundleRevision: null }, new Request(`http://portal.test${route}`))),
        Effect.flatMap((response) => (response.status === 200 ? Effect.promise(() => response.text()) : Effect.succeed(undefined))),
        Effect.orElseSucceed(() => undefined),
      );
    },
    cliHelp: (words) => Effect.sync(() => {
      const ran = node.run("npx", ["tsx", "generated/cli/src/main.ts", ...words, "--help"], project);
      return ran.status === 0 ? ran.stdout : undefined;
    }),
    mcpTools: Effect.tryPromise(() => toolsList(project, node.load)).pipe(Effect.orElseSucceed(() => undefined)),
    spans: Effect.suspend(() => node.list(telemetry).length === 0 ? Effect.succeed(undefined) : FileSource.open(telemetry).window(30 * 24 * 3_600_000).pipe(
      Effect.map((traces) => [...traces.values()].flatMap((trace) => trace.spans.map((span) => ({ name: span.name, attrs: span.attrs })))),
      Effect.orElseSucceed(() => undefined),
    )),
    prove: Effect.sync(() => json(node.read(report))),
  }),
};
