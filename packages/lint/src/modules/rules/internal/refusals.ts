// refusal-has-log and declared-errors-only: in a handler, every refusal is a declared error, said why before it.
import type { Node, Rule } from "../types.ts";
import { SCHEMA, constructed, factsOf, pathOf } from "./facts.ts";

const FUNCTION = new Set(["FunctionDeclaration", "FunctionExpression", "ArrowFunctionExpression"]);

/** Whether some statement before `node`'s own, in a block around it (up to its function), logs with Effect.log*. */
const loggedBefore = (node: Node, text: (n: Node) => string): boolean => {
  let child: Node = node;
  for (let at = node.parent; at && !FUNCTION.has(at.type); child = at, at = at.parent) {
    if (at.type !== "BlockStatement" && at.type !== "Program") continue;
    const body = at["body"] as ReadonlyArray<Node>;
    const before = body.slice(0, body.indexOf(child));
    if (before.some((s) => /\bEffect\.log(Info|Warning|Error|Debug|Trace|Fatal)?\b/.test(text(s)))) return true;
  }
  return false;
};

export const refusalHasLog: Rule = {
  meta: { schema: SCHEMA, docs: { description: "A handler logs why before it refuses, so the refusal explains itself." } },
  create: (context) => {
    const facts = factsOf(context);
    const path = pathOf(context, facts);
    if (path === undefined || !path.startsWith("src/")) return {};
    const errors = new Set(facts.errors);
    return {
      NewExpression: (node) => {
        const name = constructed(node);
        if (name && errors.has(name) && !loggedBefore(node, (n) => context.sourceCode.getText(n))) {
          context.report({ node, message: `${name} is refused with no Effect.log* before it saying why` });
        }
      },
    };
  },
};

export const declaredErrorsOnly: Rule = {
  meta: { schema: SCHEMA, docs: { description: "A handler constructs only the errors its operation declares (D2 #50)." } },
  create: (context) => {
    const facts = factsOf(context);
    const path = pathOf(context, facts);
    const declared = path === undefined ? undefined : facts.handlers[path];
    if (declared === undefined) return {};
    const errors = new Set(facts.errors);
    return {
      NewExpression: (node) => {
        const name = constructed(node);
        if (name && errors.has(name) && !declared.includes(name)) {
          context.report({ node, message: `${name} is not one of this operation's errors: ${declared.join(", ") || "it declares none"}` });
        }
      },
    };
  },
};
