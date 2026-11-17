// Generated from the proposed fixture contract, manually for this spike. Do not edit.
// REPRESENTATIVE GENERATED-STYLE CODE: no compiler integration or production handler wrapper.
import { Effect, Layer } from "effect";
import { HttpRouter, HttpServer } from "effect/http";
import { HttpApiBuilder } from "effect/http-api";
import { Schema } from "@architect/blueprint";
import * as runtime from "@architect/spike-fixture-kit/worker";
import selected from "../blueprint/kits/fixture.ts";
import { Api } from "./api.ts";

const choices = Schema.decodeUnknownSync(selected.definition.choices)(selected.choices);
const EchoLive = HttpApiBuilder.group(Api, "kit-fixture-echo", (handlers) =>
  handlers.handle("repeat", ({ payload }) => runtime.repeat(payload)));
const app = HttpRouter.toWebHandler(HttpApiBuilder.layer(Api).pipe(
  Layer.provide(EchoLive),
  // Keep the kit service available to request-time handlers as well as layer construction.
  Layer.provideMerge(runtime.layer(choices)),
  Layer.provide(HttpServer.layerServices),
));

export default { fetch: (request: Request) => app.handler(request) };
