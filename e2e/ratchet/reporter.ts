// A vitest reporter for the ratchet: writes what the JSON reporter leaves out, the hooks (beforeAll, afterAll, ...) that threw
// and the errors that belong to no file. Where it writes: the RATCHET_ERRORS_FILE environment variable (check.ts reads it).
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

interface Suite {
  readonly fullName?: string;
  readonly name: string;
  readonly parent: { readonly type: string; readonly name: string };
  errors(): ReadonlyArray<unknown>;
}
interface Module {
  readonly moduleId: string;
  readonly children: { allSuites(): Iterable<Suite> };
  errors(): ReadonlyArray<unknown>;
}

const titles = (suite: Suite): ReadonlyArray<string> => {
  const path: string[] = [suite.name];
  let parent = suite.parent;
  while (parent.type === "suite") {
    path.unshift(parent.name);
    parent = (parent as unknown as Suite).parent;
  }
  return path;
};

const firstLine = (error: unknown): string => String((error as { message?: unknown })?.message ?? error).split("\n")[0] ?? "";

export default class RatchetReporter {
  onTestRunEnd(modules: ReadonlyArray<Module>, unhandled: ReadonlyArray<unknown>): void {
    const file = process.env["RATCHET_ERRORS_FILE"];
    if (file === undefined) return;
    const suiteErrors: Array<{ name: string; path: ReadonlyArray<string> }> = [];
    for (const module of modules) {
      if (module.errors().length > 0) suiteErrors.push({ name: module.moduleId, path: [] });
      for (const suite of module.children.allSuites()) if (suite.errors().length > 0) suiteErrors.push({ name: module.moduleId, path: titles(suite) });
    }
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify({ suiteErrors, unhandled: unhandled.map(firstLine) }));
  }
}
