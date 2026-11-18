// src/<thing>/<verb>.ts: written once per operation, then the project's own. Never overwritten.
import { Names } from "orthograph/server";
import type { OperationModel } from "@orthograph/compiler";
import type { RenderedFile } from "../types.ts";
import { callSteps, handlerTypeAt } from "./calls.ts";
import { camel, lines, scaffolded, toRoot } from "./names.ts";

const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

/** What a handler is told about its operation, as comments. */
const said = (op: OperationModel, errors = true) => [
  `Payload: ${Object.keys(op.payload).join(", ") || "none"}.`,
  `Answer: ${Object.keys(op.answer).join(", ") || "nothing"}.`,
  Object.keys(op.steps).length > 0 ? `Steps, each its own span: ${Object.keys(op.steps).map((k) => `steps.${k}(...)`).join(", ")}.` : "",
  errors && op.errors.length > 0 ? `May refuse with ${op.errors.join(", ")}.` : "",
].filter(Boolean);

/**
 * An operation that calls an adapter: the call is wired by its payload's field names, and what is left to write is the one
 * thing only the app knows, which declared error each way the call can fail becomes. A call that is the whole operation
 * returns what the callable answered, so the answer is the callable's own.
 */
const calling = (op: OperationModel, path: string): RenderedFile => {
  const steps = callSteps(op);
  const args = `[${Object.keys(op.payload).map((k) => (IDENTIFIER.test(k) ? `payload.${k}` : `payload[${JSON.stringify(k)}]`)).join(", ")}]`;
  const blank = `Handlers.blank("map how this call fails to the error it declares", "failure")`;
  const whole = steps.length === 1 && Object.keys(op.steps).length === 1;
  // The errors are not named here: the one blank is where the app imports the one it maps to.
  const comments = [...said(op, false), "What the call fails with is mapped to one of the errors the operation declares; anything else is a defect."];
  return {
    path,
    scaffold: true,
    content: lines(
      scaffolded(op.file),
      whole ? [] : `import { Effect } from "effect";`,
      `import { Handlers } from "${Names.pkg("language-effect")}";`,
      `import type { Handler } from "${toRoot(path)}${handlerTypeAt(op)}";`,
      "",
      `/** ${op.description} */`,
      whole
        ? [`const ${camel(op.verb)}: Handler = (payload, { steps }) =>`, ...comments.map((s) => `  // ${s}`), `  steps.${steps[0]!.key}(${args}, ${blank});`]
        : [
          `const ${camel(op.verb)}: Handler = (payload, { steps }) =>`,
          "  Effect.gen(function* () {",
          ...comments.map((s) => `    // ${s}`),
          ...steps.map((s) => `    const ${s.key} = yield* steps.${s.key}(${args}, ${blank});`),
          `    return yield* Handlers.blank("this handler is not written yet");`,
          "  });",
        ],
      "",
      `export default ${camel(op.verb)};`,
    ),
  };
};

export const renderHandlerScaffold = (op: OperationModel): RenderedFile => {
  const path = `src/${op.thing}/${op.verb}.ts`;
  if (callSteps(op).length > 0) return calling(op, path);
  return {
    path,
    scaffold: true,
    content: lines(
      scaffolded(op.file),
      `import { Effect } from "effect";`,
      `import { Handlers } from "${Names.pkg("language-effect")}";`,
      `import type { Handler } from "${toRoot(path)}generated/api/src/${op.thing}/${op.verb}.handler.ts";`,
      "",
      `/** ${op.description} */`,
      `const ${camel(op.verb)}: Handler = (_payload, _context) =>`,
      "  Effect.gen(function* () {",
      said(op).map((s) => `    // ${s}`),
      `    return yield* Handlers.blank("this handler is not written yet");`,
      "  });",
      "",
      `export default ${camel(op.verb)};`,
    ),
  };
};
