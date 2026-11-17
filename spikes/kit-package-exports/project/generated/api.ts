// Generated from the proposed fixture contract, manually for this spike. Do not edit.
// REPRESENTATIVE GENERATED-STYLE CODE: not produced by Architect's compiler.
import { HttpApi, HttpApiEndpoint, HttpApiGroup } from "effect/http-api";
import { repeat as declaration } from "@architect/spike-fixture-kit/blueprint";

export const endpoint = HttpApiEndpoint.post("repeat", "/kit/fixture/echo/repeat", {
  payload: declaration.payloadSchema,
  success: declaration.answerSchema,
});
export class Echo extends HttpApiGroup.make("kit-fixture-echo").add(endpoint) {}
export class Api extends HttpApi.make("fixture").add(Echo) {}
export { declaration };
