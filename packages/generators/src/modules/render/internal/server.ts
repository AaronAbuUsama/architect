// generated/server: the Worker. Every operation's route wired to its handler in implementation/, by path.
import type { Model } from "@architect/compiler";
import type { RenderedFile } from "../types.ts";
import { GENERATED, lines, opVar, pascal } from "./names.ts";

export const renderServer = (model: Model): ReadonlyArray<RenderedFile> => {
  const ops = Object.values(model.operations);
  const things = [...new Set(ops.map((o) => o.thing))];
  const groups = things.map((t) => {
    const handles = ops
      .filter((o) => o.thing === t)
      .map((o) => `      .handle("${o.verb}", ({ payload, request }) => call(${opVar(o)}Served, payload, request.headers["authorization"]).pipe(Effect.provideContext(services)))`);
    return [
      `const ${pascal(t)}Live = HttpApiBuilder.group(Api, "${t}", Effect.fn(function* (handlers) {`,
      "    // The services are taken once, when the routes are built, so no request has to supply them.",
      "    const services = yield* Effect.context<Services>();",
      "    return handlers",
      ...handles.map((h, i) => (i === handles.length - 1 ? `${h};` : h)),
      "  }));",
    ];
  });
  return [{
    path: "generated/server/main.ts",
    scaffold: false,
    content: lines(
      GENERATED,
      "// The Worker: each operation's route runs its handler through the runtime's wrapper.",
      `import { Effect, Layer } from "effect";`,
      `import { HttpRouter, HttpServer } from "effect/http";`,
      `import { HttpApiBuilder } from "effect/http-api";`,
      `import type { SqlClient } from "effect/sql";`,
      `import type { Principal } from "@architect/blueprint";`,
      `import { Database } from "@architect/host-cloudflare";`,
      `import { Busy, BusyLive, Handlers, Principals, PrincipalsAnonymous, Wire, type Served } from "@architect/target-effect";`,
      `import { Api, Errors } from "../api/src/index.ts";`,
      ops.map((o) => `import * as ${opVar(o)} from "../api/src/${o.thing}/${o.verb}.ts";`),
      ops.map((o) => `import ${opVar(o)}Handler from "../../implementation/handlers/${o.thing}/${o.verb}.ts";`),
      "",
      ops.map((o) => `const ${opVar(o)}Served = Handlers.serve({ name: "${o.name}", operation: ${opVar(o)}.declaration, handler: ${opVar(o)}Handler });`),
      "",
      "const refusals = Wire.refusals(Errors.wire);",
      "type Services = SqlClient.SqlClient | Busy | Principals;",
      "",
      "/** Who is calling, then the operation, its refusals sent as their wire classes. */",
      "const call = <O, P>(served: Served<O, SqlClient.SqlClient>, payload: P, authorization: string | undefined) =>",
      "  Effect.flatMap(Principals, (principals) => principals.of(authorization)).pipe(",
      "    Effect.flatMap((principal: Principal) => served.run(payload as never, principal)),",
      "    refusals,",
      "  ) as Effect.Effect<never, never, Services>;",
      "",
      groups.flat(),
      "",
      "export interface Env {",
      "  readonly DB: D1Database;",
      "}",
      "",
      "const build = (env: Env) =>",
      "  HttpRouter.toWebHandler(",
      `    HttpApiBuilder.layer(Api).pipe(`,
      `      Layer.provide([${things.map((t) => `${pascal(t)}Live`).join(", ")}]),`,
      "      Layer.provide([Database.d1(env.DB), BusyLive, PrincipalsAnonymous]),",
      "      Layer.provide(HttpServer.layerServices),",
      "    ),",
      "  );",
      "",
      "// Built once per isolate, from the first request's bindings.",
      "let built: ReturnType<typeof build> | undefined;",
      "",
      "export default {",
      "  fetch(request: Request, env: Env): Promise<Response> {",
      "    built ??= build(env);",
      "    return built.handler(request);",
      "  },",
      "};",
    ),
  }];
};
