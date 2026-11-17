// D4's two-file dependency contract. All writes are to the test's isolated copy, never production source.
import { appendFileSync, cpSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
const ts = createRequire(import.meta.url)("typescript") as typeof import("typescript");
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
export const fillMapper = (root: string, variant: "normal" | "defect" | "unselected" | "typed-effect" = "normal") => {
  const file = join(root, "src/dependencies/pricing.ts");
  const text = readFileSync(file, "utf8");
  expect(text.match(/Blueprint\.todo\(/g)).toHaveLength(1);
  const mapper = variant === "defect" ? '(_failure: unknown) => { throw new Error("authored mapper defect"); }'
    : variant === "unselected" ? '(_failure: unknown) => new UnselectedRefusal({})'
    : variant === "typed-effect" ? '(failure) => {\nconst typed: ForeignRejected = failure;\n// @ts-expect-error not a selected foreign failure field\nvoid failure.notInForeignFailure;\nvoid typed;\nreturn new PriceUnavailable({});\n}'
    : '(_failure: unknown) => new PriceUnavailable({})';
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const calls: Array<import("typescript").CallExpression> = [];
  const visit = (node: import("typescript").Node): void => {
    if (ts.isCallExpression(node) && node.expression.getText(source) === "Blueprint.todo") calls.push(node);
    ts.forEachChild(node, visit);
  };
  visit(source);
  expect(calls).toHaveLength(1);
  const blank = calls[0]!;
  const changed = text.slice(0, blank.getStart(source)) + mapper + text.slice(blank.end);
  expect(changed).not.toContain("Blueprint.todo");
  writeFileSync(file, changed + (variant === "unselected" ? '\nimport {UnselectedRefusal} from "../../blueprint/things/allowance/errors.ts";\n'
    : variant === "typed-effect" ? '\nimport type {ForeignRejected} from "@fixture/effect-remote";\n' : ""));
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
