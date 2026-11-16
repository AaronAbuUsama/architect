// generated/server: the Worker. Every operation's route wired to its handler in implementation/, by path; the world's
// front door at /_world/*; D1 tables from the model.
import type { Model } from "@architect/compiler";
import type { RenderedFile } from "../types.ts";
import { GENERATED, camel, lines, opVar, pascal } from "./names.ts";
import { renderMigration, renderWrangler } from "./worker-config.ts";

const main = (model: Model, name: string): RenderedFile => {
  const ops = Object.values(model.operations);
  const groups = [...new Set(ops.map((o) => o.thing))];
  const things = Object.values(model.things);
  const group = (t: string) => {
    const handles = ops
      .filter((o) => o.thing === t)
      .map((o) => `      .handle("${o.verb}", ({ payload, request }) => call(${opVar(o)}Served, payload, request.headers["authorization"]).pipe(Effect.provideContext(services)))`);
    return [
      `const ${pascal(t)}Live = HttpApiBuilder.group(Api, "${t}", Effect.fn(function* (handlers) {`,
      "  // The services are taken once, when the routes are built; each request keeps its own tracer and span.",
      "  const services = Context.pick(SqlClient.SqlClient, Records, Busy, Principals, Journal)(yield* Effect.context<Services>());",
      "  return handlers",
      ...handles.map((h, i) => (i === handles.length - 1 ? `${h};` : h)),
      "}));",
    ];
  };
  return {
    path: "generated/server/main.ts",
    scaffold: false,
    content: lines(
      GENERATED,
      "// The Worker: each operation's route runs its handler through the runtime's wrapper; /_world/* goes to the world.",
      `import { Context, Effect, Layer } from "effect";`,
      `import { HttpRouter, HttpServer } from "effect/http";`,
      `import { HttpApiBuilder } from "effect/http-api";`,
      `import { SqlClient } from "effect/sql";`,
      `import type { Principal } from "@architect/blueprint";`,
      `import { Database, JournalD1, RecordsD1, Telemetry, Tokens, toWorld } from "@architect/host-cloudflare";`,
      `import { Busy, BusyLive, Handlers, Journal, Principals, Records, Wire, thingIn, type Served } from "@architect/target-effect";`,
      `import { Api, Errors } from "../api/src/index.ts";`,
      ops.map((o) => `import * as ${opVar(o)} from "../api/src/${o.thing}/${o.verb}.ts";`),
      ops.map((o) => `import ${opVar(o)}Handler from "../../implementation/handlers/${o.thing}/${o.verb}.ts";`),
      things.map((t) => `import * as ${camel(t.name)}Thing from "../../blueprint/things/${t.name}/thing.ts";`),
      "",
      `export { World } from "@architect/host-cloudflare";`,
      "",
      ops.map((o) => `const ${opVar(o)}Served = Handlers.serve({ name: "${o.name}", operation: ${opVar(o)}.declaration, handler: ${opVar(o)}Handler });`),
      "",
      "/** Each thing that lives in the database, and its table. */",
      `const tables = [${things.map((t) => `[thingIn(${camel(t.name)}Thing), "${t.name}"]`).join(", ")}] as const;`,
      "",
      "const refusals = Wire.refusals(Errors.wire);",
      "type Services = SqlClient.SqlClient | Records | Busy | Principals | Journal;",
      "",
      "/** Who is calling, then the operation, its refusals sent as their wire classes. */",
      "const call = <O, P>(served: Served<O, Records | SqlClient.SqlClient>, payload: P, authorization: string | undefined) =>",
      "  Effect.flatMap(Principals, (principals) => principals.of(authorization)).pipe(",
      "    Effect.flatMap((principal: Principal) => served.run(payload as never, principal)),",
      "    refusals,",
      "  ) as Effect.Effect<never, never, Services>;",
      "",
      groups.map(group).flat(),
      "",
      "export interface Env {",
      "  readonly DB: D1Database;",
      "  readonly WORLD: DurableObjectNamespace;",
      "  readonly WORLD_SECRET: string;",
      "  readonly OTLP_URL?: string;",
      "}",
      "",
      "const build = (env: Env) =>",
      "  HttpRouter.toWebHandler(",
      "    HttpApiBuilder.layer(Api).pipe(",
      `      Layer.provide([${groups.map((t) => `${pascal(t)}Live`).join(", ")}]),`,
      "      Layer.provide([RecordsD1.layer(tables), JournalD1.layer, BusyLive, Tokens.principals(env.WORLD_SECRET)]),",
      "      Layer.provideMerge(Database.d1(env.DB)),",
      "      Layer.provide(HttpServer.layerServices),",
      "    ),",
      "  );",
      "",
      "// Built once per isolate, from the first request's bindings.",
      "let built: ReturnType<typeof build> | undefined;",
      "",
      "export default {",
      "  fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {",
      "    if (new URL(request.url).pathname.startsWith(\"/_world/\")) {",
      "      return toWorld({ worlds: env.WORLD, db: env.DB, tables: tables.map(([, table]) => table) }, request);",
      "    }",
      "    const app = (built ??= build(env));",
      `    return Telemetry.serve({ url: env.OTLP_URL || undefined, service: "${name}", handler: app.handler, waitUntil: (p) => ctx.waitUntil(p) }, request);`,
      "  },",
      "};",
    ),
  };
};

export const renderServer = (model: Model, name: string): ReadonlyArray<RenderedFile> => [
  main(model, name),
  renderWrangler(name),
  renderMigration(model),
];
