// six-slots: every module is README.md, types.ts, service.ts, internal/ and <name>.test.ts (~/AGENTS.md, the six-slot
// shape; main.ts is the package's). A module is judged once, from one file of it, so a gap is reported once.
import { existsSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import type { Rule } from "../types.ts";
import { SCHEMA } from "./facts.ts";
import { collector, sourcePath } from "./baselined.ts";

const MODULE = /^(packages\/[^/]+\/src\/modules\/([^/]+))\/(.+)$/;
const CODE = /\.tsx?$/;

/** Every .ts and .tsx file under `dir`, as paths from it, in code-point order. */
const codeFiles = (dir: string, prefix = ""): ReadonlyArray<string> =>
  readdirSync(dir).sort().flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? codeFiles(path, `${prefix}${name}/`) : CODE.test(name) ? [`${prefix}${name}`] : [];
  });

/** The file a module is judged from: its first direct-child code file, or else its first code file at any depth. */
const anchorOf = (dir: string): string | undefined => {
  const files = codeFiles(dir);
  return files.find((f) => !f.includes("/")) ?? files[0];
};

export const sixSlots: Rule = {
  meta: { schema: SCHEMA, docs: { description: "A module holds README.md, types.ts, service.ts, internal/ and <name>.test.ts." } },
  create: (context) => {
    const path = sourcePath(context);
    const m = path === undefined ? null : MODULE.exec(path);
    if (path === undefined || m === null) return {};
    const [, folder = "", name = "", inside = ""] = m;
    const dir = resolve(context.cwd, folder);
    if (anchorOf(dir) !== inside) return {};
    const slots: ReadonlyArray<readonly [string, boolean]> = [
      ["README.md", false], ["types.ts", false], ["service.ts", false], ["internal/", true], [`${name}.test.ts`, false],
    ];
    const missing = slots.filter(([slot, isDir]) => {
      const at = join(dir, slot);
      return !existsSync(at) || statSync(at).isDirectory() !== isDir;
    });
    const { add, flush } = collector(context, "six-slots", path);
    return {
      Program: (node) => {
        for (const [slot] of missing) add(node, `module ${name} has no ${slot}: every module has README.md, types.ts, service.ts, internal/ and ${name}.test.ts`);
      },
      "Program:exit": flush,
    };
  },
};
