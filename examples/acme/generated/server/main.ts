// Generated from the blueprint. Do not edit.
// The Worker: each operation's route runs its handler through the runtime's wrapper; /_world/* goes to the world.
import { Context, Effect, Layer } from "effect";
import { HttpRouter, HttpServer } from "effect/http";
import { HttpApiBuilder } from "effect/http-api";
import { SqlClient } from "effect/sql";
import type { Principal } from "@architect/blueprint";
import { Database, JournalD1, RecordsD1, Telemetry, Tokens, toWorld } from "@architect/host-cloudflare";
import { Busy, BusyLive, Handlers, Journal, Principals, Records, Wire, thingIn, type Served } from "@architect/target-effect";
import { Api, Errors } from "../api/src/index.ts";
import * as allowanceGrant from "../api/src/allowance/grant.ts";
import * as organizationCreate from "../api/src/organization/create.ts";
import allowanceGrantHandler from "../../implementation/handlers/allowance/grant.ts";
import organizationCreateHandler from "../../implementation/handlers/organization/create.ts";
import * as allowanceThing from "../../blueprint/things/allowance/thing.ts";
import * as organizationThing from "../../blueprint/things/organization/thing.ts";
import * as personThing from "../../blueprint/things/person/thing.ts";

export { World } from "@architect/host-cloudflare";

const allowanceGrantServed = Handlers.serve({ name: "allowance.grant", operation: allowanceGrant.declaration, handler: allowanceGrantHandler });
const organizationCreateServed = Handlers.serve({ name: "organization.create", operation: organizationCreate.declaration, handler: organizationCreateHandler });

/** Each thing that lives in the database, and its table. */
const tables = [[thingIn(allowanceThing), "allowance"], [thingIn(organizationThing), "organization"], [thingIn(personThing), "person"]] as const;

const refusals = Wire.refusals(Errors.wire);
type Services = SqlClient.SqlClient | Records | Busy | Principals | Journal;

/** Who is calling, then the operation, its refusals sent as their wire classes. */
const call = <O, P>(served: Served<O, Records | SqlClient.SqlClient>, payload: P, authorization: string | undefined) =>
  Effect.flatMap(Principals, (principals) => principals.of(authorization)).pipe(
    Effect.flatMap((principal: Principal) => served.run(payload as never, principal)),
    refusals,
  ) as Effect.Effect<never, never, Services>;

const AllowanceLive = HttpApiBuilder.group(Api, "allowance", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Records, Busy, Principals, Journal)(yield* Effect.context<Services>());
  return handlers
      .handle("grant", ({ payload, request }) => call(allowanceGrantServed, payload, request.headers["authorization"]).pipe(Effect.provideContext(services)));
}));
const OrganizationLive = HttpApiBuilder.group(Api, "organization", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Records, Busy, Principals, Journal)(yield* Effect.context<Services>());
  return handlers
      .handle("create", ({ payload, request }) => call(organizationCreateServed, payload, request.headers["authorization"]).pipe(Effect.provideContext(services)));
}));

export interface Env {
  readonly DB: D1Database;
  readonly WORLD: DurableObjectNamespace;
  readonly WORLD_SECRET: string;
  readonly OTLP_URL?: string;
}

const build = (env: Env) =>
  HttpRouter.toWebHandler(
    HttpApiBuilder.layer(Api).pipe(
      Layer.provide([AllowanceLive, OrganizationLive]),
      Layer.provide([RecordsD1.layer(tables), JournalD1.layer, BusyLive, Tokens.principals(env.WORLD_SECRET)]),
      Layer.provideMerge(Database.d1(env.DB)),
      Layer.provide(HttpServer.layerServices),
    ),
  );

// Built once per isolate, from the first request's bindings.
let built: ReturnType<typeof build> | undefined;

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (new URL(request.url).pathname.startsWith("/_world/")) {
      return toWorld({ worlds: env.WORLD, db: env.DB, tables: tables.map(([, table]) => table) }, request);
    }
    const app = (built ??= build(env));
    return Telemetry.serve({ url: env.OTLP_URL || undefined, service: "acme", handler: app.handler, waitUntil: (p) => ctx.waitUntil(p) }, request);
  },
};
