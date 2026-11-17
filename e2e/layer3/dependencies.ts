// D4's two-file dependency contract. All writes are to the test's isolated copy, never production source.
import { appendFileSync, cpSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect } from "vitest";
import { fixtures, installFixture } from "./packages.ts";
import { run, succeeds } from "./support.ts";

export const errorRef = "blueprint/things/allowance/errors.ts#PriceUnavailable";
export const prepareDependency = (root: string, kind = "remote") => {
  const fixture = installFixture(root, kind);
  const path = join(root, "blueprint/things/allowance/errors.ts");
  appendFileSync(path, '\n// Independently authored dependency refusal declaration.\nexport class PriceUnavailable extends Blueprint.error({}, {exit:76}) {}\nexport class UnselectedRefusal extends Blueprint.error({}, {exit:77}) {}\n');
  return fixture;
};
export const dependencyArgs = (kind = "remote", mode?: "effect") => ["add", "dependency", `@fixture/${kind}`, "--export", "quote", "--as", "pricing",
  "--step", "network", "--error", errorRef, ...(mode ? ["--mode", mode] : [])];
export const addDependency = (root: string, kind = "remote", mode?: "effect", ...extra: ReadonlyArray<string>) =>
  succeeds(root, ...dependencyArgs(kind, mode), ...extra);
export const fillMapper = (root: string, variant: "normal" | "defect" | "unselected" = "normal") => {
  const file = join(root, "src/dependencies/pricing.ts");
  const text = readFileSync(file, "utf8");
  expect(text.match(/Blueprint\.todo\(/g)).toHaveLength(1);
  const mapper = variant === "defect" ? '(_failure: unknown) => { throw new Error("authored mapper defect"); }'
    : variant === "unselected" ? '(_failure: unknown) => new UnselectedRefusal({})' : '(_failure: unknown) => new PriceUnavailable({})';
  const changed = text.replace(/Blueprint\.todo\([^\n]*\)/, mapper);
  expect(changed).not.toContain("Blueprint.todo");
  writeFileSync(file, changed + (variant === "unselected" ? '\nimport {UnselectedRefusal} from "../../blueprint/things/allowance/errors.ts";\n' : ""));
};
export const dependencyConsumer = (root: string) => {
  mkdirSync(join(root, "blueprint/things/probe/verbs"), { recursive: true });
  cpSync(join(fixtures, "project/probe/thing.ts"), join(root, "blueprint/things/probe/thing.ts"));
  cpSync(join(fixtures, "project/probe/quote.ts"), join(root, "blueprint/things/probe/verbs/quote.ts"));
  mkdirSync(join(root, "src/probe"), { recursive: true });
  cpSync(join(fixtures, "project/probe/handler.ts"), join(root, "src/probe/quote.ts"));
};
export const failed = (root: string, args: ReadonlyArray<string>, diagnostic: RegExp) => {
  const result = run(root, ...args);
  expect(result.status, result.out).not.toBe(0);
  expect(result.out).toMatch(diagnostic);
  return result;
};
