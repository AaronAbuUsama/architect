// src/<thing>/<verb>.ts: written once per operation, then the project's own. Never overwritten.
import { Names } from "orthograph/server";
import type { OperationModel } from "@orthograph/compiler";
import type { RenderedFile } from "../types.ts";
import { camel, lines, scaffolded, toRoot } from "./names.ts";

const runner = (key: string) => /^[A-Za-z_$][\w$]*$/.test(key) ? `steps.${key}` : `steps[${JSON.stringify(key)}]`;

export const renderHandlerScaffold = (op: OperationModel, path = `src/${op.thing}/${op.verb}.ts`): RenderedFile => {
  const api = `${toRoot(path)}generated/api/src`;
  const steps = Object.entries(op.steps);
  const context = [...(steps.length > 0 ? ["steps"] : []), ...(op.move ? ["move"] : [])];
  const move = op.move
    ? `    yield* move(${op.move.to.length > 1 ? 'yield* Handlers.blank("the move’s outcome")' : ""});`
    : [];
  return {
    path,
    scaffold: true,
    content: lines(
      scaffolded(op.file),
      `import { Effect } from "effect";`,
      `import { Handlers } from "${Names.pkg("language-effect")}";`,
      op.errors.length > 0 ? `import { Errors } from "${api}/index.ts";` : [],
      `import type { Handler } from "${api}/${op.thing}/${op.verb}.handler.ts";`,
      "",
      op.errors.length > 0 ? [`const { ${op.errors.join(", ")} } = Errors.declared;`, ""] : [],
      `/** ${op.description} */`,
      `const ${camel(op.verb)}: Handler = (_payload, ${context.length === 0 ? "_context" : `{ ${context.join(", ")} }`}) =>`,
      "  Effect.gen(function* () {",
      steps.map(([key, step]) => `    yield* ${runner(key)}(Handlers.blank(${JSON.stringify(`${key}: the work this step does`)}));${step.optional ? " // optional: may be skipped" : ""}`),
      op.errors.flatMap((error) => [
        `    if (yield* Handlers.blank<boolean>("refuse ${error} when?")) {`,
        `      yield* Effect.logInfo(yield* Handlers.blank("why ${error} was refused"));`,
        `      return yield* new ${error}(yield* Handlers.blank("${error}'s fields"));`,
        "    }",
      ]),
      move,
      `    return yield* Handlers.blank("the answer");`,
      "  });",
      "",
      `export default ${camel(op.verb)};`,
    ),
  };
};
