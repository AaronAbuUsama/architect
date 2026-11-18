// The drift part, which is also the rule no-edited-output: generated/ must be exactly what the blueprint renders.
import { existsSync, readFileSync } from "node:fs";
import { basename, join, relative } from "node:path";
import type { Model } from "@orthograph/compiler";
import { Render } from "@orthograph/generators/render";
import type { Finding } from "../types.ts";
import { allFiles } from "./files.ts";

export const drift = (root: string, model: Model): ReadonlyArray<Finding> => {
  const wanted = Render.files({ name: basename(root), model }).filter((f) => !f.scaffold);
  const edited = wanted.flatMap((f): ReadonlyArray<Finding> => {
    const at = join(root, f.path);
    if (!existsSync(at)) return [{ part: "drift", rule: "no-edited-output", file: f.path, message: "is missing: run ortho generate" }];
    return readFileSync(at, "utf8") === f.content ? [] : [{ part: "drift", rule: "no-edited-output", file: f.path, message: "differs from what the blueprint generates: never edit generated/, run ortho generate" }];
  });
  // Dot-folders under generated/ are tools' own state (wrangler's `.wrangler/`), never output.
  const known = new Set(wanted.map((f) => f.path));
  const orphans = allFiles(join(root, "generated")).map((f) => relative(root, f)).filter((p) => !known.has(p) && !p.split("/").some((part) => part.startsWith(".")))
    .map((p): Finding => ({ part: "drift", rule: "no-edited-output", file: p, message: "is in generated/ but the blueprint doesn't generate it" }));
  return [...edited, ...orphans];
};
