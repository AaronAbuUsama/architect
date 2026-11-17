import type { Choices } from "./choices.js";
import type * as Declarations from "./blueprint.js";
import { layer, repeat } from "./runtime/worker-body.js";

// D4 factory wiring only. The configured layer and repeat implementation are adopted unchanged from the spike.
export const make = (choices: Choices, _declarations: typeof Declarations) => ({ handlers: { echo: { repeat } }, layer: layer(choices) });
