// generated/server: the Worker. Every operation's route wired to its handler in implementation/, by path; the world's
// front door at /_world/*; D1 tables from the model.
import type { Model, OperationModel } from "@architect/compiler";
import type { RenderedFile } from "../types.ts";
import { GENERATED, camel, lines, opVar, pascal } from "./names.ts";
import { renderMigration, renderWrangler } from "./worker-config.ts";

/** The machine's refusal, passed to the wrapper when the operation's move starts from a state (D2 #37). */
const notFromOf = (model: Model, o: OperationModel) => {
  const machine = model.things[o.thing]?.machine;
  return o.move && o.move.from.length > 0 && machine ? `, notFrom: "${machine.notFrom.error}"` : "";
};

const main = (model: Model, name: string): RenderedFile => {
  const ops = Object.values(model.operations);
  const actors = Object.values(model.things).some((t) => t.lives === "actor");
  const handled = ops.filter((o) => o.kind === "operation");
  const groups = [...new Set(ops.map((o) => o.thing))];
  const things = Object.values(model.things);
  const group = (t: string) => {
    const handles = ops
      .filter((o) => o.thing === t)
      .map((o) => `      .handle("${o.verb}", ({ payload, request }) => call(${opVar(o)}Served, payload, request.headers).pipe(Effect.provideContext(services)))`);
    return [
      `const ${pascal(t)}Live = HttpApiBuilder.group(Api, "${t}", Effect.fn(function* (handlers) {`,
      "  // The services are taken once, when the routes are built; each request keeps its own tracer and span.",
      "  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth)(yield* Effect.context<Services>());",
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
      `import { AuthD1, Database, JournalD1, StoreD1, Telemetry, toWorld } from "@architect/host-cloudflare";`,
      `import { Auth, Busy, BusyLive, Handlers, Journal, Principals, Reads, Store, Wire, thingIn } from "@architect/target-effect";`,
      `import { Api, Errors } from "../api/src/index.ts";`,
      ops.map((o) => `import * as ${opVar(o)} from "../api/src/${o.thing}/${o.verb}.ts";`),
      handled.map((o) => `import ${opVar(o)}Handler from "../../implementation/handlers/${o.thing}/${o.verb}.ts";`),
      things.map((t) => `import * as ${camel(t.name)}Thing from "../../blueprint/things/${t.name}/thing.ts";`),
      "",
      actors ? `export { Actor, World } from "@architect/host-cloudflare";` : `export { World } from "@architect/host-cloudflare";`,
      "",
      ops.map((o) =>
        o.kind === "read"
          ? `const ${opVar(o)}Served = Reads.serve({ name: "${o.name}", read: ${opVar(o)}.declaration });`
          : `const ${opVar(o)}Served = Handlers.serve({ name: "${o.name}", operation: ${opVar(o)}.declaration, handler: ${opVar(o)}Handler${notFromOf(model, o)} });`),
      "",
      "/** Each thing and its table: a D1 table, or the name its actors go by. */",
      `const tables = [${things.map((t) => `[thingIn(${camel(t.name)}Thing), "${t.name}"]`).join(", ")}] as const;`,
      "",
      "const refusals = Wire.refusals(Errors.wire);",
      "type Services = SqlClient.SqlClient | Store | Busy | Principals | Journal | Auth;",
      "",
      "/** Who is calling, then the operation or read, its refusals sent as their wire classes. */",
      "type Run = (payload: never, principal: Principal, request?: string) => Effect.Effect<unknown, unknown, unknown>;",
      "const call = <P>(served: { readonly run: Run }, payload: P, headers: Readonly<Record<string, string | undefined>>) =>",
      "  Effect.flatMap(Principals, (principals) => principals.of(headers[\"authorization\"])).pipe(",
      "    // The caller's idempotency key: for an operation declared `idempotent: \"request\"`, the same key is one call.",
      "    Effect.flatMap((principal: Principal) => served.run(payload as never, principal, headers[\"idempotency-key\"])),",
      "    refusals,",
      "  ) as Effect.Effect<never, never, Services>;",
      "",
      groups.map(group).flat(),
      "",
      "export interface Env {",
      "  readonly DB: D1Database;",
      "  readonly WORLD: DurableObjectNamespace;",
      actors ? "  readonly ACTORS: DurableObjectNamespace;" : [],
      "  /** Better Auth's secret, at least 32 characters: fresh per local world, a named secret per environment. */",
      "  readonly AUTH_SECRET: string;",
      "  readonly OTLP_URL?: string;",
      "  /** Which build this environment runs, set by `architect env up`; unset for a world made by `architect dev` or prove. */",
      "  readonly ARCHITECT_REVISION?: string;",
      "  readonly ARCHITECT_BUNDLE_SHA256?: string;",
      "  /** `1` in an environment that hosts worlds with lifetimes (a test environment), set by `architect env up`. */",
      "  readonly ARCHITECT_WORLDS?: string;",
      "}",
      "",
      "const build = (env: Env) =>",
      "  HttpRouter.toWebHandler(",
      "    HttpApiBuilder.layer(Api).pipe(",
      `      Layer.provide([${groups.map((t) => `${pascal(t)}Live`).join(", ")}]),`,
      `      Layer.provide([StoreD1.layer({ tables${actors ? ", actors: env.ACTORS" : ""} }), JournalD1.layer, BusyLive, AuthD1.layer(AuthD1.make({ db: env.DB, secret: env.AUTH_SECRET }))]),`,
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
      "      return toWorld({ worlds: env.WORLD, db: env.DB, tables: tables.map(([, table]) => table), leases: env.ARCHITECT_WORLDS === \"1\" }, request);",
      "    }",
      "    if (new URL(request.url).pathname === \"/_architect/bundle\") {",
      "      return env.ARCHITECT_REVISION && env.ARCHITECT_BUNDLE_SHA256",
      "        ? Promise.resolve(Response.json({ revision: env.ARCHITECT_REVISION, sha256: env.ARCHITECT_BUNDLE_SHA256 }))",
      "        : Promise.resolve(Response.json({ _tag: \"NotAnEnvironment\" }, { status: 404 }));",
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
  renderWrangler(name, Object.values(model.things).some((t) => t.lives === "actor")),
  renderMigration(model),
];
