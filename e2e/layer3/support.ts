// Stage-four authored checks reuse earlier process/project helpers read-only; no earlier check or fixture is modified.
import { cpSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect } from "vitest";
import { acme, architect, copyOf, nothingRunning, repo } from "../layer1/support.ts";
import { initGit, commit } from "../layer2/support.ts";
import { installFixture, fixtures } from "./packages.ts";

export { acme, architect, nothingRunning, repo, fixtures, commit };
export const PORTS = { kit: 19160, mcp: 19161, empty: 19162, defect: 19163, dependency: 19164, hold: 19175 } as const;
export type Copy = ReturnType<typeof project>;
export const project = (variant?: string) => {
  const copy = copyOf(acme);
  const fixture = installFixture(copy.root, "echo", variant);
  initGit(copy.root);
  return { ...copy, fixture };
};
export const run = (root: string, ...args: ReadonlyArray<string>) => {
  const result = architect(root, ...args);
  return { ...result, out: `${result.stdout}${result.stderr}` };
};
export const succeeds = (root: string, ...args: ReadonlyArray<string>) => {
  const result = run(root, ...args);
  expect(result.status, result.out).toBe(0);
  return result;
};
export const addKit = (root: string, ...args: ReadonlyArray<string>) => succeeds(root, "add", "kit", "@fixture/echo", "--as", "fixture", ...args);
export const selectKit = (root: string, prefix = "fixture: ", meta: unknown = null) => {
  const file = join(root, "blueprint/kits/fixture.ts");
  writeFileSync(file, `import { Blueprint } from "@architect/blueprint";\nimport { Fixture } from "@fixture/echo";\nexport default Blueprint.kit(Fixture, ${JSON.stringify({ prefix, meta })});\n`);
};
export const echoJourney = (root: string) => cpSync(join(fixtures, "journeys/echo.ts"), join(root, "journeys/fixture-echo.ts"));
export const model = (root: string) => JSON.parse(succeeds(root, "model", "--json").stdout) as {
  things: Record<string, { name: string; identifier: string; hash: string; code: string }>;
  operations: Record<string, { name: string; thing: string; verb: string; file: string; hash: string }>;
  [key: string]: unknown;
};
export const textAt = (root: string, path: string) => readFileSync(join(root, path), "utf8");
export const tree = (root: string, dir: string): ReadonlyArray<string> => readdirSync(join(root, dir), { withFileTypes: true }).flatMap((entry) => {
  const path = `${dir}/${entry.name}`;
  return entry.isDirectory() ? tree(root, path) : [path];
}).sort();
