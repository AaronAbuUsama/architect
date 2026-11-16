// Planted fixture (evals/who-may-call). Replaces generated/server/main.ts entirely when installed. It is the generated main.ts with only the gate removed (marked PLANTED below).
// The Worker: each operation's route runs its handler through the runtime's wrapper; /_world/* goes to the world.
import { Context, Effect, Layer } from "effect";
import { HttpRouter, HttpServer } from "effect/http";
import { HttpApiBuilder } from "effect/http-api";
import { SqlClient } from "effect/sql";
import { Blueprint, type Principal } from "@architect/blueprint";
import { Database, JournalD1, StoreD1, Telemetry, Tokens, toWorld } from "@architect/host-cloudflare";
import { Busy, BusyLive, Handlers, Journal, Principals, Reads, Store, Wire, thingIn } from "@architect/target-effect";
import { Api, Errors } from "../api/src/index.ts";
import * as allowanceGet from "../api/src/allowance/get.ts";
import * as allowanceGrant from "../api/src/allowance/grant.ts";
import * as allowanceRevoke from "../api/src/allowance/revoke.ts";
import * as allowanceSpend from "../api/src/allowance/spend.ts";
import * as organizationCreate from "../api/src/organization/create.ts";
import allowanceGrantHandler from "../../implementation/handlers/allowance/grant.ts";
import allowanceRevokeHandler from "../../implementation/handlers/allowance/revoke.ts";
import allowanceSpendHandler from "../../implementation/handlers/allowance/spend.ts";
import organizationCreateHandler from "../../implementation/handlers/organization/create.ts";
import * as allowanceThing from "../../blueprint/things/allowance/thing.ts";
import * as organizationThing from "../../blueprint/things/organization/thing.ts";
import * as personThing from "../../blueprint/things/person/thing.ts";

export { World } from "@architect/host-cloudflare";

const allowanceGetServed = Reads.serve({ name: "allowance.get", read: allowanceGet.declaration });
// PLANTED: the server's gate is removed. grant is served with a declaration that lets anyone call, so bob reaches the handler.
const allowanceGrantServed = Handlers.serve({ name: "allowance.grant", operation: { ...allowanceGrant.declaration, allowed: [Blueprint.anyone] }, handler: allowanceGrantHandler });
const allowanceRevokeServed = Handlers.serve({ name: "allowance.revoke", operation: allowanceRevoke.declaration, handler: allowanceRevokeHandler, notFrom: "AllowanceNotActive" });
const allowanceSpendServed = Handlers.serve({ name: "allowance.spend", operation: allowanceSpend.declaration, handler: allowanceSpendHandler, notFrom: "AllowanceNotActive" });
const organizationCreateServed = Handlers.serve({ name: "organization.create", operation: organizationCreate.declaration, handler: organizationCreateHandler });

/** Each thing and its table: a D1 table, or the name its actors go by. */
const tables = [[thingIn(allowanceThing), "allowance"], [thingIn(organizationThing), "organization"], [thingIn(personThing), "person"]] as const;

const refusals = Wire.refusals(Errors.wire);
type Services = SqlClient.SqlClient | Store | Busy | Principals | Journal;

/** Who is calling, then the operation or read, its refusals sent as their wire classes. */
type Run = (payload: never, principal: Principal, request?: string) => Effect.Effect<unknown, unknown, unknown>;
const call = <P>(served: { readonly run: Run }, payload: P, headers: Readonly<Record<string, string | undefined>>) =>
  Effect.flatMap(Principals, (principals) => principals.of(headers["authorization"])).pipe(
    // The caller's idempotency key: for an operation declared `idempotent: "request"`, the same key is one call.
    Effect.flatMap((principal: Principal) => served.run(payload as never, principal, headers["idempotency-key"])),
    refusals,
  ) as Effect.Effect<never, never, Services>;

const AllowanceLive = HttpApiBuilder.group(Api, "allowance", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal)(yield* Effect.context<Services>());
  return handlers
      .handle("get", ({ payload, request }) => call(allowanceGetServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("grant", ({ payload, request }) => call(allowanceGrantServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("revoke", ({ payload, request }) => call(allowanceRevokeServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("spend", ({ payload, request }) => call(allowanceSpendServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const OrganizationLive = HttpApiBuilder.group(Api, "organization", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal)(yield* Effect.context<Services>());
  return handlers
      .handle("create", ({ payload, request }) => call(organizationCreateServed, payload, request.headers).pipe(Effect.provideContext(services)));
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
      Layer.provide([StoreD1.layer({ tables }), JournalD1.layer, BusyLive, Tokens.principals(env.WORLD_SECRET)]),
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
