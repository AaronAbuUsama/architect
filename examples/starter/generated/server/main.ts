// Generated from the blueprint. Do not edit.
// The Worker: each operation's route runs its handler through the runtime's wrapper; /_world/* goes to the world.
import { Context, Effect, Layer } from "effect";
import { HttpRouter, HttpServer } from "effect/http";
import { HttpApiBuilder } from "effect/http-api";
import { SqlClient } from "effect/sql";
import type { Principal } from "@architect/blueprint";
import { AuthD1, Database, JournalD1, StoreD1, Telemetry, toWorld } from "@architect/host-cloudflare";
import { Auth, Busy, BusyLive, Handlers, Journal, Principals, Reads, Store, Wire, thingIn } from "@architect/target-effect";
import { Api, Errors } from "../api/src/index.ts";
import * as apiKeyCreate from "../api/src/api-key/create.ts";
import * as invitationAccept from "../api/src/invitation/accept.ts";
import * as invitationRevoke from "../api/src/invitation/revoke.ts";
import * as invitationSend from "../api/src/invitation/send.ts";
import * as membershipGet from "../api/src/membership/get.ts";
import * as organizationCreate from "../api/src/organization/create.ts";
import * as organizationGet from "../api/src/organization/get.ts";
import * as personSignUp from "../api/src/person/sign-up.ts";
import * as sessionShow from "../api/src/session/show.ts";
import * as sessionSignIn from "../api/src/session/sign-in.ts";
import * as systemHealth from "../api/src/system/health.ts";
import apiKeyCreateHandler from "../../implementation/handlers/api-key/create.ts";
import invitationAcceptHandler from "../../implementation/handlers/invitation/accept.ts";
import invitationRevokeHandler from "../../implementation/handlers/invitation/revoke.ts";
import invitationSendHandler from "../../implementation/handlers/invitation/send.ts";
import organizationCreateHandler from "../../implementation/handlers/organization/create.ts";
import personSignUpHandler from "../../implementation/handlers/person/sign-up.ts";
import sessionShowHandler from "../../implementation/handlers/session/show.ts";
import sessionSignInHandler from "../../implementation/handlers/session/sign-in.ts";
import systemHealthHandler from "../../implementation/handlers/system/health.ts";
import * as apiKeyThing from "../../blueprint/things/api-key/thing.ts";
import * as invitationThing from "../../blueprint/things/invitation/thing.ts";
import * as membershipThing from "../../blueprint/things/membership/thing.ts";
import * as organizationThing from "../../blueprint/things/organization/thing.ts";
import * as personThing from "../../blueprint/things/person/thing.ts";
import * as sessionThing from "../../blueprint/things/session/thing.ts";
import * as systemThing from "../../blueprint/things/system/thing.ts";

export { World } from "@architect/host-cloudflare";

const apiKeyCreateServed = Handlers.serve({ name: "api-key.create", operation: apiKeyCreate.declaration, handler: apiKeyCreateHandler });
const invitationAcceptServed = Handlers.serve({ name: "invitation.accept", operation: invitationAccept.declaration, handler: invitationAcceptHandler, notFrom: "InvitationNotPending" });
const invitationRevokeServed = Handlers.serve({ name: "invitation.revoke", operation: invitationRevoke.declaration, handler: invitationRevokeHandler, notFrom: "InvitationNotPending" });
const invitationSendServed = Handlers.serve({ name: "invitation.send", operation: invitationSend.declaration, handler: invitationSendHandler });
const membershipGetServed = Reads.serve({ name: "membership.get", read: membershipGet.declaration });
const organizationCreateServed = Handlers.serve({ name: "organization.create", operation: organizationCreate.declaration, handler: organizationCreateHandler });
const organizationGetServed = Reads.serve({ name: "organization.get", read: organizationGet.declaration });
const personSignUpServed = Handlers.serve({ name: "person.sign-up", operation: personSignUp.declaration, handler: personSignUpHandler });
const sessionShowServed = Handlers.serve({ name: "session.show", operation: sessionShow.declaration, handler: sessionShowHandler });
const sessionSignInServed = Handlers.serve({ name: "session.sign-in", operation: sessionSignIn.declaration, handler: sessionSignInHandler });
const systemHealthServed = Handlers.serve({ name: "system.health", operation: systemHealth.declaration, handler: systemHealthHandler });

/** Each thing and its table: a D1 table, or the name its actors go by. */
const tables = [[thingIn(apiKeyThing), "api-key"], [thingIn(invitationThing), "invitation"], [thingIn(membershipThing), "membership"], [thingIn(organizationThing), "organization"], [thingIn(personThing), "person"], [thingIn(sessionThing), "session"], [thingIn(systemThing), "system"]] as const;

const refusals = Wire.refusals(Errors.wire);
type Services = SqlClient.SqlClient | Store | Busy | Principals | Journal | Auth;

/** Who is calling, then the operation or read, its refusals sent as their wire classes. */
type Run = (payload: never, principal: Principal, request?: string) => Effect.Effect<unknown, unknown, unknown>;
const call = <P>(served: { readonly run: Run }, payload: P, headers: Readonly<Record<string, string | undefined>>) =>
  Effect.flatMap(Principals, (principals) => principals.of(headers["authorization"])).pipe(
    // The caller's idempotency key: for an operation declared `idempotent: "request"`, the same key is one call.
    Effect.flatMap((principal: Principal) => served.run(payload as never, principal, headers["idempotency-key"])),
    refusals,
  ) as Effect.Effect<never, never, Services>;

const ApiKeyLive = HttpApiBuilder.group(Api, "api-key", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth)(yield* Effect.context<Services>());
  return handlers
      .handle("create", ({ payload, request }) => call(apiKeyCreateServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const InvitationLive = HttpApiBuilder.group(Api, "invitation", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth)(yield* Effect.context<Services>());
  return handlers
      .handle("accept", ({ payload, request }) => call(invitationAcceptServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("revoke", ({ payload, request }) => call(invitationRevokeServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("send", ({ payload, request }) => call(invitationSendServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const MembershipLive = HttpApiBuilder.group(Api, "membership", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth)(yield* Effect.context<Services>());
  return handlers
      .handle("get", ({ payload, request }) => call(membershipGetServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const OrganizationLive = HttpApiBuilder.group(Api, "organization", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth)(yield* Effect.context<Services>());
  return handlers
      .handle("create", ({ payload, request }) => call(organizationCreateServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("get", ({ payload, request }) => call(organizationGetServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const PersonLive = HttpApiBuilder.group(Api, "person", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth)(yield* Effect.context<Services>());
  return handlers
      .handle("sign-up", ({ payload, request }) => call(personSignUpServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const SessionLive = HttpApiBuilder.group(Api, "session", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth)(yield* Effect.context<Services>());
  return handlers
      .handle("show", ({ payload, request }) => call(sessionShowServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("sign-in", ({ payload, request }) => call(sessionSignInServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const SystemLive = HttpApiBuilder.group(Api, "system", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth)(yield* Effect.context<Services>());
  return handlers
      .handle("health", ({ payload, request }) => call(systemHealthServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));

export interface Env {
  readonly DB: D1Database;
  readonly WORLD: DurableObjectNamespace;
  /** Better Auth's secret, at least 32 characters: fresh per local world, a named secret per environment. */
  readonly AUTH_SECRET: string;
  readonly OTLP_URL?: string;
  /** Which build this environment runs, set by `architect env up`; unset for a world made by `architect dev` or prove. */
  readonly ARCHITECT_REVISION?: string;
  readonly ARCHITECT_BUNDLE_SHA256?: string;
  /** `1` in an environment that hosts worlds with lifetimes (a test environment), set by `architect env up`. */
  readonly ARCHITECT_WORLDS?: string;
}

const build = (env: Env) =>
  HttpRouter.toWebHandler(
    HttpApiBuilder.layer(Api).pipe(
      Layer.provide([ApiKeyLive, InvitationLive, MembershipLive, OrganizationLive, PersonLive, SessionLive, SystemLive]),
      Layer.provide([StoreD1.layer({ tables }), JournalD1.layer, BusyLive, AuthD1.layer(AuthD1.make({ db: env.DB, secret: env.AUTH_SECRET }))]),
      Layer.provideMerge(Database.d1(env.DB)),
      Layer.provide(HttpServer.layerServices),
    ),
  );

// Built once per isolate, from the first request's bindings.
let built: ReturnType<typeof build> | undefined;

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (new URL(request.url).pathname.startsWith("/_world/")) {
      return toWorld({ worlds: env.WORLD, db: env.DB, tables: tables.map(([, table]) => table), leases: env.ARCHITECT_WORLDS === "1" }, request);
    }
    if (new URL(request.url).pathname === "/_architect/bundle") {
      return env.ARCHITECT_REVISION && env.ARCHITECT_BUNDLE_SHA256
        ? Promise.resolve(Response.json({ revision: env.ARCHITECT_REVISION, sha256: env.ARCHITECT_BUNDLE_SHA256 }))
        : Promise.resolve(Response.json({ _tag: "NotAnEnvironment" }, { status: 404 }));
    }
    const app = (built ??= build(env));
    return Telemetry.serve({ url: env.OTLP_URL || undefined, service: "starter", handler: app.handler, waitUntil: (p) => ctx.waitUntil(p) }, request);
  },
};
