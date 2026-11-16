// Planted fixture: the server runs the handler for any caller, with no role gate. Same as generated/server/main.ts
// except `call`, which skips the "allowed" check that the real gate makes before the handler (marked PLANTED).
import { Effect, Layer } from "effect";
import { HttpRouter, HttpServer } from "effect/http";
import { HttpApiBuilder } from "effect/http-api";
import type { SqlClient } from "effect/sql";
import { Database } from "@architect/host-cloudflare";
import { Busy, BusyLive, Handlers, Principals, PrincipalsAnonymous, Wire, type Served } from "@architect/target-effect";
import { Api, Errors } from "../api/src/index.ts";
import * as allowanceGrant from "../api/src/allowance/grant.ts";
import allowanceGrantHandler from "../../implementation/handlers/allowance/grant.ts";

const allowanceGrantServed = Handlers.serve({ name: "allowance.grant", operation: allowanceGrant.declaration, handler: allowanceGrantHandler });
const refusals = Wire.refusals(Errors.wire);
type Services = SqlClient.SqlClient | Busy | Principals;

// PLANTED: no role check between the principal and the handler. bob reaches the handler and gets an answer.
const call = (served: Served<any, SqlClient.SqlClient>, payload: unknown, authorization: string | undefined) =>
  Effect.flatMap(Principals, (principals) => principals.of(authorization)).pipe(
    Effect.flatMap((principal) => served.run(payload as never, principal)),
    refusals,
  ) as Effect.Effect<never, never, Services>;

const AllowanceLive = HttpApiBuilder.group(Api, "allowance", Effect.fn(function* (handlers) {
  const services = yield* Effect.context<Services>();
  return handlers.handle("grant", ({ payload, request }) => call(allowanceGrantServed, payload, request.headers["authorization"]).pipe(Effect.provideContext(services)));
}));

export interface Env { readonly DB: D1Database }

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    const built = HttpRouter.toWebHandler(
      HttpApiBuilder.layer(Api).pipe(
        Layer.provide([AllowanceLive]),
        Layer.provide([Database.d1(env.DB), BusyLive, PrincipalsAnonymous]),
        Layer.provide(HttpServer.layerServices),
      ),
    );
    return built.handler(request);
  },
};
