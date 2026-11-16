// src/<thing>/<verb>.ts: written once per operation, then the project's own. Never overwritten.
import type { OperationModel } from "@architect/compiler";
import type { RenderedFile } from "../types.ts";
import { camel, lines, scaffolded, toRoot } from "./names.ts";

export const renderHandlerScaffold = (op: OperationModel): RenderedFile => {
  const path = `src/${op.thing}/${op.verb}.ts`;
  const said = [
    `Payload: ${Object.keys(op.payload).join(", ") || "none"}.`,
    `Answer: ${Object.keys(op.answer).join(", ") || "nothing"}.`,
    Object.keys(op.steps).length > 0 ? `Steps, each its own span: ${Object.keys(op.steps).map((k) => `steps.${k}(...)`).join(", ")}.` : "",
    op.errors.length > 0 ? `May refuse with ${op.errors.join(", ")}.` : "",
  ].filter(Boolean);
  return {
    path,
    scaffold: true,
    content: lines(
      scaffolded(op.file),
      `import { Effect } from "effect";`,
      `import { Handlers } from "@architect/target-effect";`,
      `import type { Handler } from "${toRoot(path)}generated/api/src/${op.thing}/${op.verb}.handler.ts";`,
      "",
      `/** ${op.description} */`,
      `const ${camel(op.verb)}: Handler = (_payload, _context) =>`,
      "  Effect.gen(function* () {",
      said.map((s) => `    // ${s}`),
      `    return yield* Handlers.blank("this handler is not written yet");`,
      "  });",
      "",
      `export default ${camel(op.verb)};`,
    ),
  };
};
