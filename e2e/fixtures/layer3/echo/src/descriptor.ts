import { Choices } from "./choices.js";
import * as declarations from "./blueprint.js";

export const Fixture = Object.freeze({
  choices: Choices,
  defaults: { prefix: "fixture: ", meta: null },
  declarations,
  sources: { descriptor: "@fixture/echo", declarations: "@fixture/echo/blueprint", worker: "@fixture/echo/worker", node: "@fixture/echo/node" },
});
