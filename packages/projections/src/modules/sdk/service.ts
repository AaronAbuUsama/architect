import { Blueprint, Ships } from "orthograph";
import { modelOf, within } from "#modules/names/service.js";
import { renderSdk } from "./internal/sdk.ts";

/**
 * The typed client (`generated/sdk/`): one function per operation, refusals as their own classes in the error channel, the
 * caller on the layer, and a request key kept across a call's retries (K5 seam 5). What runs on the device is here too.
 */
export const sdk = Blueprint.projection({
  description: "The typed client: one function per operation, the caller on its layer, a request key across retries, and refusals typed in the error channel.",
  host: [],
  ships: [Ships.release],
  render: (input) => within(input, "sdk", renderSdk(modelOf(input), input.name)),
});
