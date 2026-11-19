// Drift (K16 f): the blueprint grew past a handler that is already the project's. Each is a warning beside
// `required-step-used`: the handler may be mid-edit, and prove fails the call that actually goes wrong.
import type { Node, Rule } from "../types.ts";
import { SCHEMA, factsOf, pathOf } from "./facts.ts";

const nameOf = (node: Node | undefined) => (node?.type === "Identifier" ? node["name"] : undefined);

/** The string literals an argument can be, or undefined when any branch of it is not a literal (then it isn't judged). */
const literals = (node: Node | undefined): ReadonlyArray<string> | undefined => {
  if (!node) return undefined;
  if (node.type === "Literal") return typeof node["value"] === "string" ? [node["value"]] : undefined;
  if (node.type === "TemplateLiteral" && (node["expressions"] as ReadonlyArray<Node>).length === 0) {
    const quasi = (node["quasis"] as ReadonlyArray<Node>)[0];
    return [String((quasi?.["value"] as { cooked?: string } | undefined)?.cooked ?? "")];
  }
  if (node.type === "ConditionalExpression") {
    const a = literals(node["consequent"] as Node);
    const b = literals(node["alternate"] as Node);
    return a && b ? [...a, ...b] : undefined;
  }
  if (node.type === "LogicalExpression") {
    const a = literals(node["left"] as Node);
    const b = literals(node["right"] as Node);
    return a && b ? [...a, ...b] : undefined;
  }
  return undefined;
};

export const outcomeChosen: Rule = {
  meta: { schema: SCHEMA, docs: { description: "Warns when the handler never names an outcome of its move in move(\"…\")." } },
  create: (context) => {
    const facts = factsOf(context);
    const path = pathOf(context, facts);
    const missing = new Set(path === undefined ? [] : facts.outcomes?.[path]);
    if (missing.size === 0) return {};
    const moves = new Set<unknown>(["move"]);
    let judged = true;
    return {
      Property: (node) => {
        if (node.parent?.type === "ObjectPattern" && nameOf(node["key"] as Node) === "move") {
          const binding = nameOf(node["value"] as Node);
          if (typeof binding === "string") moves.add(binding);
        }
      },
      CallExpression: (node) => {
        if (!moves.has(nameOf(node["callee"] as Node))) return;
        const arg = (node["arguments"] as ReadonlyArray<Node>)[0];
        const named = arg ? literals(arg) : [];
        if (named === undefined) judged = false;
        else for (const outcome of named) missing.delete(outcome);
      },
      "Program:exit": (node) => {
        if (!judged) return;
        for (const outcome of missing) context.report({ node, message: `the move never ends in ${outcome}: no move("${outcome}") names it` });
      },
    };
  },
};

export const declaredErrorNamed: Rule = {
  meta: { schema: SCHEMA, docs: { description: "Warns when the handler never names an error its operation declares." } },
  create: (context) => {
    const facts = factsOf(context);
    const path = pathOf(context, facts);
    const missing = new Set(path === undefined ? [] : facts.handlers[path]);
    if (missing.size === 0) return {};
    return {
      Identifier: (node) => { missing.delete(node["name"] as string); },
      "Program:exit": (node) => {
        for (const error of missing) context.report({ node, message: `declared error ${error} is never refused` });
      },
    };
  },
};
