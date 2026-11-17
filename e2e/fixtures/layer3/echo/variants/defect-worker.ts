// Planted defect, not an alternative successful implementation.
import { Effect } from "effect";
import type { Choices } from "./choices.js";
import { layer } from "./runtime/worker-body.js";

export const make = (choices: Choices) => ({
  handlers: { echo: { repeat: () => Effect.die(new Error("authored kit repeat defect")) } }, layer: layer(choices),
});
