// no-name-as-string: a declared name is never written as a string outside generated/ (names come from paths).
import type { Node, Rule } from "../types.ts";
import { SCHEMA, factsOf, pathOf } from "./facts.ts";

export const noNameAsString: Rule = {
  meta: { schema: SCHEMA, docs: { description: "A declared name comes from its path or export, never a string." } },
  create: (context) => {
    const facts = factsOf(context);
    const names = new Set(facts.names);
    const path = pathOf(context, facts);
    if (path === undefined || path.startsWith("generated/")) return {};
    const check = (node: Node, value: unknown) => {
      if (typeof value === "string" && names.has(value)) context.report({ node, message: `"${value}" is a declared name written as a string: import the declaration instead` });
    };
    return {
      Literal: (node) => check(node, node["value"]),
      TemplateLiteral: (node) => {
        const quasis = node["quasis"] as ReadonlyArray<{ value: { cooked: string } }>;
        if (quasis.length === 1) check(node, quasis[0]!.value.cooked);
      },
    };
  },
};
