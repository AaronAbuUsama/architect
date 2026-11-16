// Generated from the blueprint. Do not edit.
// The Worker: each operation's route runs its handler through the runtime's wrapper.
import { Effect, Layer } from "effect";
import { HttpRouter, HttpServer } from "effect/http";
import { HttpApiBuilder } from "effect/http-api";
import type { SqlClient } from "effect/sql";
import type { Principal } from "@architect/blueprint";
import { Database } from "@architect/host-cloudflare";
import { Busy, BusyLive, Handlers, Principals, PrincipalsAnonymous, Wire, type Served } from "@architect/target-effect";
import { Api, Errors } from "../api/src/index.ts";
import * as allowanceGrant from "../api/src/allowance/grant.ts";
import * as organizationCreate from "../api/src/organization/create.ts";
import allowanceGrantHandler from "../../implementation/handlers/allowance/grant.ts";
import organizationCreateHandler from "../../implementation/handlers/organization/create.ts";

const allowanceGrantServed = Handlers.serve({ name: "allowance.grant", operation: allowanceGrant.declaration, handler: allowanceGrantHandler });
const organizationCreateServed = Handlers.serve({ name: "organization.create", operation: organizationCreate.declaration, handler: organizationCreateHandler });

const refusals = Wire.refusals(Errors.wire);
type Services = SqlClient.SqlClient | Busy | Principals;

/** Who is calling, then the operation, its refusals sent as their wire classes. */
const call = <O, P>(served: Served<O, SqlClient.SqlClient>, payload: P, authorization: string | undefined) =>
  Effect.flatMap(Principals, (principals) => principals.of(authorization)).pipe(
    Effect.flatMap((principal: Principal) => served.run(payload as never, principal)),
    refusals,
  ) as Effect.Effect<never, never, Services>;

const AllowanceLive = HttpApiBuilder.group(Api, "allowance", Effect.fn(function* (handlers) {
    // The services are taken once, when the routes are built, so no request has to supply them.
    const services = yield* Effect.context<Services>();
    return handlers
      .handle("grant", ({ payload, request }) => call(allowanceGrantServed, payload, request.headers["authorization"]).pipe(Effect.provideContext(services)));
  }));
const OrganizationLive = HttpApiBuilder.group(Api, "organization", Effect.fn(function* (handlers) {
    // The services are taken once, when the routes are built, so no request has to supply them.
    const services = yield* Effect.context<Services>();
    return handlers
      .handle("create", ({ payload, request }) => call(organizationCreateServed, payload, request.headers["authorization"]).pipe(Effect.provideContext(services)));
  }));

export interface Env {
  readonly DB: D1Database;
}

const build = (env: Env) =>
  HttpRouter.toWebHandler(
    HttpApiBuilder.layer(Api).pipe(
      Layer.provide([AllowanceLive, OrganizationLive]),
      Layer.provide([Database.d1(env.DB), BusyLive, PrincipalsAnonymous]),
      Layer.provide(HttpServer.layerServices),
    ),
  );

// Built once per isolate, from the first request's bindings.
let built: ReturnType<typeof build> | undefined;

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    built ??= build(env);
    return built.handler(request);
  },
};
