// Representative proposed descriptor, not a new production Blueprint API.
import * as declarations from "./blueprint.js";

export const Fixture = Object.freeze({
  choices: declarations.Choices,
  defaults: { prefix: "fixture: " },
  declarations,
  sources: {
    declarations: "@architect/spike-fixture-kit/blueprint",
    worker: "@architect/spike-fixture-kit/worker",
    node: "@architect/spike-fixture-kit/node",
  },
});
