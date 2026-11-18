import type { Node, Rule } from "../types.ts";
import { SCHEMA } from "./facts.ts";

// The framework's names before M0 (`decisions/M0-packages.md`), spelled so this file doesn't match itself.
const OLD = "arch" + "itect";
const PATTERN = new RegExp(`@${OLD}/|\\b${OLD.toUpperCase()}_|\\.${OLD}(?![\\w-])`);
const NEW: ReadonlyArray<readonly [RegExp, string]> = [
  [new RegExp(`@${OLD}/`), "@formants/"],
  [new RegExp(`\\b${OLD.toUpperCase()}_`), "FORMAN_"],
  [new RegExp(`\\.${OLD}(?![\\w-])`), ".forman"],
];

const advice = (text: string): string => {
  const found = NEW.find(([old]) => old.test(text));
  return found === undefined ? "" : `: it is ${found[1]} now`;
};

const check = (report: (node: Node, text: string) => void) => (node: Node) => {
  const value = node["value"];
  const text = typeof value === "string" ? value : typeof value === "object" && value !== null ? (value as { readonly raw?: unknown }).raw : undefined;
  if (typeof text === "string" && PATTERN.test(text)) report(node, text);
};

/** No old name: an import from the old package scope, an old variable or the old folder, in any string or name. */
export const noOldNames: Rule = {
  meta: { schema: SCHEMA, docs: { description: "The old package scope, variable prefix and folder are gone (M0); use @formants/, FORMAN_ and .forman" } },
  create: (context) => {
    const report = (node: Node, text: string) => context.report({ node, message: `\`${text}\` uses the framework's old name${advice(text)}` });
    return {
      Literal: check(report),
      TemplateElement: check(report),
      Identifier: (node) => {
        const name = node["name"];
        if (typeof name === "string" && PATTERN.test(name)) report(node, name);
      },
    };
  },
};
