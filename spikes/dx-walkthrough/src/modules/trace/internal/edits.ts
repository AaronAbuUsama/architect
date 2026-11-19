// A working copy of the project the changes are made in, reset from the original before each one.
import { cpSync, existsSync, readdirSync, readFileSync, renameSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Edit } from "#modules/anchors/types.js";

/** What the compiler reads. `src/` and the rest are copied once and never changed. */
const READ = ["blueprint", "journeys", "package.json"] as const;

export const makeCopy = (projectDir: string): string => {
  const copy = `${projectDir}-trace`;
  rmSync(copy, { recursive: true, force: true });
  cpSync(projectDir, copy, { recursive: true, filter: (src) => !src.startsWith(join(projectDir, "node_modules")) && !src.startsWith(join(projectDir, "generated")) });
  symlinkSync(join(projectDir, "node_modules"), join(copy, "node_modules"));
  return copy;
};

export const reset = (projectDir: string, copy: string): void => {
  for (const part of READ) {
    rmSync(join(copy, part), { recursive: true, force: true });
    if (existsSync(join(projectDir, part))) cpSync(join(projectDir, part), join(copy, part), { recursive: true });
  }
};

const tsUnder = (path: string): ReadonlyArray<string> =>
  !existsSync(path) ? [] : statSync(path).isDirectory() ? readdirSync(path).flatMap((n) => tsUnder(join(path, n))) : path.endsWith(".ts") ? [path] : [];

/** Apply one anchor's edits to the copy: splices (from the end of each file back), then expressions, then moves. */
export const apply = (copy: string, edits: ReadonlyArray<Edit>): void => {
  const splices = edits.filter((e) => e.kind === "splice");
  for (const file of new Set(splices.map((e) => e.file))) {
    const path = join(copy, file);
    let text = readFileSync(path, "utf8");
    for (const e of splices.filter((s) => s.file === file).sort((x, y) => y.start - x.start)) text = text.slice(0, e.start) + e.text + text.slice(e.end);
    writeFileSync(path, text);
  }
  for (const e of edits) {
    if (e.kind !== "regex") continue;
    const pattern = new RegExp(e.pattern, "g");
    for (const path of e.within.flatMap((w) => tsUnder(join(copy, w)))) {
      const text = readFileSync(path, "utf8");
      const next = text.replace(pattern, e.replace);
      if (next !== text) writeFileSync(path, next);
    }
  }
  for (const e of edits) if (e.kind === "move") renameSync(join(copy, e.from), join(copy, e.to));
};

export const renameOf = (edits: ReadonlyArray<Edit>): string | undefined => edits.find((e) => e.kind === "name")?.name;
