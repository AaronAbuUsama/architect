// max-lines: a source file holds at most about 250 lines of code (AGENTS.md); blank lines and comments don't count.
import type { Context, Rule } from "../types.ts";
import { SCHEMA } from "./facts.ts";
import { collector, optionsOf, sourcePath } from "./baselined.ts";

/** Lines holding code: the text with every comment blanked (newlines kept), then the lines that aren't blank. */
export const codeLines = (context: Context): number => {
  const chars = context.sourceCode.text.split(""); // UTF-16 units, as comment ranges count
  for (const c of context.sourceCode.getAllComments()) {
    const [from, to] = c.range ?? [c.start ?? 0, c.end ?? 0];
    for (let i = from; i < to; i++) if (chars[i] !== "\n") chars[i] = " ";
  }
  return chars.join("").split("\n").filter((line) => line.trim() !== "").length;
};

export const maxLines: Rule = {
  meta: { schema: SCHEMA, docs: { description: "A source file holds at most 250 lines of code (blank lines and comments aside): split it by what it is about." } },
  create: (context) => {
    const path = sourcePath(context);
    if (path === undefined) return {};
    const max = optionsOf(context).max ?? 250;
    const { add, flush } = collector(context, "max-lines", path);
    return {
      Program: (node) => {
        const lines = codeLines(context);
        if (lines > max) add(node, `${lines} lines of code, over ${max}: split the file by what each part is about`);
      },
      "Program:exit": flush,
    };
  },
};
