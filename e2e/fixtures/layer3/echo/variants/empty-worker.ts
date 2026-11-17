// Planted empty kit handler. The real runtime/prover must report BlankReached once kit wiring exists.
import { Handlers } from "@architect/target-effect";
import type { Choices } from "./choices.js";
import { layer } from "./runtime/worker-body.js";

export const make = (choices: Choices) => ({
  handlers: { echo: { repeat: () => Handlers.blank("the authored fixture repeat is empty") } }, layer: layer(choices),
});
