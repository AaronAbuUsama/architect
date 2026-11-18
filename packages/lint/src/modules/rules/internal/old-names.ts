import type { Node, Rule } from "../types.ts";
import { SCHEMA } from "./facts.ts";

// The framework's names before M0 (`decisions/M0-packages.md`) and before K6 (`decisions/K6-orthograph.md`), spelled in
// pieces so this file doesn't match itself. `design/naming.md` maps every old name to its new one.
const ARCH = "arch" + "itect";
const FOR = "for" + "man";
const CAP = "For" + "man";
const UP = FOR.toUpperCase();

// The one form that stays: the file name of a dated record (`decisions/K2-…-frame.md`), never a name in use.
const RECORD = new RegExp(`K2-${FOR}-frame`, "g");

/** Each old form, most specific first, with what it is now. The first that matches gives the advice. */
const OLD: ReadonlyArray<readonly [RegExp, string]> = [
  [new RegExp(`@${ARCH}/`), "@orthograph/"],
  [new RegExp(`\\b${ARCH.toUpperCase()}_`), "ORTHO_"],
  [new RegExp(`\\.${ARCH}(?![\\w-])`), ".ortho"],
  [new RegExp(`@${FOR}ts/${FOR}(?![\\w-])`), "orthograph"],
  [new RegExp(`@${FOR}ts/`), "@orthograph/"],
  [new RegExp(`@${FOR}ts`), "@orthograph"],
  [new RegExp(`(?<![A-Z])${UP}_`), "ORTHO_"],
  [new RegExp(`\\.${FOR}/|\\.${FOR}(?![\\w-])`), ".ortho"],
  [new RegExp(`_${FOR}/`), "_ortho/"],
  [new RegExp(`(?<![a-z])${FOR}\\.config`), "ortho.config"],
  [new RegExp(CAP), "Orthograph"],
  [new RegExp(`(?<![A-Z])${UP}`), "ORTHO"],
  // Lowercase, but not inside a word such as "performance" or "conformance".
  [new RegExp(`(?<![a-z])${FOR}`), "ortho (or orthograph, the front door)"],
];

/** What an old name is now, or undefined when the text holds none. */
export const oldName = (text: string): string | undefined => {
  const plain = text.replace(RECORD, "");
  return OLD.find(([old]) => old.test(plain))?.[1];
};

const check = (report: (node: Node, text: string) => void) => (node: Node) => {
  const value = node["value"];
  const text = typeof value === "string" ? value : typeof value === "object" && value !== null ? (value as { readonly raw?: unknown }).raw : undefined;
  if (typeof text === "string" && oldName(text) !== undefined) report(node, text);
};

/** No old name: the old package scopes, variable prefixes, folders, config file, command or product name, in any string or name. */
export const noOldNames: Rule = {
  meta: { schema: SCHEMA, docs: { description: "The framework's old names are gone (M0, K6); use orthograph, @orthograph/, ortho, ORTHO_, .ortho and ortho.config" } },
  create: (context) => {
    const report = (node: Node, text: string) => context.report({ node, message: `\`${text}\` uses the framework's old name: it is ${oldName(text)} now` });
    return {
      Literal: check(report),
      TemplateElement: check(report),
      Identifier: (node) => {
        const name = node["name"];
        if (typeof name === "string" && oldName(name) !== undefined) report(node, name);
      },
    };
  },
};
