// generated/server: the Worker. Every operation's route wired to its handler in src/, by path; the world's
// front door at /_world/*; the portal at /portal and /_portal/*; D1 tables from the model.
import { Names } from "orthograph/server";
import type { Model, OperationModel } from "@orthograph/compiler";
import type { RenderedFile } from "../types.ts";
import { GENERATED, bindingOf, camel, databaseStores, handlerAt, lines, opVar, pascal, storeFileAt, thingFileAt, toRoot } from "./names.ts";
import { renderMigration, renderStoreMigrations, renderWrangler } from "./worker-config.ts";

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
  // Each mount a served operation came from, imported once: its plugin's handlers run under it (Mount.serving).
  const mounted = [...new Set(handled.flatMap((o) => (o.from.kind !== "app" ? [o.from.mount] : [])))].filter((m) => model.mounts?.[m]);
  const mountVar = (mount: string) => `${camel(mount)}Mount`;
  const served = (o: OperationModel) => (o.from.kind !== "app" && mounted.includes(o.from.mount) ? `Mount.serving(${mountVar(o.from.mount)}, ${opVar(o)}Handler)` : `${opVar(o)}Handler`);
  // Each declared database store (K3) has a D1 binding of its own, and its own journal and request keys.
  const stores = databaseStores(model);
  const storeOption = stores.length > 0 ? `, stores: [${stores.map((s) => `[${camel(s.name)}Store, env.${bindingOf(s)}]`).join(", ")}]` : "";
  const journal = stores.length > 0 ? `JournalD1.across([${stores.map((s) => `env.${bindingOf(s)}`).join(", ")}])` : "JournalD1.layer";
  const apart = new Set(Object.values(model.things).filter((t) => t.store !== undefined && stores.some((s) => s.name === t.store)).map((t) => t.name));
  const world = stores.length > 0
    ? `tables: [${Object.values(model.things).filter((t) => !apart.has(t.name)).map((t) => `"${t.name}"`).join(", ")}], stores: [${stores.map((s) => `{ db: env.${bindingOf(s)}, tables: [${Object.values(model.things).filter((t) => t.store === s.name).map((t) => `"${t.name}"`).join(", ")}] }`).join(", ")}]`
    : "tables: tables.map(([, table]) => table)";
  const group = (t: string) => {
    const handles = ops
      .filter((o) => o.thing === t)
      .map((o) => `      .handle("${o.verb}", ({ payload, request }) => call(${opVar(o)}Served, payload, request.headers).pipe(Effect.provideContext(services)))`);
    return [
      `const ${pascal(t)}Live = HttpApiBuilder.group(CallApi, "${t}", Effect.fn(function* (handlers) {`,
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
      `import { ManagedRuntime, Tracer } from "effect";`,
      `import { HttpRouter, HttpServer } from "effect/http";`,
      `import { HttpApiBuilder } from "effect/http-api";`,
      `import { SqlClient } from "effect/sql";`,
      `import type { Principal } from "${Names.frontDoor}";`,
      `import { AuthD1, Database, JournalD1, StoreD1, Telemetry, toWorld } from "${Names.pkg("host-cloudflare")}";`,
      `import { Auth, Busy, BusyLive, CallTelemetry, Handlers, Journal, ${mounted.length > 0 ? "Mount, " : ""}Principals, Reads, Store, Wire, thingIn } from "${Names.pkg("language-effect")}";`,
      `import { Mcp, type McpResult } from "${Names.pkg("language-effect")}";`,
      `import { Api, Errors } from "../api/src/index.ts";`,
      `import * as portal from "../portal/main.ts";`,
      `import { catalog } from "../mcp/src/index.ts";`,
      ops.map((o) => `import * as ${opVar(o)} from "../api/src/${o.thing}/${o.verb}.ts";`),
      handled.map((o) => `import ${opVar(o)}Handler from "${handlerAt("generated/server/main.ts", o)}";`),
      mounted.map((m) => `import ${mountVar(m)} from "${toRoot("generated/server/main.ts")}${model.mounts![m]!.file}";`),
      things.map((t) => `import * as ${camel(t.name)}Thing from "${thingFileAt("generated/server/main.ts", t, "thing")}";`),
      stores.map((s) => `import ${camel(s.name)}Store from "${storeFileAt("generated/server/main.ts", s)}";`),
      "",
      actors ? `export { Actor, World } from "${Names.pkg("host-cloudflare")}";` : `export { World } from "${Names.pkg("host-cloudflare")}";`,
      "",
      ops.map((o) =>
        o.kind === "read"
          ? `const ${opVar(o)}Served = Reads.serve({ name: "${o.name}", read: ${opVar(o)}.declaration });`
          : `const ${opVar(o)}Served = Handlers.serve({ name: "${o.name}", operation: ${opVar(o)}.declaration, handler: ${served(o)}${notFromOf(model, o)} });`),
      "",
      "/** Each thing and its table: a D1 table, or the name its actors go by. */",
      `const tables = [${things.map((t) => `[thingIn(${camel(t.name)}Thing), "${t.name}"]`).join(", ")}] as const;`,
      "",
      "const refusals = Wire.refusals(Errors.wire);",
      "const CallApi = Api.middleware(CallTelemetry);",
      "type Services = SqlClient.SqlClient | Store | Busy | Principals | Journal | Auth;",
      "",
      "/** Who is calling, then the operation or read, its refusals sent as their wire classes. */",
      "type Run = (payload: never, principal: Principal, request?: string) => Effect.Effect<unknown, unknown, unknown>;",
      "const call = <P>(served: { readonly run: Run }, payload: P, headers: Readonly<Record<string, string | undefined>>) =>",
      "  Effect.flatMap(Principals, (principals) => principals.of(headers[\"authorization\"])).pipe(",
      "    Effect.withTracerEnabled(false),",
      "    // The caller's idempotency key: for an operation declared `idempotent: \"request\"`, the same key is one call.",
      "    Effect.flatMap((principal: Principal) => served.run(payload as never, principal, headers[\"idempotency-key\"])),",
      "    refusals,",
      "  ) as Effect.Effect<never, never, Services>;",
      "",
      groups.map(group).flat(),
      "",
      "export interface Env {",
      "  readonly DB: D1Database;",
      stores.map((s) => `  /** The database of store ${s.name}: its own tables, journal and request keys. */\n  readonly ${bindingOf(s)}: D1Database;`),
      "  readonly WORLD: DurableObjectNamespace;",
      actors ? "  readonly ACTORS: DurableObjectNamespace;" : [],
      "  /** Better Auth's secret, at least 32 characters: fresh per local world, a named secret per environment. */",
      "  readonly AUTH_SECRET: string;",
      "  readonly OTLP_URL?: string;",
      "  /** The environment's telemetry sinks beside the collector, as JSON: each one's OTLP endpoints and headers. A secret. */",
      "  readonly OTLP_SINKS?: string;",
      "  /** The environment's name, written on every span as `deployment.environment`: `local` for a world of dev or prove. */",
      "  readonly ORTHO_ENVIRONMENT?: string;",
      "  /** Which build this environment runs, set by `ortho env up`; unset for a world made by `ortho dev` or prove. */",
      "  readonly ORTHO_REVISION?: string;",
      "  readonly ORTHO_BUNDLE_SHA256?: string;",
      "  /** The portal's: where the logbook is, which environment this is. Read by `portal.serve`; neither is sent to a browser. */",
      "  readonly ORTHO_LOGBOOK_URL?: string;",
      "  /** `1` in an environment that hosts worlds with lifetimes (a test environment), set by `ortho env up`. */",
      "  readonly ORTHO_WORLDS?: string;",
      "}",
      "",
      "// Better Auth's own routes at /api/auth/*: the device sign-in of this project's CLI. Same database and secret as the",
      "// layer's instance, so a session either one issues is a person to both.",
      "let routes: ReturnType<typeof AuthD1.make> | undefined;",
      `const routesOf = (env: Env) => (routes ??= AuthD1.make({ db: env.DB, secret: env.AUTH_SECRET, cli: "${name}-cli" }));`,
      "",
      "const build = (env: Env) =>",
      "  HttpRouter.toWebHandler(",
      "    HttpApiBuilder.layer(CallApi).pipe(",
      `      Layer.provide([${groups.map((t) => `${pascal(t)}Live`).join(", ")}]),`,
      "      Layer.provideMerge(CallTelemetry.layer),",
      `      Layer.provide([StoreD1.layer({ tables${actors ? ", actors: env.ACTORS" : ""}${storeOption} }), ${journal}, BusyLive, AuthD1.layer(AuthD1.make({ db: env.DB, secret: env.AUTH_SECRET }))]),`,
      "      Layer.provideMerge(Database.d1(env.DB)),",
      "      Layer.provide(HttpServer.layerServices),",
      "    ),",
      "  );",
      "",
      "// Built once per isolate, from the first request's bindings.",
      "let built: ReturnType<typeof build> | undefined;",
      "",
      "/** The environments of the blueprint that host worlds: those that declare a `lifetime` (D3 #126). */",
      `const WORLD_ENVIRONMENTS: ReadonlyArray<string> = ${JSON.stringify(Object.values(model.environments ?? {}).filter((e) => e.lifetimeMs !== null).map((e) => e.name))};`,
      "",
      "/**",
      " * `/_world/*` (the cast that signs people up with known passwords, the facts, the registry of worlds) answers only where",
      " * worlds live: a world made by `ortho dev` or prove (`local`, or no environment), and an environment that declares a lifetime and",
      " * was started to host worlds. Anywhere else, staging and production included, it is a 404 before any handler runs.",
      " */",
      "const hostsWorlds = (env: Env) =>",
      "  !env.ORTHO_ENVIRONMENT || env.ORTHO_ENVIRONMENT === \"local\" || (env.ORTHO_WORLDS === \"1\" && WORLD_ENVIRONMENTS.includes(env.ORTHO_ENVIRONMENT));",
      "",
      "/** One tool per operation and read: the same served operations as the API, called as the person the access token names. */",
      "const tools = Mcp.tools<Services>({",
      "  catalog,",
      `  served: { ${ops.map((o) => `"${o.name}": ${opVar(o)}Served`).join(", ")} },`,
      "  refusals: { codes: Errors.codes, declared: Errors.declared },",
      "});",
      "",
      "// The MCP server's own runtime, built once per isolate: the same store, journal, busy count and auth as the API's.",
      "let mcpRuntime: ManagedRuntime.ManagedRuntime<Services, never> | undefined;",
      "const runtimeOf = (env: Env) =>",
      "  (mcpRuntime ??= ManagedRuntime.make(",
      `    Layer.mergeAll(StoreD1.layer({ tables${actors ? ", actors: env.ACTORS" : ""}${storeOption} }), ${journal}, BusyLive, AuthD1.layer(AuthD1.make({ db: env.DB, secret: env.AUTH_SECRET }))).pipe(Layer.provideMerge(Database.d1(env.DB))),`,
      "  ));",
      "",
      "const TRACEPARENT = /^00-([0-9a-f]{32})-([0-9a-f]{16})-[0-9a-f]{2}$/;",
      "",
      "/** `/mcp`: a person's access token (OAuth, by Better Auth's provider) or a 401 that says where to get one; then the tool call. */",
      "const mcp = (env: Env, request: Request, context: Context.Context<never> | undefined): Promise<Response> =>",
      "  Effect.runPromise(AuthD1.oauth.bearer(routesOf(env), request)).then((who) => {",
      "    if (who.kind !== \"person\") {",
      "      const invalid = who.kind === \"invalid\";",
      "      return Response.json({ error: invalid ? \"invalid_token\" : \"unauthorized\" }, { status: 401, headers: { \"www-authenticate\": AuthD1.oauth.challenge(request, invalid ? \"invalid_token\" : undefined) } });",
      "    }",
      "    // The caller's span, when it sent one, is the parent of every span of the call.",
      "    const sent = request.headers.get(\"traceparent\")?.match(TRACEPARENT);",
      "    const parent = sent ? Tracer.externalSpan({ traceId: sent[1]!, spanId: sent[2]!, sampled: true }) : undefined;",
      "    const run = (effect: Effect.Effect<McpResult, never, Services>) => {",
      "      const traced = parent ? Effect.withParentSpan(effect, parent) : effect;",
      "      return runtimeOf(env).runPromise(context ? Effect.provideContext(traced, context) : traced);",
      "    };",
      `    return Mcp.handle({ name: "${name}", version: env.ORTHO_REVISION ?? "0.0.0", tools, principal: who.principal, run }, request);`,
      "  });",
      "",
      "export default {",
      "  fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {",
      "    // Closed before anything reads it: outside worlds there is no door to cast, to read facts, or to register a world.",
      "    if (new URL(request.url).pathname.startsWith(\"/_world/\") && !hostsWorlds(env)) return Promise.resolve(Response.json({ error: \"not found\" }, { status: 404 }));",
      "    if (new URL(request.url).pathname.startsWith(\"/_world/\")) {",
      `      return toWorld({ worlds: env.WORLD, db: env.DB, ${world}, leases: env.ORTHO_WORLDS === "1" }, request);`,
      "    }",
      "    if (new URL(request.url).pathname === \"/_ortho/bundle\") {",
      "      return env.ORTHO_REVISION && env.ORTHO_BUNDLE_SHA256",
      "        ? Promise.resolve(Response.json({ revision: env.ORTHO_REVISION, sha256: env.ORTHO_BUNDLE_SHA256 }))",
      "        : Promise.resolve(Response.json({ _tag: \"NotAnEnvironment\" }, { status: 404 }));",
      "    }",
      "    if (portal.owns(new URL(request.url).pathname)) return portal.serve(request, env);",
      "    if (new URL(request.url).pathname.startsWith(\"/api/auth/\")) return Effect.runPromise(AuthD1.handle(routesOf(env), request));",
      "    if (new URL(request.url).pathname.startsWith(\"/.well-known/\")) {",
      "      return Effect.runPromise(AuthD1.oauth.discovery(routesOf(env), request)).then((found) => found ?? Response.json({ error: \"not found\" }, { status: 404 }));",
      "    }",
      "    if (new URL(request.url).pathname === \"/mcp\") {",
      `      return Telemetry.serve({ url: env.OTLP_URL || undefined, sinks: env.OTLP_SINKS, environment: env.ORTHO_ENVIRONMENT, service: "${name}", handler: (req, context) => mcp(env, req, context), waitUntil: (p) => ctx.waitUntil(p) }, request);`,
      "    }",
      "    const app = (built ??= build(env));",
      "    Telemetry.configure({ sinks: env.OTLP_SINKS, environment: env.ORTHO_ENVIRONMENT });",
      `    return Telemetry.serve({ url: env.OTLP_URL || undefined, service: "${name}", handler: app.handler, waitUntil: (p) => ctx.waitUntil(p) }, request);`,
      "  },",
      "};",
    ),
  };
};

export const renderServer = (model: Model, name: string): ReadonlyArray<RenderedFile> => [
  main(model, name),
  renderWrangler(name, Object.values(model.things).some((t) => t.lives === "actor"), databaseStores(model)),
  renderMigration(model),
  ...renderStoreMigrations(model),
];
